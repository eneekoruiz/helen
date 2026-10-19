#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  repoEvalCases,
  repoImplementationHoldoutCases,
} from "./lib/repoEvalCases.mjs";
import {
  requireIncludedBilling,
  subscriptionEnvironment,
} from "./lib/evalSubscription.mjs";
export {
  requireIncludedBilling,
  subscriptionEnvironment,
} from "./lib/evalSubscription.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const writeNew = (file, value) => fs.writeFileSync(file, value, { flag: "wx" });

export function selectRepoEvalSuite(suite = "pilot", requestedCases = null) {
  const specs =
    suite === "pilot"
      ? repoEvalCases
      : suite === "implementation-holdout"
        ? repoImplementationHoldoutCases
        : null;
  if (!specs) throw new Error("Unknown repository evaluation suite: " + suite);
  if (requestedCases?.some((id) => !specs.some((spec) => spec.id === id)))
    throw new Error("Unknown case for repository evaluation suite: " + suite);
  const selected = specs.filter(
    (spec) => !requestedCases || requestedCases.includes(spec.id),
  );
  if (!selected.length)
    throw new Error("Repository evaluation suite has no selected cases");
  return selected;
}

function executable(name) {
  if (process.platform !== "win32") return name;
  const found = spawnSync("where.exe", [`${name}.exe`], {
    encoding: "utf8",
    windowsHide: true,
  });
  const candidate = found.stdout?.trim().split(/\r?\n/)[0];
  if (found.status !== 0 || !candidate || !path.isAbsolute(candidate))
    throw new Error(`${name}.exe is unavailable`);
  return candidate;
}

function run(file, args, cwd, env, input = "", timeoutMs = 180000, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({
        code: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        overflow: false,
        cancelled: true,
        error: "Evaluation interrupted before launch",
        durationMs: 0,
      });
      return;
    }
    const started = Date.now();
    let stdout = "",
      stderr = "",
      timedOut = false,
      overflow = false,
      settled = false,
      cancelled = false;
    const child = spawn(file, args, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stop = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform === "win32" && child.pid)
        spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
          windowsHide: true,
          stdio: "ignore",
          timeout: 5000,
        });
      else child.kill("SIGKILL");
    };
    const cancel = () => {
      cancelled = true;
      stop();
    };
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, timeoutMs);
    const finish = (code, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        overflow,
        cancelled,
        error: error?.message ?? null,
        durationMs: Date.now() - started,
      });
    };
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 8 * 1024 * 1024) {
        overflow = true;
        stop();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 1024 * 1024) {
        overflow = true;
        stop();
      }
    });
    child.on("error", (error) => finish(null, error));
    child.on("close", (code) => finish(code));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

function filesUnder(dir, relative = "") {
  return fs
    .readdirSync(path.join(dir, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const name = path.join(relative, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`Unexpected fixture symlink: ${name}`);
      return entry.isDirectory() ? filesUnder(dir, name) : [name];
    });
}

export function removeOwnedTemp(dir, prefix, dependencies = {}) {
  const resolved = path.resolve(dir);
  if (
    path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
    !["helen-repo-eval-", "helen-hidden-grader-"].includes(prefix) ||
    !path.basename(resolved).startsWith(prefix) ||
    (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink())
  )
    throw new Error("Refusing cleanup outside the owned temporary directory");
  const platform = dependencies.platform ?? process.platform;
  const remove = dependencies.remove ?? fs.rmSync;
  const wait =
    dependencies.wait ??
    ((milliseconds) =>
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        milliseconds,
      ));
  const maxAttempts = platform === "win32" ? 5 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      remove(resolved, { recursive: true, force: true });
      return { status: "removed", path: resolved, attempts: attempt };
    } catch (error) {
      const retryable = ["EPERM", "EBUSY", "ENOTEMPTY", "EACCES"].includes(
        error.code,
      );
      if (attempt === maxAttempts || !retryable)
        return {
          status: "warning",
          path: resolved,
          attempts: attempt,
          error: {
            code: error.code ?? null,
            message: String(error.message ?? error),
          },
        };
      wait(attempt * 100);
    }
  }
}

