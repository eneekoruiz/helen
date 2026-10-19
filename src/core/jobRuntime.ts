import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { JOB_OUTPUT_SCHEMA, jobResultSchema } from "./jobTypes.js";
import type { JobRuntime, RuntimeOutcome, RuntimeRequest } from "./jobTypes.js";

const OUTPUT_LIMIT = 8 * 1024 * 1024;
const PREFLIGHT_TIMEOUT = 15_000;
const READ_TOOLS = "Read,Glob,Grep,WebSearch,WebFetch";
const CLAUDE_SETTINGS = JSON.stringify({
  forceLoginMethod: "claudeai",
  disableAllHooks: true,
});
const CODEX_RESTRICTED_FEATURES = [
  "hooks",
  "apps",
  "shell_tool",
  "plugins",
  "remote_plugin",
  "plugin_sharing",
  "skill_mcp_dependency_install",
  "browser_use",
  "browser_use_external",
  "browser_use_full_cdp_access",
  "in_app_browser",
  "computer_use",
  "code_mode",
  "code_mode_only",
  "code_mode_host",
  "code_mode_prewarm",
  "js_repl",
  "js_repl_tools_only",
  "multi_agent",
  "multi_agent_v2",
  "image_generation",
  "shell_snapshot",
  "shell_snapshot_v2",
  "shell_zsh_fork",
  "unified_exec",
];

/** Retain OS essentials and native restrictions; custom credential variables and app IPC are excluded. */
export function subscriptionEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (
      /^(PATH|PATHEXT|COMSPEC|SYSTEMROOT|SYSTEMDRIVE|WINDIR|OS|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES(?:\(X86\))?|PROGRAMW6432|COMMONPROGRAMFILES(?:\(X86\))?|COMMONPROGRAMW6432|HOMEDRIVE|HOMEPATH|USER|USERNAME|LOGNAME|USERDOMAIN|COMPUTERNAME|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS|LANG|LANGUAGE|LC_[A-Z_]+|TERM|COLORTERM|SHELL|XDG_CONFIG_HOME|XDG_CACHE_HOME|XDG_DATA_HOME|SSL_CERT_FILE|SSL_CERT_DIR|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|CODEX_HOME|CODEX_PERMISSION_PROFILE|CODEX_SANDBOX_NETWORK_DISABLED|CLAUDE_CONFIG_DIR)$/i.test(
        key,
      )
    )
      env[key] = value;
  }
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  return env;
}

function windowsUtility(name: string, env: NodeJS.ProcessEnv): string {
  const root =
    Object.entries(env).find(([key]) => /^systemroot$/i.test(key))?.[1] ??
    "C:\\Windows";
  return path.win32.join(root, "System32", name);
}

function cancellation(request: RuntimeRequest): {
  cancelled: boolean;
  error?: string;
} {
  try {
    return { cancelled: request.cancelled() };
  } catch (error) {
    return {
      cancelled: true,
      error: `Cannot read job cancellation state: ${String(error)}`,
    };
  }
}

interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
  interrupted?: "stopped" | "timed_out" | "overflow" | "blocked" | "failed";
  error?: string;
}
interface RuntimeDependencies {
  spawn: (file: string, args: string[], options: SpawnOptions) => ChildProcess;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  stop: (child: ChildProcess) => void;
}

