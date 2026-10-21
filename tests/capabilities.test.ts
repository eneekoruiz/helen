import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SpawnSyncOptionsWithStringEncoding } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inspectCapabilities,
  recordCapabilityObservation,
} from "../src/core/capabilities.js";
import type {
  CapabilityDependencies,
  CapabilityObservation,
  CapabilityOptions,
} from "../src/core/capabilities.js";
import { jobResultSchema } from "../src/core/jobTypes.js";
import {
  gradeSpecialtyResult,
  nativeQuestionsBenchmark,
  specialtyEvalCases,
} from "../scripts/lib/specialtyEvalCases.mjs";
import { repoImplementationHoldoutCases } from "../scripts/lib/repoEvalCases.mjs";
import { gradeFixture, prepareFixture } from "../scripts/run-repo-evals.mjs";

const temporary: string[] = [];
const test = it.skipIf(Number(process.versions.node.split(".")[0]) < 22);
afterEach(() => {
  for (const directory of temporary.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});
function directory(): string {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "helen-capability-controls-"),
  );
  temporary.push(dir);
  return dir;
}
const NOW = new Date("2026-10-07T10:00:00.000Z");
function harness(
  settings: {
    help?: string;
    auth?: string;
    version?: string;
    unavailable?: boolean;
    failAuth?: boolean;
  } = {},
) {
  const calls: Array<{
    file: string;
    args: string[];
    options: SpawnSyncOptionsWithStringEncoding;
  }> = [];
  const run: CapabilityDependencies["run"] = vi.fn((file, args, options) => {
    calls.push({ file, args, options });
    if (file.endsWith("where.exe"))
      return {
        status: settings.unavailable ? 1 : 0,
        stdout: "C:\\native\\codex.exe\n",
        stderr: "",
      };
    if (args.includes("--version"))
      return {
        status: 0,
        stdout: settings.version ?? "codex-cli 1.2.3\n",
        stderr: "",
      };
    if (args.includes("status"))
      return {
        status: settings.failAuth ? 1 : 0,
        stdout: settings.auth ?? "Logged in using ChatGPT\n",
        stderr: "",
      };
    if (args.includes("--help"))
      return {
        status: 0,
        stdout:
          settings.help ??
          "--sandbox workspace-write --json --tools --max-turns",
        stderr: "",
      };
    throw new Error("Model invocation attempted");
  });
  const deps: Partial<CapabilityDependencies> = {
    run,
    platform: "win32",
    architecture: "x64",
    now: () => NOW,
    env: {
      PATH: "C:\\native",
      SystemRoot: "C:\\Windows",
      CODEX_HOME: "native-home",
      OPENAI_API_KEY: "sk-proj-private",
      ANTHROPIC_API_KEY: "paid-secret",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_OAUTH_TOKEN: "private-oauth",
      CODEX_APP_TOOLS_PIPE_PATH: "private-parent-ipc",
    },
  };
  const options: CapabilityOptions = { cwd: directory(), providers: ["codex"] };
  return { calls, run, deps, options };
}
function readReceipt(
  report: Awaited<ReturnType<typeof inspectCapabilities>>,
): CapabilityObservation {
  return {
    provider: "codex",
    capability: "read",
    environmentId: report.environment.id,
    providerVersion: "1.2.3",
    observedAt: "2026-10-07T09:59:00.000Z",
    source: "runtime-bridge",
    invocationId: "read-1",
    evidenceId: "result-1",
    evidence: { kind: "file-read", contentDigest: "a".repeat(64) },
  };
}

