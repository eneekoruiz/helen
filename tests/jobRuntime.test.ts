import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createJobRuntime,
  subscriptionEnvironment,
} from "../src/core/jobRuntime.js";
import type { RuntimeRequest } from "../src/core/jobTypes.js";

const CODEX_HELP =
  "--sandbox --json --output-schema --output-last-message --ephemeral";
const CLAUDE_HELP =
  "--safe-mode --restricted --strict-mcp-config --mcp-config --settings --permission-prompts --permission-mode --tools --allowedTools --json-schema --output-format --no-session-persistence";
const RESULT = {
  status: "completed",
  summary: "Inspected the project",
  question: null,
  options: [],
};
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

interface Plan {
  stdout?: string | Buffer;
  stderr?: string;
  code?: number;
  error?: Error;
  hang?: boolean;
  result?: unknown;
  rawResult?: string;
  started?: () => void;
}
interface Invocation {
  file: string;
  args: string[];
  options: SpawnOptions;
  input: string;
  child: ChildProcess;
}
function fixture(provider: "codex" | "claude" = "codex"): RuntimeRequest {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "helen-job-runtime-"),
  );
  temporary.push(directory);
  return {
    provider,
    cwd: directory,
    directory: path.join(directory, "attempt"),
    prompt: "Inspect this repository",
    maxMinutes: 1,
    maxTurns: 8,
    claudeExtraUsageDisabled: true,
    codexCreditsUnavailable: true,
    cancelled: () => false,
  };
}
function harness(plans: Plan[], platform: NodeJS.Platform = "win32") {
  const calls: Invocation[] = [];
  let pid = 60000;
  const stop = vi.fn((child: ChildProcess) => {
    queueMicrotask(() => {
      Object.assign(child, { signalCode: "SIGKILL" });
      child.emit("exit", null, "SIGKILL");
      child.emit("close", null, "SIGKILL");
    });
  });
  const spawn = vi.fn(
    (file: string, args: string[], options: SpawnOptions): ChildProcess => {
      const plan = plans.shift();
      if (!plan)
        throw new Error(
          `Unexpected native invocation: ${file} ${args.join(" ")}`,
        );
      const native = new EventEmitter() as ChildProcess;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      const call: Invocation = {
        file,
        args,
        options,
        input: "",
        child: native,
      };
      const stdin = new Writable({
        write(chunk, _encoding, callback) {
          call.input += chunk.toString();
          callback();
        },
        final(callback) {
          callback();
          queueMicrotask(() => {
            plan.started?.();
            if (plan.error) {
              native.emit("error", plan.error);
              return;
            }
            if (
              args.includes("-o") &&
              (plan.result !== undefined || plan.rawResult !== undefined)
            ) {
              fs.writeFileSync(
                args[args.indexOf("-o") + 1],
                plan.rawResult ?? JSON.stringify(plan.result),
              );
            }
            if (plan.stdout !== undefined) stdout.write(plan.stdout);
            if (plan.stderr) stderr.write(plan.stderr);
            if (!plan.hang) {
              Object.assign(native, { exitCode: plan.code ?? 0 });
              native.emit("exit", plan.code ?? 0);
              native.emit("close", plan.code ?? 0);
            }
          });
        },
      });
      Object.assign(native, {
        pid: ++pid,
        stdout,
        stderr,
        stdin,
        exitCode: null,
        signalCode: null,
      });
      calls.push(call);
      return native;
    },
  );
  const runtime = createJobRuntime({
    spawn,
    stop,
    platform,
    env: {
      PATH: "native-bin",
      CODEX_HOME: "native-auth-home",
      OPENAI_API_KEY: "paid-openai",
      ANTHROPIC_API_KEY: "paid-anthropic",
      AWS_ACCESS_KEY_ID: "cloud",
      CODEX_APP_TOOLS_PIPE_PATH: "parent-ipc",
    },
  });
  return { calls, runtime, stop, spawn };
}
function codexPlans(task: Plan, auth = "Logged in using ChatGPT\n"): Plan[] {
  return [
    { stdout: "C:\\native\\codex.exe\n" },
    { stderr: auth },
    { stdout: "codex-cli 1.2.3\n" },
    { stdout: CODEX_HELP },
    {
      stdout:
        "hooks stable true\napps stable true\nshell_tool stable true\nplugins stable true\ncomputer_use stable true\nmulti_agent stable true\ncode_mode stable true\nshell_snapshot stable true\n",
    },
    {
      stdout: JSON.stringify([{ name: "node_repl", enabled: true }]),
    },
    {
      stdout: JSON.stringify([{ name: "node_repl", enabled: false }]),
    },
    task,
  ];
}
function claudePlans(task: Plan): Plan[] {
  return [
    { stdout: "C:\\native\\claude.exe\n" },
    { stdout: '{"loggedIn":true,"authMethod":"claude.ai"}' },
    { stdout: "Claude Code 2.1.0\n" },
    { stdout: CLAUDE_HELP },
    task,
  ];
}
function claudeResult(
  result: unknown = RESULT,
  extra: Record<string, unknown> = {},
) {
  return (
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      structured_output: result,
      session_id: "claude-session",
      ...extra,
    }) + "\n"
  );
}