export function prepareFixture(dir, spec, provider, withSkill) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    json({
      name: "helen-isolated-outcome-eval",
      private: true,
      type: "module",
      scripts: { test: "node test.mjs" },
    }),
  );
  fs.writeFileSync(path.join(dir, spec.file), spec.source);
  fs.writeFileSync(path.join(dir, "test.mjs"), spec.publicTest);
  let skillPath = null;
  if (withSkill) {
    const folder = provider === "codex" ? ".agents" : ".claude";
    skillPath = `${folder}/skills/${spec.skill}/SKILL.md`;
    fs.cpSync(
      path.join(root, "skills", spec.skill),
      path.join(dir, folder, "skills", spec.skill),
      { recursive: true },
    );
  }
  return {
    skillPath,
    original: Object.fromEntries(
      filesUnder(dir).map((file) => [
        file,
        hash(fs.readFileSync(path.join(dir, file))),
      ]),
    ),
  };
}

export function gradeFixture(dir, spec, fixture, dependencies = {}) {
  const original = fixture.original;
  const current = filesUnder(dir);
  const unexpected = current.filter((file) => !(file in original));
  const alteredControls = Object.keys(original).filter(
    (file) =>
      file !== spec.file &&
      (!fs.existsSync(path.join(dir, file)) ||
        hash(fs.readFileSync(path.join(dir, file))) !== original[file]),
  );
  const scopeOk = unexpected.length === 0 && alteredControls.length === 0;
  const graderDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "helen-hidden-grader-"),
  );
  let grade;
  try {
    const graderPath = path.join(graderDir, "grade.mjs");
    const completion = `HELEN_GRADER_COMPLETED:${randomUUID()}`;
    fs.writeFileSync(
      graderPath,
      `${spec.grader}\nconsole.log(${JSON.stringify(completion)});\n`,
    );
    // Node permissions limit filesystem access and subprocesses; they are not a network sandbox.
    // Give imported agent code no account credentials or other inherited application secrets.
    const graderEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP)$/i.test(key),
      ),
    );
    const result = spawnSync(
      process.execPath,
      [
        "--permission",
        `--allow-fs-read=${dir}`,
        `--allow-fs-read=${graderDir}`,
        graderPath,
        dir,
      ],
      {
        cwd: dir,
        env: graderEnv,
        encoding: "utf8",
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
    const outcomePassed = result.error
      ? null
      : result.status === 0 &&
        result.stdout.split(/\r?\n/).includes(completion);
    grade = {
      passed: !scopeOk ? false : outcomePassed,
      scopeOk,
      outcomePassed,
      unexpected,
      alteredControls,
      reason: !scopeOk
        ? "Fixture scope or immutable controls changed"
        : result.error
          ? "Grading infrastructure unavailable"
          : outcomePassed
            ? "Executable outcome checks passed"
            : "Executable outcome checks failed",
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error?.message ?? null,
    };
    return grade;
  } finally {
    let cleanup;
    try {
      cleanup = (dependencies.cleanup ?? removeOwnedTemp)(
        graderDir,
        "helen-hidden-grader-",
      );
    } catch (error) {
      cleanup = {
        status: "warning",
        path: path.resolve(graderDir),
        attempts: null,
        error: {
          code: error.code ?? null,
          message: String(error.message ?? error),
        },
      };
    }
    if (cleanup?.status === "warning" && grade) grade.cleanupWarning = cleanup;
  }
}

