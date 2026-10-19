import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseSpecialtyOptions,
  buildSpecialtyPrompt,
  specialtyPlan,
  specialtyTelemetry,
  pairSpecialtyObservations,
  restrictSpecialtyArguments,
  specialtyCodexConfigurationArguments,
  verifySpecialtyCodexConfiguration,
  runSpecialtyEvaluations,
} from "../scripts/run-specialty-evals.mjs";
import { specialtyEvalCases } from "../scripts/lib/specialtyEvalCases.mjs";

const profile = {
  version: "native-test 1.0",
  executable: "test-provider",
  helpHash: "test-help",
  disableSlashCommands: true,
  model: null,
  windowsSandbox: null,
  disabledSkillPaths: ["C:/native/skills/helen-audit"],
};
const disabledHostNotice =
  "Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.";
const answer = {
  status: "completed",
  question: null,
  options: [],
  summary: JSON.stringify({
    goal: "Implement checkout retry and idempotent charge behavior",
    scope: "implementation-authorized",
    constraints: [
      "Modify only checkout.mjs; preserve signature, package.json and test.mjs; no dependencies or external services.",
    ],
    acceptance: [
      "Concurrent and repeated same-key/amount calls charge once; reject different amounts; failed charge permits retry.",
    ],
    unknowns: [],
  }),
};

