import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  gradeFixture,
  parseExecution,
  prepareFixture,
  requireIncludedBilling,
  subscriptionEnvironment,
  selectRepoEvalSuite,
  removeOwnedTemp,
  runRepoEvaluations,
} from "../scripts/run-repo-evals.mjs";
import {
  repoEvalCases,
  repoImplementationHoldoutCases,
} from "../scripts/lib/repoEvalCases.mjs";

const independentPatch = `export function applyChanges(input, changes) {
  if (!Array.isArray(changes)) throw new Error('Invalid changes');
  const result = structuredClone(input);
  for (const change of changes) {
    const segments = change?.path;
    if (!Array.isArray(segments) || !segments.length || segments.some(segment => typeof segment !== 'string' || !segment.length || ['__proto__', 'prototype', 'constructor'].includes(segment))) throw new Error('Invalid path');
    let target = result;
    for (const segment of segments.slice(0, -1)) {
      if (!target || typeof target !== 'object' || Array.isArray(target) || !Object.hasOwn(target, segment)) throw new Error('Missing intermediate path');
      target = target[segment];
    }
    if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error('Invalid target');
    Object.defineProperty(target, segments.at(-1), { value: structuredClone(change.value), configurable: true, enumerable: true, writable: true });
  }
  return result;
}`;

function fakeNativeEditor(controller?: AbortController) {
  return vi.fn(
    async (
      _file: string,
      args: string[],
      cwd: string,
      _env: unknown,
      prompt = "",
      _timeoutMs = 180000,
      _signal?: AbortSignal,
    ) => {
      const base = {
        code: 0,
        stderr: "",
        timedOut: false,
        overflow: false,
        cancelled: false,
        error: null,
        durationMs: 5,
      };
      if (args[0] === "auth")
        return {
          ...base,
          stdout: JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }),
        };
      if (args.includes("--version"))
        return { ...base, stdout: "claude-test-native 1.0\n" };
      fs.writeFileSync(path.join(cwd, "patch.mjs"), independentPatch);
      const skill = /^Read and apply (.+) before working\./.exec(prompt)?.[1];
      const events: unknown[] = [
        { type: "system", model: "claude-test-observed" },
      ];
      if (skill) {
        expect(fs.existsSync(path.join(cwd, skill))).toBe(true);
        events.push({
          type: "assistant",
          message: {
            content: [
              {
                type: "tool_use",
                name: "Read",
                id: "skill-read",
                input: { file_path: path.join(cwd, skill) },
              },
            ],
          },
        });
        events.push({
          type: "user",
          message: {
            content: [
              {
                type: "tool_result",
                tool_use_id: "skill-read",
                content: "Native fixture skill read",
              },
            ],
          },
        });
      }
      events.push({
        type: "result",
        is_error: false,
        result: "Completed",
        usage: { input_tokens: 12, output_tokens: 4 },
      });
      controller?.abort();
      return {
        ...base,
        code: controller ? null : 0,
        cancelled: Boolean(controller),
        stdout: events.map((event) => JSON.stringify(event)).join("\n"),
      };
    },
  );
}

const holdoutArguments = (output: string) => [
  "--live",
  "--subscription-only",
  "--providers",
  "claude",
  "--claude-extra-usage-disabled",
  "--suite",
  "implementation-holdout",
  "--runs",
  "1",
  "--max-calls",
  "2",
  "--output",
  output,
];