function stopOwnedChild(child: ChildProcess): void {
  // An exit notification invalidates the PID even if inherited pipes have not yet closed.
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  if (process.platform === "win32") {
    const stopped = spawnSync(
      windowsUtility("taskkill.exe", process.env),
      ["/PID", String(child.pid), "/T", "/F"],
      {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
        timeout: 5000,
      },
    );
    if (stopped.status !== 0) {
      child.kill("SIGKILL");
      throw new Error("Windows could not stop the owned provider process tree");
    }
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

function blockedMessage(value: string): boolean {
  return /rate[ _-]?limit|usage[ _-]?limit|quota|out of credits|insufficient credits|limit (?:reached|exceeded)|too many requests|overloaded|(?:http|status|code)\s*[:=]?\s*(?:401|403|429)|not logged in|login required|authentication (?:failed|required)|invalid (?:api[ _-]?)?key|token (?:expired|invalid)|sandbox[^\n]*(?:fail|denied|unsupported|not supported|not allowed)|(?:fail|unable|cannot)[^\n]*sandbox|(?:approval|permission)[^\n]*(?:required|denied|not allowed|invalid)|policy[^\n]*(?:violation|reject|denied)|(?:managed|administrator)[^\n]*require/i.test(
    value,
  );
}

function eventError(event: Record<string, unknown>): string | undefined {
  if (
    event.type === "error" ||
    event.type === "turn.failed" ||
    (event.type === "system" &&
      (event.subtype === "api_retry" || event.subtype === "api_error")) ||
    (event.type === "assistant" && Boolean(event.error)) ||
    (event.type === "result" && event.is_error === true)
  ) {
    const value =
      [
        event.error,
        event.errors,
        event.message,
        event.result,
        event.subtype,
      ].find(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0),
      ) ?? "Provider reported an error";
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  return undefined;
}

function parseEvent(line: string): Record<string, unknown> | undefined {
  try {
    const event: unknown = JSON.parse(line);
    if (event !== null && typeof event === "object" && !Array.isArray(event))
      return event as Record<string, unknown>;
  } catch {
    /* Non-event diagnostic lines are retained in the bounded trace. */
  }
  return undefined;
}

function runProcess(
  deps: RuntimeDependencies,
  request: RuntimeRequest,
  file: string,
  args: string[],
  timeoutMs: number,
  input = "",
  logs?: { stdout: number; stderr: number },
  onEvent?: (event: Record<string, unknown>) => string | undefined,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const initialCancellation = cancellation(request);
    if (initialCancellation.cancelled) {
      resolve({
        code: null,
        stdout: "",
        stderr: "",
        interrupted: initialCancellation.error ? "failed" : "stopped",
        ...(initialCancellation.error
          ? { error: initialCancellation.error }
          : {}),
      });
      return;
    }
    if (timeoutMs <= 0) {
      resolve({ code: null, stdout: "", stderr: "", interrupted: "timed_out" });
      return;
    }
    let child: ChildProcess;
    try {
      child = deps.spawn(file, args, {
        cwd: request.cwd,
        env: deps.env,
        windowsHide: true,
        shell: false,
        // A private POSIX group permits stopping descendants without touching other jobs.
        detached: deps.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({ code: null, stdout: "", stderr: "", error: String(error) });
      return;
    }
    let done = false;
    let exited = false;
    let bytes = 0;
    let interrupted: ProcessResult["interrupted"];
    let failure: string | undefined;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const decoder = new StringDecoder("utf8");
    let pending = "";
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (code: number | null, error?: Error): void => {
      if (done) return;
      if (pending.trim() && !interrupted) consumeLine(pending + decoder.end());
      done = true;
      clearTimeout(timer);
      clearInterval(poll);
      clearTimeout(stopTimer);
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        ...(interrupted ? { interrupted } : {}),
        ...(error || failure
          ? { error: (error?.message ?? failure)?.slice(0, 4000) }
          : {}),
      });
    };
    const stop = (
      reason: NonNullable<ProcessResult["interrupted"]>,
      error?: string,
    ): void => {
      if (done || interrupted) return;
      interrupted = reason;
      failure = error;
      if (!exited) {
        try {
          deps.stop(child);
        } catch (error) {
          interrupted = "failed";
          failure = `${failure ?? "Provider stop requested"}; ${String(error)}`;
        }
      }
      // A descendant can keep a pipe open; never use the PID again after the first stop.
      stopTimer = setTimeout(() => {
        child.stdout?.destroy();
        child.stderr?.destroy();
        finish(null);
      }, 5000);
      stopTimer.unref();
    };
    const consumeLine = (line: string): void => {
      const event = parseEvent(line);
      if (!event) return;
      const error = onEvent?.(event) ?? eventError(event);
      if (error) stop(blockedMessage(error) ? "blocked" : "failed", error);
    };
    const accept = (
      chunk: Buffer | string,
      channel: "stdout" | "stderr",
    ): void => {
      if (done || interrupted) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const allowed = buffer.subarray(0, Math.max(0, OUTPUT_LIMIT - bytes));
      bytes += allowed.length;
      if (allowed.length) {
        (channel === "stdout" ? stdout : stderr).push(allowed);
        try {
          if (logs) fs.writeSync(logs[channel], allowed);
        } catch (error) {
          stop("failed", `Cannot persist provider output: ${String(error)}`);
          return;
        }
        if (channel === "stdout") {
          pending += decoder.write(allowed);
          let newline: number;
          while ((newline = pending.indexOf("\n")) !== -1 && !interrupted) {
            const line = pending.slice(0, newline);
            pending = pending.slice(newline + 1);
            consumeLine(line);
          }
        } else if (
          logs &&
          blockedMessage(Buffer.concat(stderr).toString("utf8"))
        ) {
          stop("blocked", Buffer.concat(stderr).toString("utf8").slice(-4000));
        }
      }
      if (allowed.length < buffer.length)
        stop("overflow", "Provider output exceeded the combined 8 MiB limit");
    };
    const timer = setTimeout(
      () => stop("timed_out", "Job runtime limit reached"),
      timeoutMs,
    );
    const poll = setInterval(() => {
      const current = cancellation(request);
      if (current.cancelled)
        stop(
          current.error ? "failed" : "stopped",
          current.error ?? "Job stopped by request",
        );
    }, 250);
    child.stdout?.on("data", (chunk: Buffer) => accept(chunk, "stdout"));
    child.stderr?.on("data", (chunk: Buffer) => accept(chunk, "stderr"));
    child.once("exit", () => {
      exited = true;
    });
    child.once("close", (code: number | null) => finish(code));
    child.once("error", (error: Error) => finish(null, error));
    child.stdin?.on("error", () => {
      /* Early provider exit can close stdin. Its exit/error determines the outcome. */
    });
    child.stdin?.end(input);
  });
}