function redact(value) {
  return value.replace(
    /(sk-(?:live|proj)-|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{6,}/g,
    "$1[redacted]",
  );
}

export function parseExecution(result, provider, skillPath) {
  const events = result.stdout.split(/\r?\n/).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const failure = events.find(
    (event) =>
      event.type === "error" ||
      event.type === "turn.failed" ||
      event.is_error === true,
  );
  const terminal =
    provider === "codex"
      ? events.findLast((event) => event.type === "turn.completed")
      : events.findLast((event) => event.type === "result");
  const environmentBlocked =
    /blocked by policy|sandbox failed|helper_unknown_error/i.test(
      result.stderr,
    );
  const quotaBlocked =
    terminal?.api_error_status === 429 ||
    /hit your (?:session|usage|weekly) limit|rate limit|quota exceeded/i.test(
      terminal?.result ?? "",
    );
  const skillCalls = new Set();
  let skillLoaded = false;
  const normalize = (value) => value?.replaceAll("\\", "/").toLowerCase();
  for (const event of events) {
    for (const block of event.message?.content ?? []) {
      if (
        block.type === "tool_use" &&
        block.name === "Read" &&
        skillPath &&
        normalize(block.input?.file_path) === normalize(skillPath)
      )
        skillCalls.add(block.id);
      if (
        block.type === "tool_result" &&
        block.is_error !== true &&
        skillCalls.has(block.tool_use_id)
      )
        skillLoaded = true;
    }
    const item = event.item;
    const relativeSkillPath =
      skillPath &&
      normalize(skillPath).match(/\.(?:agents|claude)\/skills\/.+$/)?.[0];
    if (
      provider === "codex" &&
      skillPath &&
      item?.type === "command_execution" &&
      item.status === "completed" &&
      item.exit_code === 0 &&
      /Get-Content|cat\b|readFileSync|open\(/i.test(item.command ?? "") &&
      (normalize(item.command)?.includes(normalize(skillPath)) ||
        (relativeSkillPath &&
          normalize(item.command)?.includes(relativeSkillPath)))
    )
      skillLoaded = true;
  }
  return {
    ok:
      result.code === 0 &&
      !result.timedOut &&
      !result.overflow &&
      !result.cancelled &&
      !failure &&
      !environmentBlocked &&
      Boolean(terminal),
    environmentBlocked,
    quotaBlocked,
    skillLoaded: skillPath ? skillLoaded : null,
    usage: terminal?.usage ?? null,
    resolvedModel:
      events.find((event) => event.type === "system" && event.model)?.model ??
      null,
  };
}

export async function runRepoEvaluations(argv, dependencies = {}) {
  const execute = dependencies.run ?? run;
  const getExecutable = dependencies.executable ?? executable;
  const cleanupTemp = dependencies.cleanup ?? removeOwnedTemp;
  const log = dependencies.log ?? console.log;
  const value = (key, fallback) => {
    const index = argv.indexOf(key);
    return index === -1 ? fallback : argv[index + 1];
  };
  const providers = value("--providers", "codex,claude").split(",");
  const runs = Number(value("--runs", "1"));
  const maxCalls = Number(value("--max-calls", "0"));
  const rawMaxMinutes = value("--max-minutes", "3");
  const maxMinutes = Number(rawMaxMinutes);
  if (
    argv.filter((argument) => argument === "--max-minutes").length > 1 ||
    typeof rawMaxMinutes !== "string" ||
    !/^\d+$/.test(rawMaxMinutes) ||
    !Number.isSafeInteger(maxMinutes) ||
    maxMinutes < 1 ||
    maxMinutes > 30
  )
    throw new Error("--max-minutes must be a single integer from 1 to 30");
  const attemptTimeoutMs = maxMinutes * 60_000;
  const suite = value("--suite", "pilot");
  if (!suite || suite.startsWith("--"))
    throw new Error("--suite requires a value");
  const requestedCases = value("--cases", null)?.split(",");
  const cases = selectRepoEvalSuite(suite, requestedCases);
  if (
    providers.some((provider) => !["codex", "claude"].includes(provider)) ||
    new Set(providers).size !== providers.length ||
    !cases.length ||
    !Number.isSafeInteger(runs) ||
    runs < 1 ||
    !Number.isSafeInteger(maxCalls) ||
    maxCalls < 0
  )
    throw new Error("Invalid providers, cases, runs or max-calls");
  const plannedCalls = providers.length * cases.length * runs * 2;
  if (!argv.includes("--live")) {
    const plan = {
      live: false,
      suite,
      providers,
      cases: cases.map((spec) => ({ id: spec.id, skill: spec.skill })),
      runs,
      plannedCalls,
      maxCalls,
      maxMinutesPerAttempt: maxMinutes,
      timeoutMsPerAttempt: attemptTimeoutMs,
      condition: "explicit skill-file instructions versus no HELEN skill",
      nativeQuestions:
        "Not measured by headless CLIs; requires an interactive application observation",
      limitations: [
        "A pilot does not establish general effectiveness or guaranteed improvement.",
      ],
    };
    log(json(plan));
    return plan;
  }
  if (!argv.includes("--subscription-only") || maxCalls < 1)
    throw new Error(
      "Live runs require --subscription-only and --max-calls <N>",
    );
  requireIncludedBilling(argv, providers);
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new Error(
      "Repository evaluation requires Node 22+ for permission-limited grading",
    );
  const output = path.resolve(
    value(
      "--output",
      path.join(
        root,
        ".helen",
        "repo-evals",
        `${new Date().toISOString().slice(0, 10)}-${randomUUID()}`,
      ),
    ),
  );
  if (fs.existsSync(output))
    throw new Error(
      "Output already exists; preserve previous evidence and choose a new path",
    );
  fs.mkdirSync(output, { recursive: true });
  const fingerprint = hash(
    JSON.stringify({ providers, suite, runs, maxCalls, maxMinutes }) +
      JSON.stringify(cases) +
      fs.readFileSync(fileURLToPath(import.meta.url)) +
      fs.readFileSync(path.join(root, "scripts/lib/evalSubscription.mjs")) +
      cases
        .map((spec) =>
          fs.readFileSync(path.join(root, "skills", spec.skill, "SKILL.md")),
        )
        .join(""),
  );
  const record = {
    kind: "repository-outcome-pilot",
    suite,
    output,
    status: "running",
    date: new Date().toISOString(),
    fingerprint,
    billing: "subscription-only; no API fallback",
    accountConditions: {
      codexCreditsUnavailable: argv.includes("--codex-credits-unavailable"),
      claudeExtraUsageDisabled: argv.includes("--claude-extra-usage-disabled"),
      evidence:
        "Explicit caller confirmation; not independently audited billing settings",
    },
    plannedCalls,
    maxCalls,
    maxMinutesPerAttempt: maxMinutes,
    timeoutMsPerAttempt: attemptTimeoutMs,
    calls: 0,
    observations: [],
    blockers: {},
    cleanupWarnings: [],
    limitations: [
      "Explicitly loaded instructions; natural selection is not measured.",
      "Native visual question forms are not measured by this headless harness.",
      "Two related JavaScript tasks do not certify all HELEN skills.",
      "No statistical or savings claim follows from a small pilot.",
    ],
  };
  writeNew(
    path.join(output, "manifest.json"),
    json({
      kind: "repository-outcome-plan",
      suite,
      date: record.date,
      fingerprint,
      providers,
      cases: cases.map(({ id, skill }) => ({ id, skill })),
      runs,
      plannedCalls,
      maxCalls,
      maxMinutesPerAttempt: maxMinutes,
      timeoutMsPerAttempt: attemptTimeoutMs,
      accountConditions: record.accountConditions,
      condition:
        "Both conditions use the same frozen invocation and time budgets; timeout failures remain incomplete observations.",
    }),
  );
  let checkpoint = 0;
  const save = () => {
    writeNew(
      path.join(
        output,
        `checkpoint-${String(++checkpoint).padStart(6, "0")}.json`,
      ),
      json(record),
    );
    const file = path.join(output, "results.json");
    fs.writeFileSync(file + ".tmp", json(record));
    fs.renameSync(file + ".tmp", file);
  };
  const controller = new AbortController();
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    controller.abort();
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  dependencies.signal?.addEventListener("abort", interrupt, { once: true });
  if (dependencies.signal?.aborted) interrupt();
  save();
  try {
    for (const provider of providers) {
      if (record.calls >= maxCalls || interrupted) break;
      const env = subscriptionEnvironment();
      let bin;
      try {
        bin = getExecutable(provider);
        const auth = await execute(
          bin,
          provider === "codex" ? ["login", "status"] : ["auth", "status"],
          root,
          env,
          "",
          90000,
          controller.signal,
        );
        const authenticated =
          provider === "codex"
            ? auth.code === 0 &&
              /Logged in using ChatGPT/i.test(auth.stdout + auth.stderr)
            : auth.code === 0 &&
              JSON.parse(auth.stdout).loggedIn &&
              JSON.parse(auth.stdout).authMethod === "claude.ai";
        if (!authenticated)
          throw new Error(
            `Subscription authentication unavailable (exit ${auth.code}, timedOut ${auth.timedOut}, error ${auth.error ?? "none"})`,
          );
        if (interrupted)
          throw new Error("Evaluation interrupted during preflight");
        const version = await execute(
          bin,
          ["--version"],
          root,
          env,
          "",
          20000,
          controller.signal,
        );
        record[`${provider}Version`] = version.stdout.trim();
        save();
      } catch (error) {
        record.blockers[provider] = error.message;
        save();
        continue;
      }
      let blocked = false;
      for (const spec of cases) {
        for (
          let trial = 1;
          trial <= runs && !blocked && !interrupted && record.calls < maxCalls;
          trial++
        ) {
          // Alternate condition order; do not always give one condition the first run.
          for (const withSkill of trial % 2 ? [false, true] : [true, false]) {
            if (record.calls >= maxCalls || blocked || interrupted) break;
            const temp = fs.mkdtempSync(
              path.join(os.tmpdir(), "helen-repo-eval-"),
            );
            const work = path.join(temp, "work");
            const id = `${provider}-${spec.id}-${trial}-${withSkill ? "skill" : "baseline"}`;
            const traceDir = path.join(output, id);
            fs.mkdirSync(traceDir);
            let execution = null;
            let parsed = null;
            let grade = null;
            try {
              const fixture = prepareFixture(work, spec, provider, withSkill);
              let args;
              if (provider === "codex") {
                const originalHome =
                  process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
                // Reuse authenticated native sandbox setup; disable global HELEN skills only for this process.
                // Copying auth into OS temp prevents Codex from creating its trusted helper binaries.
                env.CODEX_HOME = originalHome;
                const overrides = [];
                const installedSkills = path.join(originalHome, "skills");
                if (fs.existsSync(installedSkills))
                  for (const name of fs.readdirSync(installedSkills)) {
                    if (name.startsWith("helen-"))
                      overrides.push(
                        `{path=${JSON.stringify(path.join(installedSkills, name).replaceAll("\\", "/"))},enabled=false}`,
                      );
                  }
                // Do not claim an uncontaminated baseline if a global HELEN skill remains discoverable.
                const globalSkills = path.join(
                  os.homedir(),
                  ".agents",
                  "skills",
                );
                if (
                  fs.existsSync(globalSkills) &&
                  fs
                    .readdirSync(globalSkills)
                    .some((name) => name.startsWith("helen-"))
                )
                  throw new Error(
                    "Global .agents HELEN skills would contaminate the baseline",
                  );
                const config = path.join(originalHome, "config.toml");
                const configBody = fs.existsSync(config)
                  ? fs.readFileSync(config, "utf8")
                  : "";
                const model = /^model\s*=\s*"([^"\r\n]+)"/m.exec(
                  configBody,
                )?.[1];
                // Isolate user instructions while preserving the user's native sandbox setup.
                const windowsSection =
                  /^\[windows\]\s*\r?\n([^[]*)/m.exec(configBody)?.[1] ?? "";
                const windowsSandbox =
                  /^\s*sandbox\s*=\s*"(elevated|unelevated)"/m.exec(
                    windowsSection,
                  )?.[1];
                record.codexConfiguredModel =
                  model ?? "CLI default; unresolved";
                record.codexWindowsSandboxMode =
                  windowsSandbox ?? "CLI default; unresolved";
                args = [
                  "exec",
                  "--ignore-user-config",
                  "--ephemeral",
                  "--skip-git-repo-check",
                  "--sandbox",
                  "workspace-write",
                  "-c",
                  'forced_login_method="chatgpt"',
                  "-c",
                  'approval_policy="never"',
                  "-c",
                  `skills.config=[${overrides.join(",")}]`,
                  ...(process.platform === "win32" && windowsSandbox
                    ? [
                        "-c",
                        `windows.sandbox=${JSON.stringify(windowsSandbox)}`,
                      ]
                    : []),
                  "--json",
                  ...(model ? ["--model", model] : []),
                  "-",
                ];
              } else {
                args = [
                  "-p",
                  "--setting-sources",
                  "project",
                  "--settings",
                  '{"forceLoginMethod":"claudeai"}',
                  "--strict-mcp-config",
                  "--mcp-config",
                  '{"mcpServers":{}}',
                  "--permission-mode",
                  "dontAsk",
                  "--tools",
                  "Read,Glob,Grep,Write,Edit,Bash",
                  "--allowedTools",
                  "Read",
                  "Glob",
                  "Grep",
                  "Write",
                  "Edit",
                  "Bash(node *)",
                  "--max-turns",
                  "12",
                  "--output-format",
                  "stream-json",
                  "--verbose",
                ];
              }
              const prompt = `${withSkill ? `Read and apply ${fixture.skillPath} before working.\n` : ""}${spec.prompt}\nThe repository is this working directory. Run node test.mjs to verify. Keep all writes inside this fixture. Do not create temporary files; use inline node -e checks for additional verification.`;
              writeNew(
                path.join(traceDir, "attempt-start.json"),
                json({
                  provider,
                  case: spec.id,
                  skill: spec.skill,
                  trial,
                  condition: withSkill ? "explicit-skill" : "baseline",
                  providerVersion: record[`${provider}Version`] ?? null,
                  file: bin,
                  args,
                  cwd: work,
                  maxMinutes,
                  timeoutMs: attemptTimeoutMs,
                  prompt,
                  startedAt: new Date().toISOString(),
                }),
              );
              record.calls++;
              log(
                `${provider}: ${spec.id}, trial ${trial}, ${withSkill ? "with skill" : "baseline"} (${record.calls}/${maxCalls})`,
              );
              save();
              execution = await execute(
                bin,
                args,
                work,
                env,
                prompt,
                attemptTimeoutMs,
                controller.signal,
              );
              parsed = parseExecution(
                execution,
                provider,
                withSkill ? path.join(work, fixture.skillPath) : null,
              );
              writeNew(
                path.join(traceDir, "trace.jsonl"),
                redact(execution.stdout),
              );
              writeNew(
                path.join(traceDir, "stderr.txt"),
                redact(execution.stderr),
              );
              if (
                fs.existsSync(path.join(work, spec.file)) &&
                !fs.lstatSync(path.join(work, spec.file)).isSymbolicLink()
              )
                writeNew(
                  path.join(traceDir, spec.file),
                  fs.readFileSync(path.join(work, spec.file)),
                );
              writeNew(
                path.join(traceDir, "execution.json"),
                json({
                  code: execution.code,
                  timedOut: execution.timedOut,
                  overflow: execution.overflow,
                  cancelled: execution.cancelled ?? false,
                  error: execution.error,
                  durationMs: execution.durationMs,
                  maxMinutes,
                  timeoutMs: attemptTimeoutMs,
                  ...parsed,
                }),
              );
              grade = (dependencies.gradeFixture ?? gradeFixture)(
                work,
                spec,
                fixture,
              );
              if (grade.cleanupWarning)
                record.cleanupWarnings.push({
                  provider,
                  case: spec.id,
                  trial,
                  condition: withSkill ? "explicit-skill" : "baseline",
                  phase: "grader",
                  ...grade.cleanupWarning,
                });
              writeNew(path.join(traceDir, "grade.json"), json(grade));
              const observation = {
                provider,
                case: spec.id,
                skill: spec.skill,
                trial,
                condition: withSkill ? "explicit-skill" : "baseline",
                executionOk: parsed.ok,
                skillLoaded: parsed.skillLoaded,
                passed: parsed.ok
                  ? withSkill && !parsed.skillLoaded
                    ? false
                    : grade.passed
                  : null,
                grade,
                usage: parsed.usage,
                resolvedModel: parsed.resolvedModel,
                durationMs: execution.durationMs,
                trace: id,
                providerVersion: record[`${provider}Version`] ?? null,
                cancelled: execution.cancelled ?? false,
              };
              writeNew(
                path.join(traceDir, "observation.json"),
                json(observation),
              );
              record.observations.push(observation);
              if (!parsed.ok) {
                blocked = true;
                record.blockers[provider] = parsed.environmentBlocked
                  ? "Native execution policy or sandbox blocked the task; effectiveness is unmeasured. No permission bypass."
                  : parsed.quotaBlocked
                    ? "Included subscription quota exhausted; no retry or API fallback."
                    : execution.timedOut
                      ? "Execution timed out; no retry"
                      : "Execution failed or authentication unavailable; inspect local trace. No automatic retry or API fallback.";
              }
              save();
            } catch (error) {
              blocked = true;
              record.blockers[provider] = error.message;
              if (!fs.existsSync(path.join(traceDir, "observation.json"))) {
                const observation = {
                  provider,
                  case: spec.id,
                  skill: spec.skill,
                  trial,
                  condition: withSkill ? "explicit-skill" : "baseline",
                  executionOk: false,
                  skillLoaded: parsed?.skillLoaded ?? null,
                  passed: null,
                  grade,
                  usage: parsed?.usage ?? null,
                  resolvedModel: parsed?.resolvedModel ?? null,
                  durationMs: execution?.durationMs ?? null,
                  providerVersion: record[`${provider}Version`] ?? null,
                  trace: id,
                  error: String(error.message ?? error),
                  cancelled: interrupted,
                };
                writeNew(
                  path.join(traceDir, "observation.json"),
                  json(observation),
                );
                record.observations.push(observation);
              }
              save();
            } finally {
              let cleanup;
              try {
                cleanup = cleanupTemp(temp, "helen-repo-eval-");
              } catch (error) {
                cleanup = {
                  status: "warning",
                  path: path.resolve(temp),
                  attempts: null,
                  error: {
                    code: error.code ?? null,
                    message: String(error.message ?? error),
                  },
                };
              }
              writeNew(path.join(traceDir, "cleanup.json"), json(cleanup));
              if (cleanup?.status === "warning") {
                record.cleanupWarnings.push({
                  provider,
                  case: spec.id,
                  trial,
                  condition: withSkill ? "explicit-skill" : "baseline",
                  phase: "fixture",
                  ...cleanup,
                });
                log(
                  `Cleanup warning: ${cleanup.path}; evidence and grade preserved (${cleanup.error?.code ?? "unknown"}).`,
                );
              }
              save();
            }
          }
        }
        if (blocked || interrupted || record.calls >= maxCalls) break;
      }
    }
  } catch (error) {
    record.fatalError = String(error.message ?? error);
  } finally {
    const paired = [];
    for (const observation of record.observations.filter(
      (item) => item.condition === "baseline",
    )) {
      const counterpart = record.observations.find(
        (item) =>
          item.provider === observation.provider &&
          item.case === observation.case &&
          item.trial === observation.trial &&
          item.condition === "explicit-skill",
      );
      if (
        counterpart &&
        observation.passed !== null &&
        counterpart.passed !== null
      )
        paired.push({
          provider: observation.provider,
          case: observation.case,
          trial: observation.trial,
          baseline: observation.passed,
          withSkill: counterpart.passed,
        });
    }
    record.pairs = paired;
    record.status = interrupted
      ? "interrupted"
      : !record.fatalError &&
          record.calls === plannedCalls &&
          paired.length === plannedCalls / 2 &&
          record.observations.every(
            (item) => item.condition === "baseline" || item.passed === true,
          )
        ? "pilot-completed"
        : "incomplete-or-failed";
    writeNew(path.join(output, "final-results.json"), json(record));
    save();
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    dependencies.signal?.removeEventListener("abort", interrupt);
  }
  log(
    json({
      output,
      status: record.status,
      calls: record.calls,
      pairs: record.pairs,
      blockers: record.blockers,
      cleanupWarnings: record.cleanupWarnings,
    }),
  );
  return record;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  runRepoEvaluations(process.argv.slice(2))
    .then((result) => {
      if (result.live !== false && result.status !== "pilot-completed")
        process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
