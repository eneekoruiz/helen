import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as outcomes from "../src/core/outcomes.js";
import { specialtyTelemetry } from "../scripts/run-specialty-evals.mjs";
import {
  importSpecialtyOutcomes,
  inspectSpecialtyReport,
  parseImportOptions,
} from "../scripts/import-specialty-outcomes.mjs";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const owned: string[] = [];
let report: string;
let cwd: string;
const actualCodexReport = path.resolve(
  ".helen/audit-results/specialty-v1-2026-10-07T22-13-07.267Z-f50e0d6e-4ec2-4ef5-b36d-8097453299b7",
);
const disabledHostNotice =
  "Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.";
const temporary = () => {
  const directory = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "helen-outcome-import-"),
  );
  owned.push(directory);
  return directory;
};
const write = (relative: string, value: string | Buffer) => {
  const file = path.join(report, ...relative.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const read = (relative: string) =>
  JSON.parse(fs.readFileSync(path.join(report, relative), "utf8"));
const manifestFingerprint = () => {
  const manifest = read("manifest.json");
  delete manifest.fingerprint;
  manifest.fingerprint = hash(json(manifest));
  write("manifest.json", json(manifest));
  const results = read("results.json");
  results.fingerprint = manifest.fingerprint;
  write("results.json", json(results));
};
const observation = (index: number, change: (value: any) => void) => {
  const results = read("results.json");
  const value = results.observations[index];
  const trace = value.trace;
  change(value);
  write(`${trace}/observation.json`, json(value));
  write("results.json", json(results));
};

function fixture(
  provider = "claude",
  states = ["completed", "completed"],
  runs = 1,
) {
  const spec = {
    id: "fixture-case",
    skill: "helen-audit",
    specialty: "audit",
    split: "acceptance",
    mode: "readonly-answer",
    allowedWrites: [],
    prompt: "Inspect supplied source",
    files: { "a.js": "source" },
    expected: { findings: [] },
  };
  const selected = JSON.stringify([spec]);
  const snapshots: Record<string, any> = {
    selectedCases: {
      sha256: hash(selected),
      bytes: Buffer.byteLength(selected),
    },
  };
  write("frozen/selected-cases.json", selected + "\n");
  const grader =
    'function gradeSpecialtyResult(spec, result) {\n  throw new Error("Evidence must never execute");\n}';
  for (const name of [
    "scripts/run-specialty-evals.mjs",
    "scripts/lib/specialtyEvalCases.mjs",
    "scripts/lib/evalSubscription.mjs",
    "dist/core/jobRuntime.js",
    "dist/core/jobTypes.js",
    "skills/helen-audit/SKILL.md",
  ]) {
    const content =
      name === "scripts/lib/specialtyEvalCases.mjs"
        ? `export ${grader}\n`
        : 'throw new Error("Frozen evidence must never execute");\n';
    write(`frozen/${name}`, content);
    snapshots[name] = {
      sha256: hash(content),
      bytes: Buffer.byteLength(content),
    };
  }
  snapshots.grader = {
    sha256: hash(grader),
    source: "scripts/lib/specialtyEvalCases.mjs",
  };
  const observations: any[] = [];
  const schedule: any[] = [];
  for (let trial = 1; trial <= runs; trial++)
    for (const [index, condition] of [
      "baseline",
      "skill-text-injection",
    ].entries()) {
      const identity = { provider, case: spec.id, trial, condition };
      schedule.push(identity);
      const status = states[index],
        eligible = status === "completed" || status === "needs_input";
      const usage =
        provider === "claude"
          ? {
              input_tokens: 10,
              cache_read_input_tokens: 20,
              cache_creation_input_tokens: 30,
              output_tokens: 40,
            }
          : { input_tokens: 60, cached_input_tokens: 20, output_tokens: 40 };
      const metrics = {
        usage,
        inputTokens: 10,
        outputTokens: 40,
        cacheReadTokens: 20,
        cacheWriteTokens: 30,
        totalTokens: 100,
        nativeDurationMs: 25,
        providerReportedCostUsd: 0.25,
        resolvedModel: provider === "claude" ? "fixture-claude" : null,
        toolEvents: [],
      };
      if (provider === "codex")
        Object.assign(metrics, { inputTokens: 60, cacheWriteTokens: null });
      const stdout =
        (provider === "claude"
          ? JSON.stringify({ type: "system", model: "fixture-claude" }) + "\n"
          : "") +
        JSON.stringify({
          type: provider === "claude" ? "result" : "turn.completed",
          usage,
          duration_ms: 25,
          total_cost_usd: 0.25,
        }) +
        "\n";
      const prompt = `Frozen prompt ${condition}`;
      const trace = `attempts/${provider}-${spec.id}-${trial}-${condition}`;
      const value = {
        ...identity,
        skill: spec.skill,
        specialty: spec.specialty,
        split: spec.split,
        status,
        eligible,
        passed: eligible ? index === 1 : null,
        grade: eligible
          ? {
              passed: index === 1,
              failures: index === 1 ? [] : ["Actual quality failure"],
              evidenceKind: "supplied-source-answer",
              nativeUiVerified: false,
              editsVerified: false,
            }
          : null,
        graderError: null,
        metrics,
        durationMs: 1000 + index * 250,
        modelCalls: 1,
        providerVersion: "native 1.0",
        versionMatches: true,
        unexpectedWrites: [],
        humanInterventions: null,
        nativeUiVerified: false,
        editsVerified: false,
        error: null,
        trace,
        promptHash: hash(prompt),
      };
      const result = {
        status,
        summary: "Frozen answer",
        question:
          status === "needs_input" ? "Which scope is authorized?" : null,
        options:
          status === "needs_input" ? ["Only supplied source", "No edits"] : [],
      };
      const runtime = {
        status,
        providerVersion: value.providerVersion,
        ...(eligible ? { result } : {}),
      };
      const invocation = {
        file: "native-provider",
        args:
          provider === "claude"
            ? ["-p", "--json-schema", "schema"]
            : [
                "exec",
                "--output-schema",
                "schema",
                "-c",
                'model="fixture-codex"',
              ],
        cwd: "owned-runtime-temp",
        inference: true,
      };
      for (const [name, content] of Object.entries({
        "observation.json": json(value),
        "runtime-outcome.json": json(runtime),
        "invocations.json": json([invocation]),
        "invocation-001.json": json(invocation),
        "prompt.txt": prompt,
        "stdout.jsonl": stdout,
        ...(eligible ? { "answer.json": json(result) } : {}),
      }))
        write(`${trace}/${name}`, content);
      observations.push(value);
    }
  const manifest = {
    version: 1,
    kind: "frozen-specialty-answer-pilot",
    live: true,
    providers: [provider],
    cases: [
      {
        id: spec.id,
        skill: spec.skill,
        specialty: spec.specialty,
        split: spec.split,
      },
    ],
    runs,
    plannedCalls: schedule.length,
    maxCalls: schedule.length,
    schedule,
    repository: {
      revision: "a".repeat(40),
      dirtyDigest: "b".repeat(64),
      dirty: false,
      dirtyFiles: [],
    },
    snapshots,
    nativeProfiles: {
      [provider]: {
        version: "native 1.0",
        executable: "native-provider",
        model: provider === "codex" ? "fixture-codex" : null,
      },
    },
  };
  const fingerprint = hash(json(manifest));
  write("manifest.json", json({ ...manifest, fingerprint }));
  write(
    "results.json",
    json({
      version: 1,
      kind: manifest.kind,
      fingerprint,
      output: report,
      plannedCalls: schedule.length,
      maxCalls: schedule.length,
      attempts: observations.length,
      calls: observations.length,
      observations,
    }),
  );
}

function currentFixture(
  provider = "codex",
  resolvedModel: string | null = null,
) {
  fixture(provider);
  const results = read("results.json");
  for (const value of results.observations) {
    const file = path.join(report, value.trace, "stdout.jsonl");
    const stdout =
      (resolvedModel === null
        ? ""
        : JSON.stringify({ type: "thread.started", model: resolvedModel }) +
          "\n") +
      fs.readFileSync(file, "utf8") +
      (provider === "codex"
        ? JSON.stringify({
            type: "item.completed",
            item: { type: "error", message: disabledHostNotice },
          }) + "\n"
        : "");
    write(`${value.trace}/stdout.jsonl`, stdout);
    value.metrics = specialtyTelemetry(stdout, provider);
    value.plannedModel = provider === "codex" ? "fixture-codex" : null;
    value.plannedModelSource =
      value.plannedModel === null ? null : "native-config-model-override";
    value.modelIdentityVerified =
      value.metrics.resolvedModel !== null &&
      value.metrics.resolvedModelSource !== null;
    write(`${value.trace}/observation.json`, json(value));
    if (provider === "codex") {
      const invocations = read(`${value.trace}/invocations.json`);
      invocations[0].args = [
        "exec",
        "--output-schema",
        "schema",
        "--model",
        "fixture-codex",
      ];
      write(`${value.trace}/invocations.json`, json(invocations));
      write(`${value.trace}/invocation-001.json`, json(invocations[0]));
    }
  }
  write("results.json", json(results));
  const name = "scripts/run-specialty-evals.mjs";
  const bytes =
    '/* Current v1 schema modelIdentityVerified: from native envelopes */\nthrow new Error("Never execute frozen evidence");\n';
  write(`frozen/${name}`, bytes);
  const manifest = read("manifest.json");
  manifest.snapshots[name] = {
    sha256: hash(bytes),
    bytes: Buffer.byteLength(bytes),
  };
  write("manifest.json", json(manifest));
  manifestFingerprint();
}

beforeEach(() => {
  report = temporary();
  cwd = temporary();
  fixture();
});
afterEach(() => {
  for (const directory of owned.splice(0)) {
    const resolved = path.resolve(directory);
    if (
      path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
      !path.basename(resolved).startsWith("helen-outcome-import-") ||
      fs.lstatSync(resolved).isSymbolicLink()
    )
      throw new Error("Unsafe fixture cleanup");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

describe("Immutable specialty outcome importer", () => {
  it("defaults to dry-run and requires an explicit recording project", () => {
    expect(parseImportOptions(["--report", report]).record).toBe(false);
    expect(() => parseImportOptions(["--record", "--report", report])).toThrow(
      "explicit --cwd",
    );
    expect(() =>
      parseImportOptions([
        "--record",
        "--dry-run",
        "--report",
        report,
        "--cwd",
        cwd,
      ]),
    ).toThrow("mutually exclusive");
    expect(() =>
      parseImportOptions(["--report", report, "--report", report]),
    ).toThrow("repeated");
    expect(() => parseImportOptions(["--live", "--report", report])).toThrow(
      "Unknown",
    );
  });
  it("validates frozen bytes without executing them and previews with no metadata writes", async () => {
    const result = await importSpecialtyOutcomes(
      { report, cwd, record: false },
      outcomes,
    );
    expect(result).toMatchObject({
      mode: "dry-run",
      observations: 2,
      imported: 0,
      wouldImport: 2,
      skipped: 0,
    });
    expect(fs.readdirSync(cwd)).toEqual([]);
    expect(result.records[0]).toMatchObject({
      inputTokens: 60,
      outputTokens: 40,
      cachedTokens: 20,
      elapsedMs: 1000,
      accepted: false,
      evaluationStatus: "completed",
      humanCorrections: null,
      humanMinutes: null,
      retries: 0,
      source: "native-runtime",
    });
    expect(result.records[1].taskDigest).toBe(result.records[0].taskDigest);
    expect(result.records[1].skillDigest).not.toBeNull();
    expect(result.records[0].skillDigest).toBeNull();
    expect(result.records[0].evidence).toContain(result.resultsSha256);
    expect(JSON.stringify(result.records)).not.toMatch(
      /costUsd|charge|savings/,
    );
  });
  it("records append-only outcomes and skips deterministic duplicate attempts", async () => {
    const first = await importSpecialtyOutcomes(
      { report, cwd, record: true },
      outcomes,
    );
    const before = fs.readFileSync(path.join(cwd, ".helen/outcomes.json"));
    const repeated = await importSpecialtyOutcomes(
      { report, cwd, record: true },
      outcomes,
    );
    expect(first.imported).toBe(2);
    expect(repeated).toMatchObject({ imported: 0, skipped: 2 });
    expect(fs.readFileSync(path.join(cwd, ".helen/outcomes.json"))).toEqual(
      before,
    );
    expect(
      outcomes.summarizeOutcomes(outcomes.readOutcomes(cwd)),
    ).toMatchObject({
      attempts: 2,
      accepted: 1,
      tokensPerAcceptedTask: 200,
      elapsedMsPerAcceptedTask: 2250,
    });
  });
  it("keeps repetitions separate so each baseline/skill trial pairs", async () => {
    fixture("claude", ["completed", "completed"], 2);
    const result = await importSpecialtyOutcomes(
      { report, cwd, record: true },
      outcomes,
    );
    expect(new Set(result.records.map((record: any) => record.id)).size).toBe(
      4,
    );
    expect(
      new Set(result.records.map((record: any) => record.runId)).size,
    ).toBe(2);
    const summary = outcomes.summarizeOutcomes(outcomes.readOutcomes(cwd));
    expect(summary.pairs).toHaveLength(2);
  });
  it("retains execution failures and their actual consumption", async () => {
    fixture("claude", ["failed", "completed"]);
    const result = await importSpecialtyOutcomes(
      { report, cwd, record: true },
      outcomes,
    );
    expect(result.records[0]).toMatchObject({
      evaluationStatus: "failed",
      accepted: false,
      inputTokens: 60,
      outputTokens: 40,
    });
    expect(
      outcomes.summarizeOutcomes(outcomes.readOutcomes(cwd)),
    ).toMatchObject({
      attempts: 2,
      accepted: 1,
      pairs: [],
      tokensPerAcceptedTask: 200,
    });
  });
  it.each([
    ["blocked", "blocked"],
    ["timed_out", "timed_out"],
    ["stopped", "blocked"],
  ])("maps %s execution honestly to %s", (state, expected) => {
    fixture("claude", [state, "completed"]);
    expect(inspectSpecialtyReport(report).records[0]).toMatchObject({
      evaluationStatus: expected,
      accepted: false,
    });
  });
  it("marks ineligible completed results invalid and preserves valid grader failures", () => {
    observation(1, (value) => {
      value.eligible = false;
      value.passed = null;
      value.unexpectedWrites = ["unexpected.js"];
    });
    const records = inspectSpecialtyReport(report).records;
    expect(records[0]).toMatchObject({
      evaluationStatus: "completed",
      accepted: false,
    });
    expect(records[1]).toMatchObject({
      evaluationStatus: "invalid",
      accepted: false,
    });
  });
  it("keeps needs_input semantics separate from evidence of human interaction", () => {
    fixture("claude", ["needs_input", "completed"]);
    expect(inspectSpecialtyReport(report).records[0]).toMatchObject({
      evaluationStatus: "completed",
      humanCorrections: null,
      humanMinutes: null,
    });
  });
  it("rejects eligible claims with a malformed native answer contract", () => {
    const trace = read("results.json").observations[0].trace;
    const runtime = read(`${trace}/runtime-outcome.json`);
    runtime.result.options = ["Unexpected completed question"];
    write(`${trace}/runtime-outcome.json`, json(runtime));
    write(`${trace}/answer.json`, json(runtime.result));
    expect(() => inspectSpecialtyReport(report)).toThrow("eligibility");
  });
  it("does not add Codex cached input twice or infer the actual model from configuration", () => {
    fixture("codex");
    expect(inspectSpecialtyReport(report).records[0]).toMatchObject({
      model: null,
      inputTokens: 60,
      outputTokens: 40,
      cachedTokens: 20,
    });
    const results = read("results.json"),
      trace = results.observations[0].trace;
    const invocations = read(`${trace}/invocations.json`);
    invocations[0].args.pop();
    invocations[0].args.pop();
    write(`${trace}/invocations.json`, json(invocations));
    write(`${trace}/invocation-001.json`, json(invocations[0]));
    expect(() => inspectSpecialtyReport(report)).toThrow("model differs");
  });
  it("accepts current native notices but keeps unknown actual models excluded from pairs", async () => {
    currentFixture();
    const result = await importSpecialtyOutcomes(
      { report, cwd, record: true },
      outcomes,
    );
    expect(result.records.every((record: any) => record.model === null)).toBe(
      true,
    );
    expect(result.records[1]).toMatchObject({
      accepted: true,
      evaluationStatus: "completed",
    });
    expect(
      outcomes.summarizeOutcomes(outcomes.readOutcomes(cwd)),
    ).toMatchObject({
      attempts: 2,
      accepted: 1,
      pairs: [],
      excludedPairGroups: 1,
    });
  });
  it("uses a native envelope model even when its resolved identity differs from the planned config", () => {
    currentFixture("codex", "actual-native-model");
    expect(
      inspectSpecialtyReport(report).records.every(
        (record: any) => record.model === "actual-native-model",
      ),
    ).toBe(true);
  });
  it.each([
    [
      (value: any) => {
        value.plannedModel = "forged-plan";
      },
      /model provenance/,
    ],
    [
      (value: any) => {
        value.plannedModelSource = "answer-text";
      },
      /model provenance/,
    ],
    [
      (value: any) => {
        value.modelIdentityVerified = true;
      },
      /model provenance/,
    ],
    [
      (value: any) => {
        value.metrics.resolvedModelSource = "answer-text";
      },
      /telemetry/,
    ],
    [
      (value: any) => {
        value.metrics.resolvedModel = "invented-from-plan";
      },
      /telemetry/,
    ],
    [
      (value: any) => {
        value.metrics.nativeNotices = [];
      },
      /telemetry/,
    ],
    [
      (value: any) => {
        delete value.metrics.nativeErrors;
      },
      /Incomplete current/,
    ],
  ])(
    "rejects inconsistent current model/notice evidence %#",
    (change, message) => {
      currentFixture();
      observation(0, change);
      expect(() => inspectSpecialtyReport(report)).toThrow(message);
    },
  );
  it("rejects conflicting native model overrides rather than guessing their effect", () => {
    currentFixture();
    const trace = read("results.json").observations[0].trace;
    const invocations = read(`${trace}/invocations.json`);
    invocations[0].args.push("-c", 'model="conflicting-config-model"');
    write(`${trace}/invocations.json`, json(invocations));
    write(`${trace}/invocation-001.json`, json(invocations[0]));
    expect(() => inspectSpecialtyReport(report)).toThrow("model differs");
  });
  it("rejects undeclared model overrides when the frozen plan has no model", () => {
    currentFixture();
    const manifest = read("manifest.json");
    manifest.nativeProfiles.codex.model = null;
    write("manifest.json", json(manifest));
    for (const index of [0, 1])
      observation(index, (value) => {
        value.plannedModel = null;
        value.plannedModelSource = null;
      });
    manifestFingerprint();
    expect(() => inspectSpecialtyReport(report)).toThrow("model differs");
  });
  it("requires current provenance fields when the frozen runner declares them", () => {
    currentFixture();
    observation(0, (value) => {
      delete value.plannedModel;
      delete value.plannedModelSource;
      delete value.modelIdentityVerified;
      delete value.metrics.resolvedModelSource;
      delete value.metrics.nativeNotices;
      delete value.metrics.nativeErrors;
    });
    expect(() => inspectSpecialtyReport(report)).toThrow("Incomplete current");
  });
  it("does not treat arbitrary native errors as harmless notices", () => {
    currentFixture();
    const trace = read("results.json").observations[0].trace;
    const stdout =
      fs.readFileSync(path.join(report, trace, "stdout.jsonl"), "utf8") +
      JSON.stringify({
        type: "item.completed",
        item: { type: "error", message: "Actual native failure" },
      }) +
      "\n";
    write(`${trace}/stdout.jsonl`, stdout);
    observation(0, (value) => {
      value.metrics = specialtyTelemetry(stdout, "codex");
    });
    expect(() => inspectSpecialtyReport(report)).toThrow("eligibility");
    observation(0, (value) => {
      value.eligible = false;
      value.passed = null;
    });
    expect(inspectSpecialtyReport(report).records[0]).toMatchObject({
      evaluationStatus: "invalid",
      accepted: false,
      model: null,
    });
  });
  it.skipIf(!fs.existsSync(path.join(actualCodexReport, "results.json")))(
    "dry-runs the original Codex pilot without inventing its model or mutating evidence",
    async () => {
      const original = fs.readFileSync(
        path.join(actualCodexReport, "results.json"),
      );
      const result = await importSpecialtyOutcomes(
        { report: actualCodexReport, cwd, record: false },
        outcomes,
      );
      expect(result).toMatchObject({
        mode: "dry-run",
        observations: 6,
        wouldImport: 6,
        imported: 0,
      });
      expect(
        result.records.every(
          (record: any) => record.provider === "codex" && record.model === null,
        ),
      ).toBe(true);
      const summary = outcomes.summarizeOutcomes(
        result.records.map((record: any) => ({
          ...record,
          recordedAt: "2026-10-08T00:00:00.000Z",
        })),
      );
      expect(summary).toMatchObject({
        attempts: 6,
        pairs: [],
        excludedPairGroups: 3,
      });
      expect(fs.readdirSync(cwd)).toEqual([]);
      expect(
        fs.readFileSync(path.join(actualCodexReport, "results.json")),
      ).toEqual(original);
    },
  );
  it("preserves unknown telemetry/model as null and unknown failed version explicitly", () => {
    fixture("claude", ["failed", "completed"]);
    const results = read("results.json"),
      trace = results.observations[0].trace;
    write(`${trace}/stdout.jsonl`, "");
    const runtime = read(`${trace}/runtime-outcome.json`);
    delete runtime.providerVersion;
    write(`${trace}/runtime-outcome.json`, json(runtime));
    observation(0, (value) => {
      value.providerVersion = null;
      value.versionMatches = false;
      value.metrics = {
        usage: null,
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        totalTokens: null,
        nativeDurationMs: null,
        providerReportedCostUsd: null,
        resolvedModel: null,
        toolEvents: [],
      };
    });
    expect(inspectSpecialtyReport(report).records[0]).toMatchObject({
      providerVersion: "unknown",
      model: null,
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
    });
  });
  it("uses null normalized Claude input if any cache component is missing", () => {
    const results = read("results.json"),
      value = results.observations[0];
    const usage = {
      input_tokens: 10,
      output_tokens: 40,
      cache_read_input_tokens: 20,
    };
    write(
      `${value.trace}/stdout.jsonl`,
      JSON.stringify({ type: "system", model: "fixture-claude" }) +
        "\n" +
        JSON.stringify({
          type: "result",
          usage,
          duration_ms: 25,
          total_cost_usd: 0.25,
        }) +
        "\n",
    );
    observation(0, (item) => {
      item.metrics.usage = usage;
      item.metrics.cacheWriteTokens = null;
      item.metrics.totalTokens = null;
    });
    expect(inspectSpecialtyReport(report).records[0].inputTokens).toBeNull();
  });
  it.each([
    "scripts/run-specialty-evals.mjs",
    "scripts/lib/specialtyEvalCases.mjs",
    "scripts/lib/evalSubscription.mjs",
    "dist/core/jobRuntime.js",
    "dist/core/jobTypes.js",
    "skills/helen-audit/SKILL.md",
    "selected-cases.json",
  ])(
    "rejects tampered frozen %s before creating project metadata",
    async (name) => {
      fs.appendFileSync(path.join(report, "frozen", name), "tamper");
      await expect(
        importSpecialtyOutcomes({ report, cwd, record: true }, outcomes),
      ).rejects.toThrow(/snapshot mismatch/);
      expect(fs.readdirSync(cwd)).toEqual([]);
    },
  );
  it("rejects forged grader digest even when the overall manifest hash is recomputed", () => {
    const manifest = read("manifest.json");
    manifest.snapshots.grader.sha256 = "c".repeat(64);
    write("manifest.json", json(manifest));
    manifestFingerprint();
    expect(() => inspectSpecialtyReport(report)).toThrow(
      "grader function digest mismatch",
    );
  });
  it("rejects manifest/report fingerprint divergence", () => {
    const results = read("results.json");
    results.fingerprint = "c".repeat(64);
    write("results.json", json(results));
    expect(() => inspectSpecialtyReport(report)).toThrow(
      "fingerprint mismatch",
    );
  });
  it.each([
    [
      (value: any) => {
        value.trial = 2;
      },
      /identity/,
    ],
    [
      (value: any) => {
        value.trace = "../../outside";
      },
      /trace/,
    ],
    [
      (value: any) => {
        value.source = "reported";
      },
      /Unexpected observation/,
    ],
    [
      (value: any) => {
        value.providerVersion = "changed";
      },
      /version claim/,
    ],
    [
      (value: any) => {
        value.metrics.inputTokens = 999;
      },
      /telemetry/,
    ],
    [
      (value: any) => {
        value.modelCalls = 0;
      },
      /Model-call count/,
    ],
    [
      (value: any) => {
        value.passed = true;
      },
      /eligibility/,
    ],
    [
      (value: any) => {
        value.durationMs = -1;
      },
      /state/,
    ],
  ])("rejects inconsistent per-attempt evidence %#", (change, message) => {
    observation(0, change);
    expect(() => inspectSpecialtyReport(report)).toThrow(message);
  });
  it("rejects report rows that differ from their immutable trace", () => {
    const results = read("results.json");
    results.observations[0].durationMs++;
    write("results.json", json(results));
    expect(() => inspectSpecialtyReport(report)).toThrow(
      "observation mismatch",
    );
  });
  it("rejects duplicate source observations instead of collapsing them", () => {
    const results = read("results.json");
    results.observations[1] = results.observations[0];
    write("results.json", json(results));
    expect(() => inspectSpecialtyReport(report)).toThrow(
      "duplicate observation",
    );
  });
  it("rejects an existing deterministic ID with conflicting values without overwriting", async () => {
    await importSpecialtyOutcomes({ report, cwd, record: true }, outcomes);
    observation(0, (value) => {
      value.durationMs++;
    });
    const before = fs.readFileSync(path.join(cwd, ".helen/outcomes.json"));
    await expect(
      importSpecialtyOutcomes({ report, cwd, record: true }, outcomes),
    ).rejects.toThrow("conflicts");
    expect(fs.readFileSync(path.join(cwd, ".helen/outcomes.json"))).toEqual(
      before,
    );
  });
  it("validates every observation before the first write", async () => {
    observation(1, (value) => {
      value.durationMs = Number.MAX_SAFE_INTEGER + 1;
    });
    await expect(
      importSpecialtyOutcomes({ report, cwd, record: true }, outcomes),
    ).rejects.toThrow();
    expect(fs.readdirSync(cwd)).toEqual([]);
  });
  it("rejects oversized evidence files before parsing", () => {
    write("results.json", Buffer.alloc(8 * 1024 * 1024 + 1));
    expect(() => inspectSpecialtyReport(report)).toThrow("oversized");
  });
  it("rejects directory/junction escapes and leaves outside files intact", () => {
    const outside = temporary(),
      trace = read("results.json").observations[0].trace;
    fs.writeFileSync(path.join(outside, "sentinel"), "keep");
    const target = path.join(report, trace);
    expect(path.resolve(target).startsWith(report + path.sep)).toBe(true);
    fs.rmSync(target, { recursive: true });
    fs.symlinkSync(outside, target, "junction");
    expect(() => inspectSpecialtyReport(report)).toThrow(/Unsafe directory/);
    expect(fs.readFileSync(path.join(outside, "sentinel"), "utf8")).toBe(
      "keep",
    );
    fs.unlinkSync(target);
  });
  it("rejects non-regular evidence entries and symlinked snapshots", () => {
    const target = path.join(report, "frozen/dist/core/jobRuntime.js");
    fs.unlinkSync(target);
    fs.mkdirSync(target);
    expect(() => inspectSpecialtyReport(report)).toThrow("Unsafe or oversized");
  });
});