function interruption(result: ProcessResult): RuntimeOutcome | undefined {
  if (!result.interrupted) return undefined;
  return {
    status: result.interrupted === "overflow" ? "failed" : result.interrupted,
    error: result.error ?? `Provider process ${result.interrupted}`,
  };
}

/** Native subscription-only adapter; dependencies allow tests without contacting either provider. */
export function createJobRuntime(
  overrides: Partial<RuntimeDependencies> = {},
): JobRuntime {
  return async (request) => {
    const deadline = Date.now() + request.maxMinutes * 60_000;
    const deps: RuntimeDependencies = {
      spawn,
      platform: process.platform,
      env: subscriptionEnvironment(),
      stop: stopOwnedChild,
      ...overrides,
    };
    deps.env = subscriptionEnvironment(deps.env);
    let providerVersion: string | undefined;
    let sessionId: string | undefined;
    const decorate = (outcome: RuntimeOutcome): RuntimeOutcome => ({
      ...outcome,
      ...(providerVersion ? { providerVersion } : {}),
      ...(sessionId ? { sessionId } : {}),
    });
    const preflight = (file: string, args: string[]): Promise<ProcessResult> =>
      runProcess(
        deps,
        request,
        file,
        args,
        Math.min(PREFLIGHT_TIMEOUT, deadline - Date.now()),
      );
    try {
      const initialCancellation = cancellation(request);
      if (initialCancellation.cancelled)
        return {
          status: initialCancellation.error ? "failed" : "stopped",
          error:
            initialCancellation.error ?? "Job stopped before provider launch",
        };
      if (request.provider === "claude" && !request.claudeExtraUsageDisabled)
        return {
          status: "blocked",
          error:
            "Claude extra usage must be disabled before using a subscription-only job",
        };
      if (
        !Number.isFinite(request.maxMinutes) ||
        request.maxMinutes <= 0 ||
        !Number.isInteger(request.maxTurns) ||
        request.maxTurns < 1
      )
        return { status: "failed", error: "Invalid job runtime limits" };
      let file: string = request.provider;
      if (request.provider === "codex" && !request.codexCreditsUnavailable)
        return {
          status: "blocked",
          error:
            "Codex usage credits and automatic reload must be unavailable before a subscription-only job; ChatGPT authentication does not guarantee included-only spending.",
        };
      if (deps.platform === "win32") {
        const located = await preflight(windowsUtility("where.exe", deps.env), [
          `$PATH:${request.provider}.exe`,
        ]);
        const interrupted = interruption(located);
        if (interrupted) return decorate(interrupted);
        const candidate = located.stdout.trim().split(/\r?\n/)[0];
        if (
          located.code !== 0 ||
          !candidate ||
          !path.win32.isAbsolute(candidate) ||
          !/\.exe$/i.test(candidate) ||
          path.win32.relative(
            path.win32.resolve(request.cwd),
            path.win32.dirname(candidate),
          ) === ""
        )
          return {
            status: "blocked",
            error: `${request.provider}.exe is unavailable; a native CLI installation is required`,
          };
        file = candidate;
      }
      const auth = await preflight(
        file,
        request.provider === "codex"
          ? [
              "-c",
              'forced_login_method="chatgpt"',
              "-c",
              'model_provider="openai"',
              "login",
              "status",
            ]
          : ["auth", "status"],
      );
      const authInterrupted = interruption(auth);
      if (authInterrupted) return decorate(authInterrupted);
      let authenticated = false;
      if (request.provider === "codex")
        authenticated =
          auth.code === 0 &&
          /^Logged in using ChatGPT\s*$/im.test(
            auth.stdout + "\n" + auth.stderr,
          );
      else {
        try {
          const parsed = JSON.parse(auth.stdout) as Record<string, unknown>;
          authenticated =
            auth.code === 0 &&
            parsed.loggedIn === true &&
            parsed.authMethod === "claude.ai";
        } catch {
          /* Unrecognized authentication output must fail closed. */
        }
      }
      if (!authenticated)
        return {
          status: "blocked",
          error: `Subscription authentication unavailable for ${request.provider}; sign in with ${request.provider === "codex" ? "ChatGPT" : "claude.ai"} (API/cloud authentication is not supported)`,
        };
      const version = await preflight(file, ["--version"]);
      const versionInterrupted = interruption(version);
      if (versionInterrupted) return decorate(versionInterrupted);
      if (version.code !== 0 || !version.stdout.trim())
        return {
          status: "blocked",
          error: "Cannot verify the installed provider CLI version",
        };
      providerVersion = version.stdout.trim().slice(0, 300);
      const help = await preflight(
        file,
        request.provider === "codex"
          ? ["exec", "--help"]
          : ["--max-turns", String(request.maxTurns), "--help"],
      );
      const helpInterrupted = interruption(help);
      if (helpInterrupted) return decorate(helpInterrupted);
      const required =
        request.provider === "codex"
          ? ["--sandbox", "--json", "--output-schema", "--output-last-message"]
          : [
              "--safe-mode",
              "--restricted",
              "--strict-mcp-config",
              "--mcp-config",
              "--settings",
              "--permission-prompts",
              "--permission-mode",
              "--tools",
              "--allowedTools",
              "--json-schema",
              "--output-format",
            ];
      if (
        help.code !== 0 ||
        required.some((flag) => !help.stdout.includes(flag))
      )
        return decorate({
          status: "blocked",
          error:
            "Installed provider CLI lacks the required subscription/read-only/structured-output capabilities",
        });
      fs.mkdirSync(request.directory, { recursive: true });
      const schemaFile = path.join(request.directory, "output-schema.json");
      const outputFile = path.join(request.directory, "result.json");
      if (fs.existsSync(outputFile))
        return decorate({
          status: "failed",
          error:
            "Attempt output already exists; refusing to accept a stale result",
        });
      fs.writeFileSync(schemaFile, JSON.stringify(JOB_OUTPUT_SCHEMA), {
        flag: "wx",
      });
      let stdoutLog: number | undefined;
      let stderrLog: number | undefined;
      let execution: ProcessResult;
      let finalEvent: Record<string, unknown> | undefined;
      let completedTurn = false;
      let turns = 0;
      const codexIsolation: string[] = [];
      if (request.provider === "codex") {
        const features = await preflight(file, ["features", "list"]);
        const featuresInterrupted = interruption(features);
        if (featuresInterrupted) return decorate(featuresInterrupted);
        if (
          features.code !== 0 ||
          !/^hooks\s/m.test(features.stdout) ||
          !/^apps\s/m.test(features.stdout) ||
          !/^shell_tool\s/m.test(features.stdout)
        )
          return decorate({
            status: "blocked",
            error:
              "Cannot disable Codex hooks, connected apps and shell tools with this CLI version",
          });
        const advertisedFeatures = new Set(
          features.stdout
            .split(/\r?\n/)
            .map((line) => line.trim().split(/\s/)[0]),
        );
        for (const feature of CODEX_RESTRICTED_FEATURES) {
          if (advertisedFeatures.has(feature))
            codexIsolation.push("--disable", feature);
        }
        codexIsolation.push(
          "-c",
          "notify=[]",
          "-c",
          "agents.enabled=false",
          "-c",
          "mcp_servers={}",
        );
        const servers = await preflight(file, [
          ...codexIsolation,
          "mcp",
          "list",
          "--json",
        ]);
        const serversInterrupted = interruption(servers);
        if (serversInterrupted) return decorate(serversInterrupted);
        let names: string[];
        try {
          const entries: unknown = JSON.parse(servers.stdout);
          if (
            servers.code !== 0 ||
            !Array.isArray(entries) ||
            entries.some((entry) => !entry || typeof entry.name !== "string")
          )
            throw new Error("Invalid server listing");
          names = entries
            .filter((entry: { enabled?: boolean }) => entry.enabled !== false)
            .map((entry: { name: string }) => entry.name);
        } catch {
          return decorate({
            status: "blocked",
            error: "Cannot verify and disable configured Codex MCP servers",
          });
        }
        for (const name of names) {
          // Codex CLI overrides split paths on dots without parsing quoted keys.
          if (!/^[A-Za-z0-9_-]+$/.test(name))
            return decorate({
              status: "blocked",
              error: "Cannot safely disable a managed Codex MCP server name",
            });
          codexIsolation.push("-c", `mcp_servers.${name}.enabled=false`);
        }
        const isolatedServers = await preflight(file, [
          ...codexIsolation,
          "mcp",
          "list",
          "--json",
        ]);
        const isolationInterrupted = interruption(isolatedServers);
        if (isolationInterrupted) return decorate(isolationInterrupted);
        try {
          const entries: unknown = JSON.parse(isolatedServers.stdout);
          if (
            isolatedServers.code !== 0 ||
            !Array.isArray(entries) ||
            entries.some(
              (entry) =>
                !entry ||
                typeof entry.name !== "string" ||
                entry.enabled !== false,
            )
          )
            throw new Error("MCP isolation not confirmed");
        } catch {
          return decorate({
            status: "blocked",
            error: "Native Codex configuration did not disable all MCP servers",
          });
        }
      }
      try {
        stdoutLog = fs.openSync(
          path.join(request.directory, "stdout.jsonl"),
          "wx",
        );
        stderrLog = fs.openSync(
          path.join(request.directory, "stderr.log"),
          "wx",
        );
        const args =
          request.provider === "codex"
            ? [
                "exec",
                "--sandbox",
                "read-only",
                "-c",
                'forced_login_method="chatgpt"',
                "-c",
                'model_provider="openai"',
                "-c",
                'approval_policy="never"',
                ...codexIsolation,
                "--json",
                "--output-schema",
                schemaFile,
                "-o",
                outputFile,
                "-",
              ]
            : [
                "--safe-mode",
                "--restricted",
                "-p",
                "--settings",
                CLAUDE_SETTINGS,
                "--strict-mcp-config",
                "--mcp-config",
                '{"mcpServers":{}}',
                "--permission-mode",
                "dontAsk",
                "--permission-prompts",
                "none",
                "--tools",
                READ_TOOLS,
                "--allowedTools",
                READ_TOOLS,
                "--max-turns",
                String(request.maxTurns),
                "--output-format",
                "stream-json",
                "--verbose",
                "--json-schema",
                JSON.stringify(JOB_OUTPUT_SCHEMA),
                ...(help.stdout.includes("--read-only") ? ["--read-only"] : []),
              ];
        execution = await runProcess(
          deps,
          request,
          file,
          args,
          deadline - Date.now(),
          request.prompt,
          { stdout: stdoutLog, stderr: stderrLog },
          (event) => {
            const id = event.thread_id ?? event.session_id;
            if (typeof id === "string") sessionId = id.slice(0, 200);
            if (event.type === "turn.started" && ++turns > request.maxTurns)
              return "Provider turn limit reached";
            if (event.type === "turn.completed") completedTurn = true;
            if (event.type === "result") finalEvent = event;
            return eventError(event);
          },
        );
      } finally {
        if (stdoutLog !== undefined) fs.closeSync(stdoutLog);
        if (stderrLog !== undefined) fs.closeSync(stderrLog);
      }
      const executionInterrupted = interruption(execution);
      if (executionInterrupted) return decorate(executionInterrupted);
      if (execution.code !== 0 || execution.error) {
        const error =
          (
            execution.error ??
            execution.stderr.trim() ??
            "Provider execution failed"
          ).slice(0, 4000) || `Provider exited with code ${execution.code}`;
        return decorate({
          status: blockedMessage(error) ? "blocked" : "failed",
          error,
        });
      }
      let raw: unknown;
      if (request.provider === "codex") {
        if (!completedTurn)
          return decorate({
            status: "failed",
            error: "Codex exited without a completed turn",
          });
        const stat = fs.lstatSync(outputFile);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > OUTPUT_LIMIT)
          return decorate({
            status: "failed",
            error: "Codex output is not a bounded regular result file",
          });
        raw = JSON.parse(fs.readFileSync(outputFile, "utf8"));
      } else {
        if (
          !finalEvent ||
          finalEvent.is_error !== false ||
          finalEvent.subtype !== "success"
        )
          return decorate({
            status: "failed",
            error: "Claude exited without a successful final result event",
          });
        raw = finalEvent.structured_output;
      }
      const validated = jobResultSchema.safeParse(raw);
      if (!validated.success)
        return decorate({
          status: "failed",
          error:
            `Provider returned an invalid structured result: ${validated.error.message}`.slice(
              0,
              4000,
            ),
        });
      return decorate({
        status: validated.data.status,
        result: validated.data,
      });
    } catch (error) {
      return decorate({
        status: "failed",
        error:
          `Provider runtime failed: ${error instanceof Error ? error.message : String(error)}`.slice(
            0,
            4000,
          ),
      });
    }
  };
}

export const runJobRuntime: JobRuntime = createJobRuntime();