describe("Executable repository evaluation controls", () => {
  it("validates the time budget before processes or output mutations and preserves the three-minute default", async () => {
    const executable = vi.fn();
    const run = vi.fn();
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-repo-budget-validation-"),
    );
    try {
      const output = path.join(outputRoot, "must-not-exist");
      for (const value of ["0", "31", "-1", "1.5", "NaN", "Infinity", ""]) {
        await expect(
          runRepoEvaluations(
            [...holdoutArguments(output), "--max-minutes", value],
            { executable, run, log: () => {} },
          ),
        ).rejects.toThrow("--max-minutes");
        expect(fs.existsSync(output)).toBe(false);
      }
      await expect(
        runRepoEvaluations([...holdoutArguments(output), "--max-minutes"], {
          executable,
          run,
          log: () => {},
        }),
      ).rejects.toThrow("--max-minutes");
      await expect(
        runRepoEvaluations(
          [
            ...holdoutArguments(output),
            "--max-minutes",
            "3",
            "--max-minutes",
            "6",
          ],
          { executable, run, log: () => {} },
        ),
      ).rejects.toThrow("--max-minutes");
      expect(executable).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
      expect(await runRepoEvaluations([], { log: () => {} })).toMatchObject({
        live: false,
        maxMinutesPerAttempt: 3,
        timeoutMsPerAttempt: 180000,
      });
      expect(
        await runRepoEvaluations(["--max-minutes", "30"], { log: () => {} }),
      ).toMatchObject({
        live: false,
        maxMinutesPerAttempt: 30,
        timeoutMsPerAttempt: 1800000,
      });
    } finally {
      expect(path.dirname(path.resolve(outputRoot))).toBe(
        path.resolve(os.tmpdir()),
      );
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("applies and freezes the identical explicit timeout in both invocations and keeps timed-out answers unmeasured", async () => {
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-repo-budget-test-"),
    );
    try {
      const output = path.join(outputRoot, "six-minute-budget");
      const editor = fakeNativeEditor();
      const record = await runRepoEvaluations(
        [...holdoutArguments(output), "--max-minutes", "6"],
        { executable: () => "fake-claude", run: editor, log: () => {} },
      );
      expect(record).toMatchObject({
        status: "pilot-completed",
        maxMinutesPerAttempt: 6,
        timeoutMsPerAttempt: 360000,
      });
      const modelCalls = editor.mock.calls.filter(([, args]) =>
        args.includes("-p"),
      );
      expect(modelCalls.map((call) => call[5])).toEqual([360000, 360000]);
      expect(
        JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8")),
      ).toMatchObject({ maxMinutesPerAttempt: 6, timeoutMsPerAttempt: 360000 });
      for (const observation of record.observations) {
        const attempt = JSON.parse(
          fs.readFileSync(
            path.join(output, observation.trace, "attempt-start.json"),
            "utf8",
          ),
        );
        const execution = JSON.parse(
          fs.readFileSync(
            path.join(output, observation.trace, "execution.json"),
            "utf8",
          ),
        );
        expect(attempt).toMatchObject({ maxMinutes: 6, timeoutMs: 360000 });
        expect(execution).toMatchObject({
          maxMinutes: 6,
          timeoutMs: 360000,
          timedOut: false,
        });
      }
      for (const checkpoint of fs
        .readdirSync(output)
        .filter((name) => name.startsWith("checkpoint-")))
        expect(
          JSON.parse(fs.readFileSync(path.join(output, checkpoint), "utf8")),
        ).toMatchObject({
          maxMinutesPerAttempt: 6,
          timeoutMsPerAttempt: 360000,
        });
      const expiredEditor = fakeNativeEditor();
      const expiredRun = vi.fn(
        async (
          file: string,
          args: string[],
          cwd: string,
          env: unknown,
          prompt = "",
          timeoutMs = 180000,
          signal?: AbortSignal,
        ) => {
          const outcome = await expiredEditor(
            file,
            args,
            cwd,
            env,
            prompt,
            timeoutMs,
            signal,
          );
          return args.includes("-p")
            ? { ...outcome, code: null, timedOut: true }
            : outcome;
        },
      );
      const expiredOutput = path.join(outputRoot, "preserved-timeout");
      const expired = await runRepoEvaluations(
        [...holdoutArguments(expiredOutput), "--max-minutes", "3"],
        { executable: () => "fake-claude", run: expiredRun, log: () => {} },
      );
      expect(expired).toMatchObject({
        status: "incomplete-or-failed",
        calls: 1,
        maxMinutesPerAttempt: 3,
        timeoutMsPerAttempt: 180000,
        pairs: [],
      });
      expect(expired.observations[0]).toMatchObject({
        executionOk: false,
        passed: null,
        grade: { passed: true },
      });
      expect(
        expiredRun.mock.calls
          .filter(([, args]) => args.includes("-p"))
          .map((call) => call[5]),
      ).toEqual([180000]);
      expect(expired.fingerprint).not.toBe(record.fingerprint);
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(expiredOutput, "final-results.json"),
            "utf8",
          ),
        ).status,
      ).toBe("incomplete-or-failed");
    } finally {
      expect(path.dirname(path.resolve(outputRoot))).toBe(
        path.resolve(os.tmpdir()),
      );
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("validates owned absolute cleanup paths and bounds Windows lock retries", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-repo-eval-"));
    const wait = vi.fn();
    let attempts = 0;
    const transient = vi.fn((target: string) => {
      attempts++;
      if (attempts < 3)
        throw Object.assign(new Error("Temporary Windows lock"), {
          code: "EPERM",
        });
      fs.rmSync(target, { recursive: true, force: true });
    });
    expect(
      removeOwnedTemp(dir, "helen-repo-eval-", {
        platform: "win32",
        remove: transient,
        wait,
      }),
    ).toMatchObject({ status: "removed", attempts: 3 });
    expect(wait.mock.calls).toEqual([[100], [200]]);
    expect(
      transient.mock.calls.every(
        ([target]) => path.resolve(target) === path.resolve(dir),
      ),
    ).toBe(true);
    const neverRemove = vi.fn();
    expect(() =>
      removeOwnedTemp(os.tmpdir(), "helen-repo-eval-", { remove: neverRemove }),
    ).toThrow("Refusing cleanup");
    expect(() =>
      removeOwnedTemp(path.join(os.tmpdir(), "unowned"), "unowned", {
        remove: neverRemove,
      }),
    ).toThrow("Refusing cleanup");
    expect(neverRemove).not.toHaveBeenCalled();
  });

  it("persists immutable grades before a permanent Windows cleanup failure and retains successful final outcomes", async () => {
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-repo-progress-test-"),
    );
    const output = path.join(outputRoot, "evidence");
    const leftovers: string[] = [];
    const editor = fakeNativeEditor();
    const remove = vi.fn(() => {
      throw Object.assign(new Error("Windows kept the directory locked"), {
        code: "EPERM",
      });
    });
    try {
      const report = await runRepoEvaluations(holdoutArguments(output), {
        executable: () => "fake-claude",
        run: editor,
        log: () => {},
        cleanup: (dir: string, prefix: string) => {
          const directories = fs
            .readdirSync(output, { withFileTypes: true })
            .filter((entry) => entry.isDirectory());
          const newest = directories.find(
            (entry) =>
              !fs.existsSync(path.join(output, entry.name, "cleanup.json")),
          );
          expect(newest).toBeDefined();
          const observation = JSON.parse(
            fs.readFileSync(
              path.join(output, newest!.name, "observation.json"),
              "utf8",
            ),
          );
          expect(observation).toMatchObject({
            passed: true,
            providerVersion: "claude-test-native 1.0",
            resolvedModel: "claude-test-observed",
            usage: { input_tokens: 12, output_tokens: 4 },
            grade: { passed: true, scopeOk: true },
          });
          expect(
            fs.existsSync(path.join(output, newest!.name, "grade.json")),
          ).toBe(true);
          leftovers.push(dir);
          return removeOwnedTemp(dir, prefix, {
            platform: "win32",
            remove,
            wait: () => {},
          });
        },
      });
      expect(report).toMatchObject({ status: "pilot-completed", calls: 2 });
      expect(report.observations).toHaveLength(2);
      expect(report.cleanupWarnings).toHaveLength(2);
      expect(
        report.cleanupWarnings.every(
          (warning: { attempts: number }) => warning.attempts === 5,
        ),
      ).toBe(true);
      expect(remove).toHaveBeenCalledTimes(10);
      expect(editor).toHaveBeenCalledTimes(4);
      const finalFile = path.join(output, "final-results.json");
      const immutableFinal = fs.readFileSync(finalFile, "utf8");
      expect(JSON.parse(immutableFinal)).toMatchObject({
        status: "pilot-completed",
        calls: 2,
        cleanupWarnings: expect.any(Array),
      });
      const checkpoints = fs
        .readdirSync(output)
        .filter((name) => name.startsWith("checkpoint-"));
      expect(checkpoints.length).toBeGreaterThan(3);
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(output, checkpoints.sort().at(-1)!),
            "utf8",
          ),
        ).status,
      ).toBe("pilot-completed");
      await expect(
        runRepoEvaluations(holdoutArguments(output), { log: () => {} }),
      ).rejects.toThrow("Output already exists");
      expect(fs.readFileSync(finalFile, "utf8")).toBe(immutableFinal);
    } finally {
      for (const dir of leftovers) removeOwnedTemp(dir, "helen-repo-eval-");
      expect(path.dirname(path.resolve(outputRoot))).toBe(
        path.resolve(os.tmpdir()),
      );
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("keeps interrupted and preflight-blocked progress in immutable final snapshots without retrying", async () => {
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-repo-cancel-test-"),
    );
    try {
      const controller = new AbortController();
      const editor = fakeNativeEditor(controller);
      const output = path.join(outputRoot, "interrupted");
      const interrupted = await runRepoEvaluations(holdoutArguments(output), {
        executable: () => "fake-claude",
        run: editor,
        signal: controller.signal,
        log: () => {},
      });
      expect(interrupted).toMatchObject({ status: "interrupted", calls: 1 });
      expect(editor).toHaveBeenCalledTimes(3);
      expect(interrupted.observations[0]).toMatchObject({
        executionOk: false,
        passed: null,
        cancelled: true,
        grade: { passed: true },
      });
      expect(
        JSON.parse(
          fs.readFileSync(path.join(output, "final-results.json"), "utf8"),
        ).status,
      ).toBe("interrupted");
      const unavailable = vi.fn(async () => ({
        code: 1,
        stdout: "",
        stderr: "",
        timedOut: false,
        error: null,
      }));
      const blockedOutput = path.join(outputRoot, "preflight-blocked");
      const blocked = await runRepoEvaluations(
        holdoutArguments(blockedOutput),
        { executable: () => "fake-claude", run: unavailable, log: () => {} },
      );
      expect(blocked).toMatchObject({
        status: "incomplete-or-failed",
        calls: 0,
        observations: [],
      });
      expect(unavailable).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(blockedOutput, "final-results.json"),
            "utf8",
          ),
        ).calls,
      ).toBe(0);
    } finally {
      expect(path.dirname(path.resolve(outputRoot))).toBe(
        path.resolve(os.tmpdir()),
      );
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("retains the original pilot default and explicitly selects the independent implementation holdout", () => {
    expect(selectRepoEvalSuite()).toEqual(repoEvalCases);
    expect(selectRepoEvalSuite()).toHaveLength(2);
    expect(selectRepoEvalSuite("implementation-holdout")).toEqual(
      repoImplementationHoldoutCases,
    );
    expect(
      selectRepoEvalSuite("implementation-holdout", [
        "immutable-safe-object-patch",
      ])[0].allowedWrites,
    ).toEqual(["patch.mjs"]);
    expect(() => selectRepoEvalSuite("unknown")).toThrow(
      "Unknown repository evaluation suite",
    );
    expect(() =>
      selectRepoEvalSuite("pilot", ["immutable-safe-object-patch"]),
    ).toThrow("Unknown case");
    expect(() =>
      selectRepoEvalSuite("implementation-holdout", [repoEvalCases[0].id]),
    ).toThrow("Unknown case");
  });

  it("blocks included-only evaluations when selected account billing conditions are unknown", () => {
    expect(() => requireIncludedBilling([], ["codex"])).toThrow(
      "--codex-credits-unavailable",
    );
    expect(() => requireIncludedBilling([], ["claude"])).toThrow(
      "--claude-extra-usage-disabled",
    );
    expect(() =>
      requireIncludedBilling(
        ["--claude-extra-usage-disabled"],
        ["codex", "claude"],
      ),
    ).toThrow("--codex-credits-unavailable");
  });

  it("accepts actual account confirmations only for the selected providers", () => {
    expect(() =>
      requireIncludedBilling(["--codex-credits-unavailable"], ["codex"]),
    ).not.toThrow();
    expect(() =>
      requireIncludedBilling(["--claude-extra-usage-disabled"], ["claude"]),
    ).not.toThrow();
    expect(() =>
      requireIncludedBilling(
        ["--codex-credits-unavailable", "--claude-extra-usage-disabled"],
        ["codex", "claude"],
      ),
    ).not.toThrow();
  });

  for (const spec of repoEvalCases) {
    it(`${spec.id}: rejects the original behavioral defect and accepts correct outcomes`, () => {
      const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), "helen-eval-controls-"),
      );
      try {
        const fixture = prepareFixture(dir, spec, "codex", false);
        expect(gradeFixture(dir, spec, fixture).passed).toBe(false);
        const corrected =
          spec.file === "checkout.mjs"
            ? `export function createCheckout(charge) {
              const entries = new Map();
              return async (key, amount) => {
                const found = entries.get(key);
                if (found) { if (found.amount !== amount) throw new Error('payload mismatch'); return found.promise; }
                const promise = Promise.resolve().then(() => charge(amount));
                entries.set(key, { amount, promise });
                try { return await promise; } catch (error) { entries.delete(key); throw error; }
              };
            }`
            : `export function createCache(load) {
              const entries = new Map();
              return async key => {
                if (entries.has(key)) return entries.get(key);
                const promise = Promise.resolve().then(() => load(key));
                entries.set(key, promise);
                try { return await promise; } catch (error) { entries.delete(key); throw error; }
              };
            }`;
        fs.writeFileSync(path.join(dir, spec.file), corrected);
        expect(gradeFixture(dir, spec, fixture)).toMatchObject({
          passed: true,
        });
        fs.writeFileSync(
          path.join(dir, "test.mjs"),
          'console.log("fake success");',
        );
        expect(gradeFixture(dir, spec, fixture)).toMatchObject({
          passed: false,
          reason: "Fixture scope or immutable controls changed",
        });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("removes paid API and cloud-provider fallbacks from child environments", () => {
    const env = subscriptionEnvironment({
      PATH: "tools",
      OPENAI_API_KEY: "private",
      CODEX_API_KEY: "private",
      ANTHROPIC_API_KEY: "private",
      ANTHROPIC_AUTH_TOKEN: "private",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_OAUTH_TOKEN: "private",
    });
    expect(env.PATH).toBe("tools");
    expect(
      Object.keys(env).filter((key) =>
        /API_KEY|AUTH_TOKEN|BEDROCK|OAUTH_TOKEN/.test(key),
      ),
    ).toEqual([]);
  });

  it("does not allow agent code to write from inside the hidden grader", () => {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-eval-permissions-"),
    );
    try {
      const spec = repoEvalCases[0];
      const fixture = prepareFixture(dir, spec, "codex", false);
      fs.writeFileSync(
        path.join(dir, spec.file),
        "import fs from 'node:fs'; fs.writeFileSync('grader-tamper', 'unsafe'); export function createCheckout() {}\n",
      );
      expect(gradeFixture(dir, spec, fixture).passed).toBe(false);
      expect(fs.existsSync(path.join(dir, "grader-tamper"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not accept early process exit as completed grading", () => {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-eval-early-exit-"),
    );
    try {
      const spec = repoEvalCases[0];
      const fixture = prepareFixture(dir, spec, "codex", false);
      fs.writeFileSync(
        path.join(dir, spec.file),
        "process.exit(0); export function createCheckout() {}\n",
      );
      expect(gradeFixture(dir, spec, fixture)).toMatchObject({
        passed: false,
        outcomePassed: false,
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("requires successful reading of the actual skill and identifies subscription quota exhaustion", () => {
    const skillPath = "C:/fixture/.claude/skills/helen-implementa/SKILL.md";
    const read = {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Read",
            id: "read-1",
            input: { file_path: skillPath },
          },
        ],
      },
    };
    const result = {
      type: "user",
      message: {
        content: [
          { type: "tool_result", tool_use_id: "read-1", content: "Skill body" },
        ],
      },
    };
    const terminal = { type: "result", result: "Completed", is_error: false };
    const execution = (events: unknown[]) => ({
      code: 0,
      stdout: events.map((event) => JSON.stringify(event)).join("\n"),
      stderr: "",
      timedOut: false,
      overflow: false,
    });
    expect(
      parseExecution(execution([read, terminal]), "claude", skillPath)
        .skillLoaded,
    ).toBe(false);
    expect(
      parseExecution(execution([read, result, terminal]), "claude", skillPath)
        .skillLoaded,
    ).toBe(true);
    expect(
      parseExecution(
        execution([read, result, terminal]),
        "claude",
        "C:/other/SKILL.md",
      ).skillLoaded,
    ).toBe(false);
    expect(
      parseExecution(
        execution([
          {
            type: "result",
            is_error: true,
            api_error_status: 429,
            result: "You've hit your session limit",
          },
        ]),
        "claude",
      ),
    ).toMatchObject({ ok: false, quotaBlocked: true });
    expect(
      parseExecution(
        {
          ...execution([{ type: "turn.completed" }]),
          stderr: "blocked by policy",
        },
        "codex",
      ),
    ).toMatchObject({ ok: false, environmentBlocked: true });
  });
});