describe("Frozen specialty evaluation execution", () => {
  it("preserves native MCP transport definitions and verifies every effective disable before inference", () => {
    const args = restrictSpecialtyArguments(
      "codex",
      [
        "exec",
        "--sandbox",
        "read-only",
        "--disable",
        "shell_tool",
        "-c",
        'forced_login_method="chatgpt"',
        "-c",
        "mcp_servers={}",
        "-c",
        "mcp_servers.node_repl.enabled=false",
        "--output-schema",
        "schema",
      ],
      { ...profile, model: "native-model" },
    );
    const configuration = specialtyCodexConfigurationArguments(args);
    expect(configuration).toContain("mcp_servers.node_repl.enabled=false");
    expect(configuration).toContain("mcp_servers={}");
    expect(configuration).toContain("shell_tool");
    expect(configuration).toContain('forced_login_method="chatgpt"');
    expect(configuration).toContain('model="native-model"');
    expect(configuration.slice(-3)).toEqual(["mcp", "list", "--json"]);
    expect(args).not.toContain("--ignore-user-config");
    const list = vi.fn(() => ({
      status: 0,
      stdout: JSON.stringify([
        {
          name: "node_repl",
          enabled: false,
          env: { SECRET: "must-not-retain" },
        },
      ]),
    }));
    const receipt = verifySpecialtyCodexConfiguration(
      "codex",
      args,
      { cwd: os.tmpdir(), env: {} },
      list,
    );
    expect(receipt).toMatchObject({
      verifiedAllDisabled: true,
      servers: [{ name: "node_repl", enabled: false }],
    });
    expect(JSON.stringify(receipt)).not.toContain("must-not-retain");
    expect(list).toHaveBeenCalledWith(
      "codex",
      configuration,
      expect.objectContaining({ shell: false, timeout: 15000 }),
    );
    for (const result of [
      { status: 1, stdout: "", stderr: "invalid transport" },
      {
        status: 0,
        stdout: JSON.stringify([{ name: "node_repl", enabled: true }]),
      },
      { status: 0, stdout: "malformed" },
    ])
      expect(() =>
        verifySpecialtyCodexConfiguration("codex", args, {}, () => result),
      ).toThrow("No model launch");
  });

  it("defaults to a zero-call dry run and counterbalances conditions without contacting providers", async () => {
    const nativeProfile = vi.fn();
    const createJobRuntime = vi.fn();
    const result = await runSpecialtyEvaluations([], {
      nativeProfile,
      runtimeModule: { createJobRuntime },
    });
    expect(result).toMatchObject({
      version: 1,
      live: false,
      calls: 0,
      attempts: 0,
      plannedCalls: 24,
      nativeUiVerified: false,
      humanInterventions: null,
    });
    expect(nativeProfile).not.toHaveBeenCalled();
    expect(createJobRuntime).not.toHaveBeenCalled();
    expect(
      result.schedule
        .slice(0, 4)
        .map((item: { condition: string }) => item.condition),
    ).toEqual([
      "baseline",
      "skill-text-injection",
      "skill-text-injection",
      "baseline",
    ]);
  });

  it("fails closed on missing billing confirmations, malformed options, and unbounded budgets", () => {
    expect(() => parseSpecialtyOptions(["--live"])).toThrow(
      "--subscription-only",
    );
    expect(() =>
      parseSpecialtyOptions([
        "--live",
        "--subscription-only",
        "--max-calls",
        "2",
      ]),
    ).toThrow("--codex-credits-unavailable");
    expect(() =>
      parseSpecialtyOptions([
        "--live",
        "--subscription-only",
        "--max-calls",
        "2",
        "--codex-credits-unavailable",
      ]),
    ).toThrow("--claude-extra-usage-disabled");
    for (const argv of [
      ["--max-calls", "Infinity"],
      ["--max-calls", "201"],
      ["--runs", "-1"],
      ["--providers", "codex,codex"],
      ["--cases", "absent"],
      ["--runs"],
      ["--live", "--dry-run"],
      ["--model", "paid-api"],
      ["--runs", "1", "--runs", "2"],
    ])
      expect(() => parseSpecialtyOptions(argv)).toThrow();
    expect(
      parseSpecialtyOptions([
        "--live",
        "--providers",
        "claude",
        "--subscription-only",
        "--claude-extra-usage-disabled",
        "--max-calls",
        "2",
      ]).live,
    ).toBe(true);
  });

  it("shares literal sources and task constraints while keeping expectations out of both prompts", () => {
    const spec = specialtyEvalCases[0];
    const baseline = buildSpecialtyPrompt(spec);
    const injected = buildSpecialtyPrompt(
      spec,
      "Exact skill\r\nbytes retained.",
    );
    expect(baseline).toContain(spec.prompt);
    expect(injected).toContain(spec.prompt);
    expect(baseline).toContain(JSON.stringify(spec.files));
    expect(injected).toContain(JSON.stringify(spec.files));
    expect(injected).toContain("Exact skill\r\nbytes retained.");
    expect(baseline).not.toContain(JSON.stringify(spec.expected));
    expect(injected).not.toContain(JSON.stringify(spec.expected));
    expect(injected).toContain("not native skill activation");
    expect(() =>
      buildSpecialtyPrompt({ ...spec, allowedWrites: ["file"] }),
    ).toThrow("readonly");
    const options = parseSpecialtyOptions([
      "--cases",
      "reprompt-known-control",
      "--providers",
      "codex",
    ]);
    expect(specialtyPlan(options).plannedCalls).toBe(2);
  });

  it("strengthens execution flags while retaining native auth, sandbox and permission restrictions", () => {
    const codex = [
      "exec",
      "--sandbox",
      "read-only",
      "-c",
      'forced_login_method="chatgpt"',
      "--output-schema",
      "schema",
      "-",
    ];
    const isolated = restrictSpecialtyArguments("codex", codex, profile);
    expect(isolated).not.toContain("--ignore-user-config");
    expect(isolated).toContain("--skip-git-repo-check");
    expect(isolated).toContain("read-only");
    expect(isolated).toContain('forced_login_method="chatgpt"');
    expect(isolated.join(" ")).toContain("enabled=false");
    expect(isolated.join(" ")).not.toMatch(
      /ignore-rules|bypass|danger-full-access/,
    );
    expect(
      restrictSpecialtyArguments("codex", ["login", "status"], profile),
    ).toEqual(["login", "status"]);
    const claude = [
      "--safe-mode",
      "--restricted",
      "-p",
      "--tools",
      "Read,Glob",
      "--allowedTools",
      "Read,Glob",
      "--permission-mode",
      "dontAsk",
      "--json-schema",
      "schema",
    ];
    const toolDisabled = restrictSpecialtyArguments("claude", claude, profile);
    expect(toolDisabled[toolDisabled.indexOf("--tools") + 1]).toBe("");
    expect(toolDisabled[toolDisabled.indexOf("--allowedTools") + 1]).toBe("");
    expect(toolDisabled).toContain("--safe-mode");
    expect(toolDisabled).toContain("--restricted");
    expect(toolDisabled).toContain("dontAsk");
  });

  it("uses exposed native telemetry and never infers missing consumption, cost or native forms", () => {
    expect(specialtyTelemetry("", "codex")).toMatchObject({
      usage: null,
      totalTokens: null,
      nativeDurationMs: null,
      providerReportedCostUsd: null,
    });
    const codex = specialtyTelemetry(
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 100,
          cached_input_tokens: 80,
          output_tokens: 10,
        },
      }),
      "codex",
    );
    expect(codex.totalTokens).toBe(110);
    const claude = specialtyTelemetry(
      JSON.stringify({
        type: "result",
        usage: {
          input_tokens: 100,
          output_tokens: 10,
          cache_read_input_tokens: 80,
          cache_creation_input_tokens: 20,
        },
        duration_ms: 23,
      }),
      "claude",
    );
    expect(claude).toMatchObject({ totalTokens: 210, nativeDurationMs: 23 });
    expect(
      specialtyTelemetry(
        JSON.stringify({
          type: "result",
          usage: { input_tokens: 10, output_tokens: 2 },
        }),
        "claude",
      ).totalTokens,
    ).toBeNull();
    expect(
      specialtyTelemetry(
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "tool_use", name: "Read" }] },
        }),
        "claude",
      ).toolEvents,
    ).toHaveLength(1);
    expect(
      specialtyTelemetry(
        JSON.stringify({
          type: "assistant",
          message: {
            content: [{ type: "tool_use", name: "StructuredOutput" }],
          },
        }),
        "claude",
      ).toolEvents,
    ).toHaveLength(0);
  });

  it("separates the exact disabled-host startup notice from tools and keeps all other native errors invalid", () => {
    const notice = {
      type: "item.completed",
      item: { id: "item_0", type: "error", message: disabledHostNotice },
    };
    const completion = {
      type: "turn.completed",
      usage: {
        input_tokens: 11435,
        output_tokens: 765,
        cache_write_input_tokens: 0,
      },
    };
    const metrics = specialtyTelemetry(
      [notice, completion].map((event) => JSON.stringify(event)).join("\n"),
      "codex",
    );
    expect(metrics).toMatchObject({
      totalTokens: 12200,
      cacheWriteTokens: 0,
      resolvedModel: null,
      resolvedModelSource: null,
      toolEvents: [],
      nativeErrors: [],
      nativeNotices: [{ code: "disabled-code-mode-host" }],
    });
    for (const event of [
      {
        ...notice,
        item: {
          ...notice.item,
          message: "Permission denied by managed policy",
        },
      },
      {
        ...notice,
        item: {
          ...notice.item,
          message: disabledHostNotice + " Permission denied",
        },
      },
      { type: "error", message: disabledHostNotice },
      { type: "turn.failed", error: "quota exhausted" },
    ]) {
      const invalid = specialtyTelemetry(JSON.stringify(event), "codex");
      expect(invalid.nativeErrors).toHaveLength(1);
      expect(invalid.nativeNotices).toHaveLength(0);
    }
    const tool = {
      type: "item.completed",
      item: { type: "command_execution", command: "forbidden read" },
    };
    expect(
      specialtyTelemetry(
        [notice, tool].map((event) => JSON.stringify(event)).join("\n"),
        "codex",
      ).toolEvents,
    ).toHaveLength(1);
  });

  it("uses model identity from native envelopes and never from answer text or planned configuration", () => {
    expect(
      specialtyTelemetry(
        JSON.stringify({
          type: "item.completed",
          item: {
            type: "agent_message",
            text: "I am model planned-only",
            model: "invented",
          },
        }),
        "codex",
      ),
    ).toMatchObject({ resolvedModel: null, resolvedModelSource: null });
    expect(
      specialtyTelemetry(
        JSON.stringify({ type: "system", model: "claude-native-model" }),
        "claude",
      ),
    ).toMatchObject({
      resolvedModel: "claude-native-model",
      resolvedModelSource: "native-jsonl:system.model",
    });
    expect(
      specialtyTelemetry(
        JSON.stringify({
          type: "turn.completed",
          model: "codex-native-model",
          usage: {},
        }),
        "codex",
      ),
    ).toMatchObject({
      resolvedModel: "codex-native-model",
      resolvedModelSource: "native-jsonl:turn.completed.model",
    });
  });

  it("excludes blocked, failed and invalid pairs and reports a tie as no measured improvement", () => {
    const common = {
      provider: "codex",
      case: "case",
      trial: 1,
      metrics: {
        resolvedModel: "actual-native-model",
        resolvedModelSource: "native-jsonl:turn.completed.model",
      },
    };
    const baseline = {
      ...common,
      condition: "baseline",
      eligible: true,
      passed: true,
    };
    const skill = {
      ...common,
      condition: "skill-text-injection",
      eligible: true,
      passed: true,
    };
    expect(
      pairSpecialtyObservations([
        baseline,
        { ...skill, eligible: false, passed: null },
      ]),
    ).toMatchObject({ eligiblePairs: 0, descriptiveDelta: null });
    expect(pairSpecialtyObservations([baseline, skill])).toMatchObject({
      eligiblePairs: 1,
      descriptiveDelta: 0,
      conclusion: expect.stringContaining("No measured improvement"),
    });
    expect(
      pairSpecialtyObservations([baseline, { ...skill, passed: false }])
        .descriptiveDelta,
    ).toBe(-1);
    expect(
      pairSpecialtyObservations([
        baseline,
        {
          ...skill,
          metrics: { resolvedModel: null, resolvedModelSource: null },
        },
      ]),
    ).toMatchObject({
      eligiblePairs: 0,
      excludedPairs: [{ reason: "unknown-actual-model" }],
    });
    expect(
      pairSpecialtyObservations([
        baseline,
        {
          ...skill,
          metrics: { ...common.metrics, resolvedModel: "another-native-model" },
        },
      ]),
    ).toMatchObject({
      eligiblePairs: 0,
      excludedPairs: [{ reason: "different-actual-models" }],
    });
    expect(
      pairSpecialtyObservations([
        baseline,
        {
          ...skill,
          plannedModel: "actual-native-model",
          metrics: { resolvedModel: null, resolvedModelSource: null },
        },
      ]).eligiblePairs,
    ).toBe(0);
  });

  it("retains immutable raw evidence, freezes versions/content, and obeys the exact invocation cap without live models", async () => {
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-specialty-test-"),
    );
    const output = path.join(outputRoot, "evidence");
    const providerSpawn = vi.fn(() => ({}));
    let traceModel: string | null = "actual-native-model";
    let nativeMessage = disabledHostNotice;
    let resultAnswer = answer;
    const dependencies = {
      nativeProfile: vi.fn(() => ({ ...profile, model: "planned-only-model" })),
      verifyCodexConfiguration: vi.fn(() => ({
        verifiedAllDisabled: true,
        servers: [{ name: "node_repl", enabled: false }],
      })),
      spawn: providerSpawn,
      runtimeModule: {
        subscriptionEnvironment: () => ({}),
        createJobRuntime:
          (overrides: { spawn: (...args: unknown[]) => unknown }) =>
          async (request: { directory: string; cwd: string }) => {
            overrides.spawn(
              "test-codex",
              ["exec", "--sandbox", "read-only", "--output-schema", "schema"],
              { cwd: request.cwd },
            );
            fs.writeFileSync(
              path.join(request.directory, "stdout.jsonl"),
              [
                {
                  type: "item.completed",
                  item: { type: "error", message: nativeMessage },
                },
                {
                  type: "turn.completed",
                  ...(traceModel ? { model: traceModel } : {}),
                  usage: { input_tokens: 12, output_tokens: 8 },
                },
              ]
                .map((event) => JSON.stringify(event))
                .join("\n") + "\n",
              { flag: "wx" },
            );
            return {
              status: "completed",
              result: resultAnswer,
              providerVersion: profile.version,
            };
          },
      },
    };
    const argv = [
      "--live",
      "--subscription-only",
      "--providers",
      "codex",
      "--codex-credits-unavailable",
      "--cases",
      "reprompt-known-control",
      "--max-calls",
      "2",
      "--output",
      output,
    ];
    try {
      const report = await runSpecialtyEvaluations(argv, dependencies);
      expect(report).toMatchObject({
        calls: 2,
        attempts: 2,
        status: "pilot-completed",
        nativeUiVerified: false,
        humanInterventions: null,
      });
      expect(providerSpawn).toHaveBeenCalledTimes(2);
      expect(report.comparison).toMatchObject({
        eligiblePairs: 1,
        descriptiveDelta: 0,
      });
      expect(dependencies.verifyCodexConfiguration).toHaveBeenCalledTimes(2);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(output, "manifest.json"), "utf8"),
      );
      expect(manifest.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.repository.dirtyDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.nativeProfiles.codex.version).toBe(profile.version);
      expect(manifest.snapshots.grader.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(
        manifest.snapshots["scripts/run-specialty-evals.mjs"].sha256,
      ).toMatch(/^[a-f0-9]{64}$/);
      for (const observation of report.observations) {
        const directory = path.join(output, observation.trace);
        expect(
          JSON.parse(
            fs.readFileSync(path.join(directory, "answer.json"), "utf8"),
          ),
        ).toEqual(answer);
        expect(fs.existsSync(path.join(directory, "invocation-001.json"))).toBe(
          true,
        );
        expect(observation.metrics.totalTokens).toBe(20);
        expect(observation).toMatchObject({
          eligible: true,
          plannedModel: "planned-only-model",
          modelIdentityVerified: true,
          metrics: { resolvedModel: "actual-native-model", nativeErrors: [] },
        });
      }
      const frozenBefore = fs.readFileSync(
        path.join(output, "results.json"),
        "utf8",
      );
      await expect(runSpecialtyEvaluations(argv, dependencies)).rejects.toThrow(
        "Output already exists",
      );
      expect(fs.readFileSync(path.join(output, "results.json"), "utf8")).toBe(
        frozenBefore,
      );
      const capped = await runSpecialtyEvaluations(
        [...argv.slice(0, -2), "--output", path.join(outputRoot, "capped")].map(
          (value, index, array) =>
            array[index - 1] === "--max-calls" ? "1" : value,
        ),
        dependencies,
      );
      expect(capped).toMatchObject({
        calls: 1,
        attempts: 1,
        status: "incomplete-or-blocked",
      });
      expect(capped.comparison.eligiblePairs).toBe(0);
      traceModel = null;
      resultAnswer = { ...answer, summary: "{}" };
      const noticeWithUnknownModel = await runSpecialtyEvaluations(
        [
          ...argv.slice(0, -2),
          "--output",
          path.join(outputRoot, "notice-unknown-model"),
        ],
        dependencies,
      );
      expect(noticeWithUnknownModel).toMatchObject({
        calls: 2,
        attempts: 2,
        status: "pilot-completed",
      });
      expect(noticeWithUnknownModel.observations).toHaveLength(2);
      for (const observation of noticeWithUnknownModel.observations)
        expect(observation).toMatchObject({
          eligible: true,
          passed: false,
          plannedModel: "planned-only-model",
          modelIdentityVerified: false,
          metrics: { resolvedModel: null, nativeErrors: [] },
        });
      expect(noticeWithUnknownModel.comparison).toMatchObject({
        eligiblePairs: 0,
        descriptiveDelta: null,
        excludedPairs: [{ reason: "unknown-actual-model" }],
      });
      nativeMessage = "Managed policy denied an operation";
      const nativeFailure = await runSpecialtyEvaluations(
        [
          ...argv.slice(0, -2),
          "--output",
          path.join(outputRoot, "native-error"),
        ],
        dependencies,
      );
      expect(nativeFailure).toMatchObject({
        calls: 1,
        attempts: 1,
        status: "incomplete-or-blocked",
      });
      expect(nativeFailure.observations[0]).toMatchObject({
        eligible: false,
        passed: null,
      });
      const launchesBefore = providerSpawn.mock.calls.length;
      const invalidConfiguration = await runSpecialtyEvaluations(
        [
          ...argv.slice(0, -2),
          "--output",
          path.join(outputRoot, "invalid-config"),
        ],
        {
          ...dependencies,
          verifyCodexConfiguration: () => {
            throw new Error("Invalid native MCP transport; no model launch");
          },
        },
      );
      expect(invalidConfiguration).toMatchObject({
        calls: 0,
        attempts: 1,
        status: "incomplete-or-blocked",
      });
      expect(invalidConfiguration.comparison.eligiblePairs).toBe(0);
      expect(providerSpawn.mock.calls.length).toBe(launchesBefore);
    } finally {
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("stops a provider after a native blocker without retrying or claiming a failed grade", async () => {
    const outputRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-specialty-blocked-test-"),
    );
    const runtime = vi.fn(async () => ({
      status: "blocked",
      error: "Included subscription quota exhausted",
      providerVersion: profile.version,
    }));
    try {
      const report = await runSpecialtyEvaluations(
        [
          "--live",
          "--subscription-only",
          "--providers",
          "codex",
          "--codex-credits-unavailable",
          "--cases",
          "reprompt-known-control",
          "--max-calls",
          "2",
          "--output",
          path.join(outputRoot, "evidence"),
        ],
        {
          nativeProfile: () => profile,
          runtimeModule: {
            subscriptionEnvironment: () => ({}),
            createJobRuntime: () => runtime,
          },
        },
      );
      expect(runtime).toHaveBeenCalledTimes(1);
      expect(report).toMatchObject({
        calls: 0,
        attempts: 1,
        status: "incomplete-or-blocked",
      });
      expect(report.observations[0]).toMatchObject({
        eligible: false,
        passed: null,
        grade: null,
      });
      expect(report.comparison.eligiblePairs).toBe(0);
    } finally {
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});