describe("Capability diagnostics evidence and spending boundaries", () => {
  it("rejects invalid provider/project selections before invoking any native process", async () => {
    const { deps, options, run } = harness();
    for (const invalid of [
      { ...options, cwd: "relative-project" },
      { ...options, providers: [] },
      { ...options, providers: ["codex", "codex"] },
      { ...options, providers: ["paid-api"] },
    ])
      await expect(
        inspectCapabilities(invalid as CapabilityOptions, deps),
      ).rejects.toThrow("absolute project path");
    expect(run).not.toHaveBeenCalled();
  });

  it("uses only bounded read-only native probes and never inherits credential or app IPC fallbacks", async () => {
    const { calls, deps, options } = harness();
    fs.writeFileSync(path.join(options.cwd, "control.txt"), "unchanged");
    const before = fs.readdirSync(options.cwd);
    const report = await inspectCapabilities(options, deps);
    expect(report).toMatchObject({
      modelCalls: 0,
      projectWrites: 0,
      checkedAt: NOW.toISOString(),
    });
    expect(calls.map((call) => call.args)).toEqual([
      ["$PATH:codex.exe"],
      ["--version"],
      [
        "-c",
        'forced_login_method="chatgpt"',
        "-c",
        'model_provider="openai"',
        "login",
        "status",
      ],
      ["exec", "--help"],
    ]);
    expect(calls[0].file).toBe("C:\\Windows\\System32\\where.exe");
    for (const call of calls) {
      expect(call.options).toMatchObject({
        shell: false,
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 65536,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect(call.options.env?.PATH).toBe("C:\\native");
      expect(
        Object.keys(call.options.env ?? {}).filter((key) =>
          /API_KEY|AUTH_TOKEN|OAUTH_TOKEN|BEDROCK|TOOLS_PIPE/.test(key),
        ),
      ).toEqual([]);
    }
    expect(fs.readdirSync(options.cwd)).toEqual(before);
    expect(fs.readFileSync(path.join(options.cwd, "control.txt"), "utf8")).toBe(
      "unchanged",
    );
  });

  it("does not claim successful read, write, execution or native forms from sandbox/tool flags", async () => {
    const { deps, options } = harness();
    const report = await inspectCapabilities(options, deps);
    const provider = report.providers[0];
    expect(provider).toMatchObject({
      installed: true,
      version: "1.2.3",
      authenticated: true,
      authMode: "chatgpt",
      includedOnlyAuthorized: false,
    });
    for (const capability of Object.values(provider.capabilities)) {
      expect(capability.advertised).toBe(false);
      expect(capability.observations).toEqual([]);
      expect(capability.state).toBe("authenticated");
    }
  });

  it("separates advertisements, supplied configuration, native authentication and included-only billing confirmation", async () => {
    const { deps, options } = harness({
      help: "Read Write Bash MCP request_user_input",
    });
    options.configured = { codex: { browser: false, mcp: true } };
    options.billing = { codexCreditsUnavailable: true };
    const report = await inspectCapabilities(options, deps);
    expect(report.providers[0].includedOnlyAuthorized).toBe(true);
    expect(report.providers[0].capabilities.read).toMatchObject({
      state: "advertised",
      configured: null,
      advertised: true,
      observations: [],
    });
    expect(report.providers[0].capabilities.browser).toMatchObject({
      state: "unavailable",
      configured: false,
    });
    expect(report.providers[0].capabilities.mcp).toMatchObject({
      state: "advertised",
      configured: true,
    });
    expect(report.providers[0].capabilities.nativeQuestions.state).toBe(
      "advertised",
    );
    const other = await inspectCapabilities(
      { ...options, configured: { codex: { mcp: false } } },
      deps,
    );
    expect(other.environment.id).not.toBe(report.environment.id);
  });

  it("does not continue with missing or unverified native executables", async () => {
    const missing = harness({ unavailable: true });
    const missingReport = await inspectCapabilities(
      missing.options,
      missing.deps,
    );
    expect(missing.calls).toHaveLength(1);
    expect(missingReport.providers[0]).toMatchObject({
      installed: false,
      authenticated: null,
      version: null,
    });
    expect(missingReport.providers[0].capabilities.exec.state).toBe(
      "unavailable",
    );
    const unknown = harness({ version: "unrecognized private credential" });
    const unknownReport = await inspectCapabilities(
      unknown.options,
      unknown.deps,
    );
    expect(unknown.calls).toHaveLength(2);
    expect(unknownReport.providers[0]).toMatchObject({
      installed: true,
      authenticated: null,
      version: null,
    });
    expect(JSON.stringify(unknownReport)).not.toContain("private credential");
  });

  it("rejects Windows shell wrappers and a project-directory executable", async () => {
    const fixture = harness();
    for (const output of [
      "C:\\tools\\codex.cmd",
      path.win32.join(fixture.options.cwd, "codex.exe"),
      "codex.exe",
      "C:\\tools\\codex\u0000.exe",
    ]) {
      const run: CapabilityDependencies["run"] = vi.fn(() => ({
        status: 0,
        stdout: output,
        stderr: "",
      }));
      const report = await inspectCapabilities(fixture.options, {
        ...fixture.deps,
        run,
      });
      expect(report.providers[0].installed).toBe(false);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it("fails closed on API auth, overflow, timeout and malformed results without leaking provider auth output", async () => {
    const api = harness({
      auth: "Logged in using an API key sk-proj-private\n",
    });
    const report = await inspectCapabilities(api.options, api.deps);
    expect(report.providers[0]).toMatchObject({
      authenticated: false,
      authMode: null,
    });
    expect(JSON.stringify(report)).not.toMatch(/sk-proj|private|API key/);
    for (const result of [
      { status: 0, stdout: "x".repeat(70000), stderr: "" },
      {
        status: null,
        stdout: "",
        stderr: "secret",
        error: new Error("ETIMEDOUT secret"),
      },
    ]) {
      const fixture = harness();
      const run: CapabilityDependencies["run"] = vi.fn(() => result);
      const unavailable = await inspectCapabilities(fixture.options, {
        ...fixture.deps,
        run,
      });
      expect(unavailable.providers[0].installed).toBe(false);
      expect(JSON.stringify(unavailable)).not.toContain("secret");
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it("accepts only version/environment-bound operation receipts verified against real runtime evidence", async () => {
    const { deps, options } = harness({ help: "Read" });
    const report = await inspectCapabilities(options, deps);
    const receipt = readReceipt(report);
    const verify = vi.fn(
      (candidate: CapabilityObservation) => candidate.evidenceId === "result-1",
    );
    const observed = recordCapabilityObservation(
      report,
      receipt,
      verify,
      () => NOW,
    );
    expect(observed.providers[0].capabilities.read.state).toBe(
      "actually-observed",
    );
    expect(observed.providers[0].capabilities.write.state).toBe(
      "authenticated",
    );
    expect(report.providers[0].capabilities.read.observations).toHaveLength(0);
    const afterInspection = {
      ...receipt,
      observedAt: "2026-10-07T10:00:01.000Z",
    };
    expect(
      recordCapabilityObservation(
        report,
        afterInspection,
        verify,
        () => new Date("2026-10-07T10:00:02.000Z"),
      ).providers[0].capabilities.read.state,
    ).toBe("actually-observed");
    const disabled = await inspectCapabilities(
      { ...options, configured: { codex: { read: false } } },
      deps,
    );
    expect(
      recordCapabilityObservation(
        disabled,
        { ...receipt, environmentId: disabled.environment.id },
        verify,
        () => NOW,
      ).rejectedObservations,
    ).toBe(1);
    const invalid: CapabilityObservation[] = [
      { ...receipt, environmentId: "different-environment" },
      { ...receipt, providerVersion: "9.9.9" },
      { ...receipt, observedAt: "2027-01-01T00:00:00.000Z" },
      { ...receipt, capability: "write" },
      {
        ...receipt,
        evidence: { kind: "file-read", contentDigest: "self-report" },
      },
    ];
    for (const rejected of invalid)
      expect(
        recordCapabilityObservation(report, rejected, verify, () => NOW)
          .rejectedObservations,
      ).toBe(1);
    expect(
      recordCapabilityObservation(
        report,
        receipt,
        () => false,
        () => NOW,
      ).providers[0].capabilities.read.state,
    ).toBe("advertised");
    expect(
      recordCapabilityObservation(
        report,
        receipt,
        undefined as never,
        () => NOW,
      ).rejectedObservations,
    ).toBe(1);
    expect(
      recordCapabilityObservation(
        report,
        receipt,
        () => {
          throw new Error("untrusted trace");
        },
        () => NOW,
      ).rejectedObservations,
    ).toBe(1);
  });

  it("requires actual native form, human answer and answer incorporation evidence rather than headless needs_input", async () => {
    const { deps, options } = harness({ help: "AskUserQuestion" });
    const report = await inspectCapabilities(options, deps);
    const receipt: CapabilityObservation = {
      ...readReceipt(report),
      capability: "nativeQuestions",
      evidence: {
        kind: "native-question-answer",
        presentation: "native-ui",
        surfaceId: "foreground-1",
        formId: "form-1",
        presentedEvidenceId: "render-1",
        answerEvidenceId: "human-answer-1",
        incorporationEvidenceId: "brief-1",
        questionIds: ["retention_policy"],
        answeredQuestionIds: ["retention_policy"],
        incorporatedQuestionIds: ["retention_policy"],
      },
    };
    const verify = vi.fn(() => true);
    expect(
      recordCapabilityObservation(report, receipt, verify, () => NOW)
        .providers[0].capabilities.nativeQuestions.state,
    ).toBe("actually-observed");
    for (const evidence of [
      { ...receipt.evidence, presentation: "headless-json" },
      { ...receipt.evidence, incorporatedQuestionIds: [] },
      { ...receipt.evidence, answeredQuestionIds: ["invented_answer"] },
    ])
      expect(
        recordCapabilityObservation(
          report,
          { ...receipt, evidence } as CapabilityObservation,
          verify,
          () => NOW,
        ).rejectedObservations,
      ).toBe(1);
    expect(nativeQuestionsBenchmark.rejectedEvidence).toContain(
      "headless needs_input JSON",
    );
  });

  it("recognizes Claude subscription status without disclosing account identity", async () => {
    const fixture = harness();
    fixture.options.providers = ["claude"];
    fixture.options.billing = { claudeExtraUsageDisabled: true };
    const run: CapabilityDependencies["run"] = vi.fn((file, args) => {
      if (file.endsWith("where.exe"))
        return { status: 0, stdout: "C:\\native\\claude.exe", stderr: "" };
      if (args[0] === "--version")
        return { status: 0, stdout: "2.0.4 (Claude Code)", stderr: "" };
      if (args[0] === "auth")
        return {
          status: 0,
          stdout: JSON.stringify({
            loggedIn: true,
            authMethod: "claude.ai",
            email: "private@example.com",
            token: "private-token",
          }),
          stderr: "",
        };
      return { status: 0, stdout: "--mcp-config", stderr: "" };
    });
    const report = await inspectCapabilities(fixture.options, {
      ...fixture.deps,
      run,
    });
    expect(report.providers[0]).toMatchObject({
      authenticated: true,
      authMode: "claude.ai",
      includedOnlyAuthorized: true,
    });
    expect(JSON.stringify(report)).not.toMatch(/private|email|token/);
    expect(report.providers[0].capabilities.mcp).toMatchObject({
      state: "advertised",
      observations: [],
    });
  });
});

function completed(summary: unknown) {
  return jobResultSchema.parse({
    status: "completed",
    summary: JSON.stringify(summary),
    question: null,
    options: [],
  });
}
function correctAnswer(spec: (typeof specialtyEvalCases)[number]) {
  if (spec.expected.findings)
    return completed({
      findings: spec.expected.findings.map(
        (finding: {
          id: string;
          file: string;
          lines: number[];
          severity: string;
        }) => ({
          id: finding.id,
          file: finding.file,
          line: finding.lines[0],
          severity: finding.severity,
          impact: {
            "premature-success":
              "Save promises do not finish before success, and a rejection or failure escapes the completed result.",
            "unbounded-concurrency":
              "Unlimited parallel active saves violate the limit of two.",
            "tenant-boundary":
              "An authenticated customer can access another tenant's invoice.",
            "command-injection":
              "An attacker can inject arbitrary shell commands for execution.",
            "path-containment":
              "Traversal can escape the root directory to an arbitrary file.",
            "unsupported-verification-claim":
              "The verification claim says checkout and rollback are tested without supporting evidence.",
          }[finding.id],
          fix: {
            "premature-success":
              "Await every save and propagate failures to the caller.",
            "unbounded-concurrency":
              "Use a worker pool bounded to two active saves.",
            "tenant-boundary":
              "Scope the lookup and check matching tenantId before returning the invoice.",
            "command-injection":
              "Use execFile with a separate argument array and -- before the literal pattern.",
            "path-containment":
              "Check path.relative containment and reject paths outside the root boundary.",
            "unsupported-verification-claim":
              "Add outcome tests for checkout and rollback, or correct/remove the claim until there is evidence.",
          }[finding.id],
        }),
      ),
      verifiedChecks: [],
    });
  if (spec.specialty === "documentation")
    return completed({
      goal: "Propose operation recovery",
      scope: "chat-only",
      steps: spec.expected.commands.map((command: string) => ({
        command,
        purpose:
          "Inspect or restore the selected operation in the documented order.",
      })),
      verificationStatus: "not-run",
      limitations: [
        "A human must select OP_ID and approve recovery before running it.",
      ],
    });
  const ambiguous = spec.expected.status === "needs_input";
  return jobResultSchema.parse({
    status: ambiguous ? "needs_input" : "completed",
    question: ambiguous
      ? "Which retention duration or policy must the customer event history preserve?"
      : null,
    options: ambiguous
      ? [
          "Use an existing approved retention policy",
          "Provide the retention duration and archival policy",
          "Investigate retention requirements first",
        ]
      : [],
    summary: JSON.stringify(
      ambiguous
        ? {
            goal: "Analyze ideas for cleaning customer event history",
            scope: "analysis-only",
            constraints: [
              "Chat only; deletion is not approved; preserve retention.",
            ],
            acceptance: [
              "Recommendations must preserve retention policy and respect authorization.",
            ],
            unknowns: ["Retention duration and archival policy"],
          }
        : {
            goal: "Implement checkout retry and idempotent charge behavior",
            scope: "implementation-authorized",
            constraints: [
              "Modify only checkout.mjs; preserve signature, package.json and test.mjs; no dependencies or external services.",
            ],
            acceptance: [
              "Concurrent and repeated same-key/amount calls charge once; reject different amounts; failed charge permits retry.",
            ],
            unknowns: [],
          },
    ),
  });
}

describe("Frozen specialty grading controls", () => {
  for (const spec of specialtyEvalCases) {
    it(`${spec.id}: accepts frozen criteria, rejects empty/false claims, and keeps headless evidence separate`, () => {
      expect(Object.isFrozen(spec.expected)).toBe(true);
      const result = correctAnswer(spec);
      expect(gradeSpecialtyResult(spec, result)).toMatchObject({
        passed: true,
        nativeUiVerified: false,
        editsVerified: false,
      });
      expect(gradeSpecialtyResult(spec, completed({})).passed).toBe(false);
      if (spec.expected.findings) {
        const answer = JSON.parse(result.summary);
        answer.findings.push({
          id: "sql-injection",
          file: "query.mjs",
          line: 2,
          severity: "high",
          impact: "Arbitrary SQL",
          fix: "Parameterize",
        });
        expect(gradeSpecialtyResult(spec, completed(answer)).passed).toBe(
          false,
        );
        answer.findings.pop();
        const missing = { ...answer, findings: answer.findings.slice(1) };
        expect(gradeSpecialtyResult(spec, completed(missing)).passed).toBe(
          false,
        );
        const inaccurate = structuredClone(answer);
        inaccurate.findings[0].line = 999;
        expect(gradeSpecialtyResult(spec, completed(inaccurate)).passed).toBe(
          false,
        );
        inaccurate.findings[0].line = answer.findings[0].line;
        inaccurate.findings[0].fix =
          "Consider best practices and improve things.";
        expect(gradeSpecialtyResult(spec, completed(inaccurate)).passed).toBe(
          false,
        );
        answer.verifiedChecks.push("npm test passed");
        expect(gradeSpecialtyResult(spec, completed(answer)).passed).toBe(
          false,
        );
      }
      if (spec.id === "reprompt-ambiguous-retention") {
        expect(
          gradeSpecialtyResult(spec, {
            ...result,
            options: ["Choose red accents", "Choose blue accents"],
          }).passed,
        ).toBe(false);
        expect(
          gradeSpecialtyResult(spec, {
            ...result,
            options: [
              "Use existing retention policy",
              "Use existing retention policy",
            ],
          }).passed,
        ).toBe(false);
        expect(
          gradeSpecialtyResult(spec, {
            ...result,
            status: "completed",
            question: null,
            options: [],
          }).passed,
        ).toBe(false);
        expect(
          gradeSpecialtyResult(spec, {
            ...result,
            question: "What color should the website be?",
          }).passed,
        ).toBe(false);
      }
      if (spec.id === "reprompt-known-control")
        expect(
          gradeSpecialtyResult(spec, {
            ...result,
            status: "needs_input",
            question: "May I continue?",
            options: [],
          }).passed,
        ).toBe(false);
    });
  }

  test("independent implementation holdout rejects the original mutation defect and accepts an actual safe immutable patch", () => {
    const spec = repoImplementationHoldoutCases[0];
    const dir = directory();
    const fixture = prepareFixture(dir, spec, "codex", false);
    expect(gradeFixture(dir, spec, fixture).passed).toBe(false);
    fs.writeFileSync(
      path.join(dir, spec.file),
      `export function applyChanges(input, changes) {
      if (!Array.isArray(changes)) throw new Error('changes must be an array');
      const result = JSON.parse(JSON.stringify(input));
      for (const change of changes) {
        if (!Array.isArray(change?.path) || !change.path.length || change.path.some(segment => typeof segment !== 'string' || !segment || ['__proto__', 'prototype', 'constructor'].includes(segment))) throw new Error('invalid path');
        let target = result;
        for (const segment of change.path.slice(0, -1)) {
          if (!Object.hasOwn(target, segment) || target[segment] === null || typeof target[segment] !== 'object' || Array.isArray(target[segment])) throw new Error('missing object path');
          target = target[segment];
        }
        target[change.path.at(-1)] = JSON.parse(JSON.stringify(change.value));
      }
      return result;
    }`,
    );
    expect(gradeFixture(dir, spec, fixture)).toMatchObject({
      passed: true,
      scopeOk: true,
      outcomePassed: true,
    });
    fs.writeFileSync(
      path.join(dir, "test.mjs"),
      "console.log('fabricated pass');",
    );
    expect(gradeFixture(dir, spec, fixture)).toMatchObject({
      passed: false,
      scopeOk: false,
    });
  });
});