describe("Subscription-only native job runtime", () => {
  it("blocks Codex before any process if included-only account conditions are unconfirmed", async () => {
    const request = fixture();
    request.codexCreditsUnavailable = false;
    const test = harness([]);
    expect(await test.runtime(request)).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("credits"),
    });
    expect(test.spawn).not.toHaveBeenCalled();
  });
  it("isolates billing routes and app IPC while retaining native authenticated configuration", () => {
    const original = {
      PATH: "bin",
      CODEX_HOME: "native-sandbox",
      CLAUDE_CONFIG_DIR: "native-auth",
      OPENAI_API_KEY: "paid",
      openai_base_url: "proxy",
      CODEX_API_KEY: "paid",
      ANTHROPIC_API_KEY: "paid",
      CLAUDE_CODE_OAUTH_TOKEN: "inherited-token",
      CLAUDE_CODE_USE_BEDROCK: "1",
      AWS_PROFILE: "cloud",
      GOOGLE_APPLICATION_CREDENTIALS: "cloud",
      AZURE_OPENAI_API_KEY: "paid",
      CODEX_THREAD_ID: "thread",
      MCP_AUTH_TOKEN: "connector",
      NODE_OPTIONS: "--require arbitrary.js",
      CUSTOM_BILLING_API_KEY: "custom-paid-key",
      CODEX_PERMISSION_PROFILE: "native-restricted-profile",
      CODEX_SANDBOX_NETWORK_DISABLED: "1",
    };
    const env = subscriptionEnvironment(original);
    expect(env).toEqual({
      PATH: "bin",
      CODEX_HOME: "native-sandbox",
      CLAUDE_CONFIG_DIR: "native-auth",
      CODEX_PERMISSION_PROFILE: "native-restricted-profile",
      CODEX_SANDBOX_NETWORK_DISABLED: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    });
    expect(original.OPENAI_API_KEY).toBe("paid");
  });

  it("runs native Codex without a shell, sends literals through stdin and preserves permission configuration", async () => {
    const request = fixture();
    request.prompt =
      'Inspect literal $(touch danger); `echo unsafe` " and\nsecond line';
    const test = harness(
      codexPlans({
        stdout:
          '{"type":"thread.started","thread_id":"own-thread"}\n{"type":"turn.completed"}\n',
        result: RESULT,
      }),
    );
    expect(await test.runtime(request)).toEqual({
      status: "completed",
      result: RESULT,
      sessionId: "own-thread",
      providerVersion: "codex-cli 1.2.3",
    });
    const model = test.calls.at(-1)!;
    expect(test.calls[0].args).toEqual(["$PATH:codex.exe"]);
    expect(model.file).toBe("C:\\native\\codex.exe");
    expect(model.input).toBe(request.prompt);
    expect(model.args).not.toContain(request.prompt);
    expect(model.options).toMatchObject({
      shell: false,
      windowsHide: true,
      detached: false,
    });
    expect(model.options.env).toMatchObject({ CODEX_HOME: "native-auth-home" });
    expect(model.options.env?.OPENAI_API_KEY).toBeUndefined();
    expect(model.args).toEqual(
      expect.arrayContaining([
        "read-only",
        'forced_login_method="chatgpt"',
        'model_provider="openai"',
        'approval_policy="never"',
        "hooks",
        "apps",
        "shell_tool",
        "plugins",
        "computer_use",
        "multi_agent",
        "code_mode",
        "shell_snapshot",
        "notify=[]",
        "agents.enabled=false",
        "mcp_servers={}",
        "mcp_servers.node_repl.enabled=false",
      ]),
    );
    expect(model.args).not.toEqual(
      expect.arrayContaining([
        "--ignore-user-config",
        "--ignore-rules",
        "--dangerously-bypass-approvals-and-sandbox",
      ]),
    );
    expect(
      fs.readFileSync(path.join(request.directory, "stdout.jsonl"), "utf8"),
    ).toContain("turn.completed");
    expect(test.stop).not.toHaveBeenCalled();
    expect(test.calls[5].args).toEqual(
      expect.arrayContaining(["mcp_servers={}", "mcp", "list", "--json"]),
    );
    expect(test.calls[6].args).toEqual(
      expect.arrayContaining(["mcp_servers.node_repl.enabled=false"]),
    );
  });

  it("blocks managed MCP names that cannot be represented by native CLI override paths", async () => {
    const plans = codexPlans({ result: RESULT });
    plans[5] = {
      stdout: JSON.stringify([{ name: "connector.with.dots", enabled: true }]),
    };
    const test = harness(plans);
    expect(await test.runtime(fixture())).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("server name"),
    });
    expect(test.calls).toHaveLength(6);
    expect(
      test.calls.some(
        (call) => call.args.includes("exec") && !call.args.includes("--help"),
      ),
    ).toBe(false);
  });

  it("requires native confirmation that every MCP server is disabled before invoking the model", async () => {
    const plans = codexPlans({ result: RESULT });
    plans[6] = {
      stdout: JSON.stringify([{ name: "node_repl", enabled: true }]),
    };
    const test = harness(plans);
    expect(await test.runtime(fixture())).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("did not disable"),
    });
    expect(test.calls).toHaveLength(7);
    expect(
      test.calls.some(
        (call) => call.args.includes("exec") && !call.args.includes("--help"),
      ),
    ).toBe(false);
  });

  it("requires ChatGPT login and rejects API authentication before any model call", async () => {
    const test = harness(codexPlans({}, "Logged in using an API key\n"));
    expect(await test.runtime(fixture())).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("ChatGPT"),
    });
    expect(test.calls).toHaveLength(2);
  });

  it("requires claude.ai auth and explicit disabled extra usage before any model call", async () => {
    const request = fixture("claude");
    request.claudeExtraUsageDisabled = false;
    const test = harness([]);
    expect(await test.runtime(request)).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("extra usage"),
    });
    expect(test.spawn).not.toHaveBeenCalled();
    request.claudeExtraUsageDisabled = true;
    const api = harness([
      { stdout: "C:\\native\\claude.exe" },
      { stdout: '{"loggedIn":true,"authMethod":"api_key"}' },
    ]);
    expect(await api.runtime(request)).toMatchObject({ status: "blocked" });
    expect(api.calls).toHaveLength(2);
  });

  it("uses subscription-compatible Claude safe/restricted mode and a read-only tool allowlist", async () => {
    const test = harness(claudePlans({ stdout: claudeResult() }));
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "completed",
      result: RESULT,
      sessionId: "claude-session",
    });
    const model = test.calls.at(-1)!;
    expect(test.calls[3].args).toEqual(["--max-turns", "8", "--help"]);
    expect(model.args).toEqual(
      expect.arrayContaining([
        "--safe-mode",
        "--restricted",
        "--strict-mcp-config",
        '{"mcpServers":{}}',
        "Read,Glob,Grep,WebSearch,WebFetch",
        "dontAsk",
        "none",
        "--max-turns",
        "8",
      ]),
    );
    expect(
      JSON.parse(model.args[model.args.indexOf("--settings") + 1]),
    ).toMatchObject({ forceLoginMethod: "claudeai", disableAllHooks: true });
    expect(model.args).not.toContain("--bare");
    expect(model.args).not.toContain("--dangerously-skip-permissions");
    expect(model.args).not.toContain("--fallback-model");
  });

  it("blocks a Claude CLI that cannot isolate customizations", async () => {
    const plans = claudePlans({ stdout: claudeResult() });
    plans[3] = { stdout: CLAUDE_HELP.replace("--safe-mode", "") };
    const test = harness(plans);
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "blocked",
    });
    expect(test.calls).toHaveLength(4);
  });

  it("blocks Codex when native shell-tool isolation cannot be verified", async () => {
    const plans = codexPlans({ result: RESULT });
    plans[4] = { stdout: "hooks stable true\napps stable true\n" };
    const test = harness(plans);
    expect(await test.runtime(fixture())).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("shell tools"),
    });
    expect(test.calls).toHaveLength(5);
  });

  it("stops a Claude API retry event before the CLI can retry or fall back", async () => {
    const test = harness(
      claudePlans({
        stdout:
          '{"type":"system","subtype":"api_retry","error":{"type":"rate_limit_error"}}\n',
        hang: true,
      }),
    );
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "blocked",
      error: expect.stringContaining("rate_limit_error"),
    });
    expect(test.stop).toHaveBeenCalledExactlyOnceWith(test.calls.at(-1)!.child);
    expect(test.calls).toHaveLength(5);
  });

  it.each([
    "Usage limit reached",
    "Sandbox initialization failed: access denied",
    "HTTP 429 quota exceeded",
  ])(
    "stops the owned child on %s without retry or fallback",
    async (message) => {
      const test = harness(
        codexPlans({
          stdout:
            JSON.stringify({ type: "turn.failed", error: { message } }) + "\n",
          hang: true,
        }),
      );
      const outcome = await test.runtime(fixture());
      expect(outcome).toMatchObject({
        status: "blocked",
        error: expect.stringContaining(message),
      });
      expect(test.stop).toHaveBeenCalledExactlyOnceWith(
        test.calls.at(-1)!.child,
      );
      expect(test.calls).toHaveLength(8);
    },
  );

  it("never reports success for exit-zero Claude is_error results, even with valid structured output", async () => {
    const test = harness(
      claudePlans({
        stdout: claudeResult(RESULT, {
          is_error: true,
          subtype: "error_max_turns",
          result: "Maximum turns reached",
        }),
      }),
    );
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "failed",
    });
  });

  it.each([
    undefined,
    { ...RESULT, status: "needs_input", question: null },
    { ...RESULT, status: "completed", question: "Unexpected question" },
  ])(
    "rejects missing or semantically invalid Claude output %#",
    async (result) => {
      const final = {
        type: "result",
        subtype: "success",
        is_error: false,
        ...(result === undefined ? {} : { structured_output: result }),
      };
      const test = harness(claudePlans({ stdout: JSON.stringify(final) }));
      expect(await test.runtime(fixture("claude"))).toMatchObject({
        status: "failed",
        error: expect.stringContaining("invalid structured result"),
      });
    },
  );

  it.each([
    { stdout: '{"type":"turn.completed"}\n' },
    { stdout: '{"type":"turn.completed"}\n', rawResult: "invalid JSON" },
    { stdout: '{"type":"thread.started"}\n', result: RESULT },
  ])("rejects incomplete or invalid Codex output %#", async (task) => {
    const test = harness(codexPlans(task));
    expect(await test.runtime(fixture())).toMatchObject({ status: "failed" });
  });

  it("propagates a valid pending question without treating it as completion", async () => {
    const result = {
      status: "needs_input",
      summary: "Need the target version",
      question: "Which target?",
      options: ["Stable", "Next"],
    };
    const test = harness(claudePlans({ stdout: claudeResult(result) }));
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "needs_input",
      result,
    });
  });

  it("cancels within the polling bound and only stops its current owned child", async () => {
    const request = fixture();
    let cancelled = false;
    request.cancelled = () => cancelled;
    const test = harness(
      codexPlans({
        hang: true,
        started: () => {
          cancelled = true;
        },
      }),
    );
    expect(await test.runtime(request)).toMatchObject({ status: "stopped" });
    expect(test.stop).toHaveBeenCalledExactlyOnceWith(test.calls.at(-1)!.child);
  });

  it("fails safely and stops the current child when cancellation inspection throws", async () => {
    const request = fixture();
    let inspecting = true;
    request.cancelled = () => {
      if (!inspecting) throw new Error("State file cannot be read");
      return false;
    };
    const test = harness(
      codexPlans({
        hang: true,
        started: () => {
          inspecting = false;
        },
      }),
    );
    expect(await test.runtime(request)).toMatchObject({
      status: "failed",
      error: expect.stringContaining("cancellation state"),
    });
    expect(test.stop).toHaveBeenCalledExactlyOnceWith(test.calls.at(-1)!.child);
  });

  it("enforces the whole-runtime time limit", async () => {
    const request = fixture();
    request.maxMinutes = 0.002;
    const test = harness(codexPlans({ hang: true }));
    expect(await test.runtime(request)).toMatchObject({ status: "timed_out" });
    expect(test.stop).toHaveBeenCalledOnce();
  });

  it("bounds combined provider logs at 8 MiB and fails on overflow", async () => {
    const request = fixture("claude");
    const test = harness(
      claudePlans({
        stdout: Buffer.alloc(8 * 1024 * 1024 - 20, "x"),
        stderr: "a".repeat(50),
        hang: true,
      }),
    );
    expect(await test.runtime(request)).toMatchObject({
      status: "failed",
      error: expect.stringContaining("8 MiB"),
    });
    expect(
      fs.statSync(path.join(request.directory, "stdout.jsonl")).size +
        fs.statSync(path.join(request.directory, "stderr.log")).size,
    ).toBe(8 * 1024 * 1024);
    expect(test.stop).toHaveBeenCalledOnce();
  });

  it("fails closed on an unavailable native executable and avoids Windows shell wrappers", async () => {
    const test = harness([{ stdout: "C:\\native\\codex.cmd\n" }]);
    expect(await test.runtime(fixture())).toMatchObject({ status: "blocked" });
    expect(test.calls).toHaveLength(1);
  });

  it("refuses a provider executable found in the untrusted project directory", async () => {
    const request = fixture();
    request.cwd = "C:\\project";
    const test = harness([{ stdout: "C:\\project\\codex.exe\n" }]);
    expect(await test.runtime(request)).toMatchObject({ status: "blocked" });
    expect(test.calls).toHaveLength(1);
  });

  it("does not kill an exited child when a final unterminated error line is received", async () => {
    const test = harness(
      claudePlans({
        stdout: claudeResult(RESULT, {
          is_error: true,
          result: "quota exceeded",
        }).trimEnd(),
      }),
    );
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "blocked",
    });
    expect(test.stop).not.toHaveBeenCalled();
  });

  it("starts POSIX children in an owned process group", async () => {
    const plans = claudePlans({ stdout: claudeResult() }).slice(1);
    const test = harness(plans, "linux");
    expect(await test.runtime(fixture("claude"))).toMatchObject({
      status: "completed",
    });
    expect(test.calls.at(-1)?.options.detached).toBe(true);
  });
});
