#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { specialtyTelemetry } from "./run-specialty-evals.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 64 * 1024 * 1024;
const kind = "frozen-specialty-answer-pilot";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const label = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 200;
const slug = (value) =>
  typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,100}$/.test(value);
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const count = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max;
const validAnswer = (value) =>
  object(value) &&
  Object.keys(value).length === 4 &&
  Object.keys(value).every((key) =>
    ["status", "summary", "question", "options"].includes(key),
  ) &&
  ["completed", "needs_input", "failed"].includes(value.status) &&
  typeof value.summary === "string" &&
  value.summary.trim().length > 0 &&
  value.summary.trim().length <= 24000 &&
  (value.question === null ||
    (typeof value.question === "string" &&
      value.question.trim().length <= 4000)) &&
  Array.isArray(value.options) &&
  value.options.length <= 4 &&
  value.options.every(
    (option) =>
      typeof option === "string" &&
      option.trim().length > 0 &&
      option.trim().length <= 500,
  ) &&
  (value.status === "needs_input"
    ? Boolean(value.question?.trim())
    : value.question === null && value.options.length === 0);
const keys = (value, allowed, name) => {
  assert(
    object(value) && Object.keys(value).every((key) => allowed.includes(key)),
    `Unexpected ${name} fields`,
  );
};

function safeDirectory(directory) {
  const resolved = path.resolve(directory);
  let current = path.parse(resolved).root;
  for (const component of resolved
    .slice(current.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, component);
    const stat = fs.lstatSync(current);
    assert(
      stat.isDirectory() && !stat.isSymbolicLink(),
      `Unsafe directory: ${current}`,
    );
  }
  assert(
    path.resolve(fs.realpathSync(resolved)).toLowerCase() ===
      resolved.toLowerCase(),
    "Directory escapes its declared location",
  );
  return resolved;
}

function reader(directory) {
  const base = safeDirectory(directory);
  const cache = new Map();
  let total = 0;
  const scoped = (relative) => {
    assert(
      typeof relative === "string" &&
        relative.length < 500 &&
        relative
          .split("/")
          .every(
            (part) =>
              /^[a-zA-Z0-9_.-]+$/.test(part) && ![".", ".."].includes(part),
          ),
      "Unsafe report path",
    );
    const target = path.resolve(base, ...relative.split("/"));
    assert(
      path.relative(base, target) &&
        !path.relative(base, target).startsWith("..") &&
        !path.isAbsolute(path.relative(base, target)),
      "Report path escapes scope",
    );
    safeDirectory(path.dirname(target));
    return target;
  };
  const read = (relative) => {
    if (cache.has(relative)) return cache.get(relative);
    const target = scoped(relative);
    const before = fs.lstatSync(target);
    assert(
      before.isFile() && !before.isSymbolicLink() && before.size <= MAX_FILE,
      `Unsafe or oversized report file: ${relative}`,
    );
    const fd = fs.openSync(
      target,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    try {
      const opened = fs.fstatSync(fd);
      assert(
        opened.isFile() &&
          opened.ino === before.ino &&
          opened.dev === before.dev &&
          opened.size <= MAX_FILE,
        `Report file changed: ${relative}`,
      );
      total += opened.size;
      assert(total <= MAX_TOTAL, "Report exceeds total read budget");
      // Read at most the validated size, including one byte to detect concurrent growth.
      const bytes = Buffer.alloc(opened.size + 1);
      let length = 0;
      while (length < bytes.length) {
        const next = fs.readSync(
          fd,
          bytes,
          length,
          bytes.length - length,
          null,
        );
        if (!next) break;
        length += next;
      }
      const after = fs.fstatSync(fd);
      assert(
        length === opened.size &&
          after.size === opened.size &&
          after.mtimeMs === opened.mtimeMs,
        `Report file changed while reading: ${relative}`,
      );
      const result = bytes.subarray(0, length);
      cache.set(relative, result);
      return result;
    } finally {
      fs.closeSync(fd);
    }
  };
  return {
    base,
    read,
    parse: (relative) => JSON.parse(read(relative).toString("utf8")),
    scoped,
  };
}

function stableId(identity) {
  const bytes = createHash("sha256")
    .update(JSON.stringify(identity))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 0x50;
  bytes[8] = (bytes[8] & 63) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function invocationModels(args) {
  const models = [];
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (["--model", "-m"].includes(option)) {
      assert(index + 1 < args.length, "Missing native model argument");
      models.push(args[++index]);
    } else if (["-c", "--config"].includes(option)) {
      assert(index + 1 < args.length, "Missing native config argument");
      const assignment = args[++index];
      if (typeof assignment === "string" && /^\s*model\s*=/.test(assignment)) {
        const value = JSON.parse(assignment.replace(/^\s*model\s*=\s*/, ""));
        assert(
          typeof value === "string",
          "Invalid native model config argument",
        );
        models.push(value);
      }
    }
  }
  return models;
}

// The original v1 reports predate model provenance and native notice fields.
// Preserve their exact format; current reports use the runner's pure parser.
function legacyTelemetry(stdout, provider) {
  const events = stdout.split(/\r?\n/).flatMap((line) => {
    try {
      const value = JSON.parse(line);
      return object(value) ? [value] : [];
    } catch {
      return [];
    }
  });
  const terminal = events.findLast(
    (event) =>
      event.type === (provider === "codex" ? "turn.completed" : "result"),
  );
  const usage = terminal?.usage ?? null;
  assert(usage === null || object(usage), "Invalid native usage");
  const known = (value) =>
    Number.isFinite(value) && value >= 0 ? value : null;
  const inputTokens = known(usage?.input_tokens),
    outputTokens = known(usage?.output_tokens);
  const cacheReadTokens = known(
    usage?.cache_read_input_tokens ?? usage?.cached_input_tokens,
  );
  const cacheWriteTokens = known(usage?.cache_creation_input_tokens);
  const toolEvents = events
    .flatMap((event) => {
      assert(
        event.message?.content === undefined ||
          Array.isArray(event.message.content),
        "Invalid native event content",
      );
      return [
        ...(event.message?.content ?? []).filter(
          (block) =>
            block?.type === "tool_use" && block.name !== "StructuredOutput",
        ),
        ...(event.item &&
        !["agent_message", "reasoning"].includes(event.item.type) &&
        typeof event.type === "string" &&
        event.type.startsWith("item.")
          ? [event.item]
          : []),
      ];
    })
    .map((event) => ({ type: event.type, name: event.name ?? null }));
  return {
    usage,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens:
      inputTokens === null ||
      outputTokens === null ||
      (provider === "claude" &&
        (cacheReadTokens === null || cacheWriteTokens === null))
        ? null
        : inputTokens +
          outputTokens +
          (provider === "claude" ? cacheReadTokens + cacheWriteTokens : 0),
    nativeDurationMs: known(terminal?.duration_ms),
    providerReportedCostUsd: known(terminal?.total_cost_usd),
    resolvedModel:
      events.find(
        (event) => event.type === "system" && typeof event.model === "string",
      )?.model ?? null,
    toolEvents,
  };
}

export function inspectSpecialtyReport(directory) {
  const files = reader(directory);
  const manifest = files.parse("manifest.json"),
    report = files.parse("results.json");
  assert(object(manifest) && object(report), "Invalid report or manifest");
  assert(
    manifest.version === 1 &&
      report.version === 1 &&
      manifest.kind === kind &&
      report.kind === kind &&
      manifest.live === true,
    "Unsupported specialty report",
  );
  const { fingerprint, ...unsigned } = manifest;
  assert(
    digest(fingerprint) &&
      hash(json(unsigned)) === fingerprint &&
      report.fingerprint === fingerprint,
    "Manifest/report fingerprint mismatch",
  );
  assert(
    !("source" in manifest) && !("source" in report),
    "Unexpected source claim",
  );
  assert(
    object(manifest.repository) &&
      typeof manifest.repository.revision === "string" &&
      /^[a-f0-9]{40,64}$/.test(manifest.repository.revision) &&
      digest(manifest.repository.dirtyDigest) &&
      typeof manifest.repository.dirty === "boolean" &&
      Array.isArray(manifest.repository.dirtyFiles),
    "Invalid frozen repository identity",
  );
  assert(
    count(manifest.runs, 20) &&
      manifest.runs > 0 &&
      count(manifest.maxCalls, 200),
    "Invalid frozen run budget",
  );
  assert(
    Array.isArray(manifest.providers) &&
      manifest.providers.length > 0 &&
      manifest.providers.every((provider) =>
        ["codex", "claude"].includes(provider),
      ) &&
      new Set(manifest.providers).size === manifest.providers.length,
    "Invalid frozen providers",
  );
  const snapshots = manifest.snapshots;
  assert(
    object(snapshots) &&
      digest(snapshots.selectedCases?.sha256) &&
      count(snapshots.selectedCases?.bytes, MAX_FILE),
    "Invalid selected-cases snapshot",
  );
  const selectedBytes = files.read("frozen/selected-cases.json");
  assert(
    selectedBytes.at(-1) === 10 &&
      selectedBytes.length === snapshots.selectedCases.bytes + 1 &&
      hash(selectedBytes.subarray(0, -1)) === snapshots.selectedCases.sha256,
    "Selected-cases snapshot mismatch",
  );
  const cases = JSON.parse(selectedBytes.toString("utf8"));
  assert(
    Array.isArray(cases) &&
      cases.length > 0 &&
      cases.length <= 32 &&
      cases.every(
        (spec) =>
          object(spec) &&
          slug(spec.id) &&
          slug(spec.skill) &&
          label(spec.specialty) &&
          label(spec.split) &&
          spec.mode === "readonly-answer" &&
          Array.isArray(spec.allowedWrites) &&
          spec.allowedWrites.length === 0,
      ) &&
      new Set(cases.map((spec) => spec.id)).size === cases.length,
    "Invalid frozen cases",
  );
  assert(
    same(
      manifest.cases,
      cases.map(({ id, skill, specialty, split }) => ({
        id,
        skill,
        specialty,
        split,
      })),
    ),
    "Manifest cases differ from frozen cases",
  );
  const frozenFiles = [
    "scripts/run-specialty-evals.mjs",
    "scripts/lib/specialtyEvalCases.mjs",
    "scripts/lib/evalSubscription.mjs",
    "dist/core/jobRuntime.js",
    "dist/core/jobTypes.js",
    ...new Set(cases.map((spec) => `skills/${spec.skill}/SKILL.md`)),
  ];
  assert(
    Object.keys(snapshots).length === frozenFiles.length + 2 &&
      Object.keys(snapshots).every((key) =>
        ["selectedCases", "grader", ...frozenFiles].includes(key),
      ),
    "Unexpected frozen snapshot inventory",
  );
  for (const name of frozenFiles) {
    const snapshot = snapshots[name],
      bytes = files.read(`frozen/${name}`);
    assert(
      object(snapshot) &&
        digest(snapshot.sha256) &&
        snapshot.bytes === bytes.length &&
        hash(bytes) === snapshot.sha256,
      `Frozen snapshot mismatch: ${name}`,
    );
  }
  const declaresModelProvenance = /\bmodelIdentityVerified\s*:/.test(
    files.read("frozen/scripts/run-specialty-evals.mjs").toString("utf8"),
  );
  assert(
    snapshots.grader?.source === "scripts/lib/specialtyEvalCases.mjs" &&
      digest(snapshots.grader.sha256),
    "Invalid grader snapshot",
  );
  // v1 stores Function.toString(), not a separate module. Extract only text;
  // importing or evaluating evidence would execute caller-controlled code.
  const graderSource = files
    .read(`frozen/${snapshots.grader.source}`)
    .toString("utf8");
  const declarations = [
    ...graderSource.matchAll(/^export function gradeSpecialtyResult\(/gm),
  ];
  assert(declarations.length === 1, "Unsupported frozen grader declaration");
  const start = declarations[0].index + "export ".length;
  const end = graderSource.indexOf("\n}", start);
  assert(
    end > start &&
      hash(graderSource.slice(start, end + 2)) === snapshots.grader.sha256,
    "Frozen grader function digest mismatch",
  );
  assert(
    Array.isArray(manifest.schedule) && manifest.schedule.length <= 200,
    "Invalid frozen schedule",
  );
  const scheduled = new Map();
  for (const entry of manifest.schedule) {
    keys(entry, ["provider", "case", "trial", "condition"], "schedule");
    assert(
      manifest.providers.includes(entry.provider) &&
        cases.some((spec) => spec.id === entry.case) &&
        count(entry.trial, manifest.runs) &&
        entry.trial > 0 &&
        ["baseline", "skill-text-injection"].includes(entry.condition),
      "Invalid scheduled identity",
    );
    const identity = JSON.stringify([
      entry.provider,
      entry.case,
      entry.trial,
      entry.condition,
    ]);
    assert(!scheduled.has(identity), "Duplicate scheduled condition");
    scheduled.set(identity, entry);
  }
  const planned = manifest.providers.length * cases.length * manifest.runs * 2;
  assert(
    planned === scheduled.size &&
      manifest.plannedCalls === planned &&
      report.plannedCalls === planned &&
      report.maxCalls === manifest.maxCalls,
    "Frozen schedule/count mismatch",
  );
  assert(
    Array.isArray(report.observations) &&
      report.observations.length <= 200 &&
      report.attempts === report.observations.length &&
      count(report.calls, manifest.maxCalls) &&
      report.attempts <= manifest.maxCalls,
    "Invalid observed attempt counts",
  );
  assert(object(manifest.nativeProfiles), "Missing native profiles");
  const identities = new Set(),
    records = [];
  let calls = 0;
  for (const observation of report.observations) {
    keys(
      observation,
      [
        "provider",
        "case",
        "trial",
        "condition",
        "skill",
        "specialty",
        "split",
        "status",
        "eligible",
        "passed",
        "grade",
        "graderError",
        "metrics",
        "plannedModel",
        "plannedModelSource",
        "modelIdentityVerified",
        "durationMs",
        "modelCalls",
        "providerVersion",
        "versionMatches",
        "unexpectedWrites",
        "humanInterventions",
        "nativeUiVerified",
        "editsVerified",
        "error",
        "trace",
        "promptHash",
      ],
      "observation",
    );
    const identity = [
      observation.provider,
      observation.case,
      observation.trial,
      observation.condition,
    ];
    const identityKey = JSON.stringify(identity);
    assert(
      scheduled.has(identityKey) && !identities.has(identityKey),
      "Unexpected or duplicate observation identity",
    );
    identities.add(identityKey);
    const spec = cases.find((item) => item.id === observation.case),
      profile = manifest.nativeProfiles[observation.provider];
    assert(
      object(profile) &&
        label(profile.version) &&
        typeof profile.executable === "string" &&
        (profile.model === null || label(profile.model)),
      "Invalid frozen native profile",
    );
    assert(
      observation.skill === spec.skill &&
        observation.specialty === spec.specialty &&
        observation.split === spec.split,
      "Observation differs from frozen case",
    );
    assert(
      [
        "completed",
        "needs_input",
        "blocked",
        "failed",
        "stopped",
        "timed_out",
      ].includes(observation.status) &&
        typeof observation.eligible === "boolean" &&
        count(observation.durationMs) &&
        count(observation.modelCalls, 1) &&
        Array.isArray(observation.unexpectedWrites),
      "Invalid observation state",
    );
    assert(
      observation.providerVersion === null ||
        label(observation.providerVersion),
      "Invalid observed provider version",
    );
    assert(
      observation.versionMatches ===
        (observation.providerVersion === profile.version),
      "Inconsistent provider version claim",
    );
    const trace = `attempts/${observation.provider}-${spec.id}-${observation.trial}-${observation.condition}`;
    assert(
      observation.trace === trace && digest(observation.promptHash),
      "Unexpected observation trace",
    );
    safeDirectory(files.scoped(trace));
    const entries = fs.readdirSync(files.scoped(trace));
    assert(entries.length <= 100, "Attempt trace has too many files");
    for (const entry of entries) files.read(`${trace}/${entry}`);
    assert(
      same(files.parse(`${trace}/observation.json`), observation),
      "Report/trace observation mismatch",
    );
    assert(
      hash(files.read(`${trace}/prompt.txt`)) === observation.promptHash,
      "Prompt hash mismatch",
    );
    const outcome = files.parse(`${trace}/runtime-outcome.json`);
    assert(
      object(outcome) &&
        outcome.status === observation.status &&
        (outcome.providerVersion ?? null) === observation.providerVersion &&
        (outcome.error ?? null) === observation.error,
      "Runtime outcome mismatch",
    );
    if (outcome.result)
      assert(
        same(files.parse(`${trace}/answer.json`), outcome.result),
        "Runtime answer mismatch",
      );
    const invocations = files.parse(`${trace}/invocations.json`);
    assert(
      Array.isArray(invocations) && invocations.length <= 80,
      "Invalid invocation receipts",
    );
    for (let index = 0; index < invocations.length; index++) {
      const invocation = invocations[index];
      keys(invocation, ["file", "args", "cwd", "inference"], "invocation");
      assert(
        typeof invocation.file === "string" &&
          typeof invocation.cwd === "string" &&
          typeof invocation.inference === "boolean" &&
          Array.isArray(invocation.args) &&
          invocation.args.length <= 500 &&
          invocation.args.every((arg) => typeof arg === "string"),
        "Invalid invocation receipt",
      );
      assert(
        same(
          files.parse(
            `${trace}/invocation-${String(index + 1).padStart(3, "0")}.json`,
          ),
          invocation,
        ),
        "Invocation receipt mismatch",
      );
      if (invocation.inference) {
        assert(
          invocation.file === profile.executable,
          "Native executable differs from frozen profile",
        );
        assert(
          observation.provider === "codex"
            ? invocation.args[0] === "exec" &&
                invocation.args.includes("--output-schema")
            : invocation.args.includes("-p") &&
                invocation.args.includes("--json-schema"),
          "Invalid native inference receipt",
        );
        if (observation.provider === "codex") {
          const models = invocationModels(invocation.args);
          assert(
            (profile.model === null
              ? models.length === 0
              : models.length > 0) &&
              models.every((model) => model === profile.model),
            "Frozen model differs from invocation",
          );
        }
      }
    }
    assert(
      invocations.filter((invocation) => invocation.inference).length ===
        observation.modelCalls,
      "Model-call count differs from receipts",
    );
    calls += observation.modelCalls;
    const modelFields = [
      "plannedModel",
      "plannedModelSource",
      "modelIdentityVerified",
    ];
    const extendedMetrics = [
      "resolvedModelSource",
      "nativeNotices",
      "nativeErrors",
    ];
    const currentSchema =
      declaresModelProvenance ||
      modelFields.some((field) => field in observation) ||
      (object(observation.metrics) &&
        extendedMetrics.some((field) => field in observation.metrics));
    if (currentSchema)
      assert(
        modelFields.every((field) => field in observation) &&
          object(observation.metrics) &&
          extendedMetrics.every((field) => field in observation.metrics),
        "Incomplete current model provenance/telemetry schema",
      );
    const actual = (currentSchema ? specialtyTelemetry : legacyTelemetry)(
      entries.includes("stdout.jsonl")
        ? files.read(`${trace}/stdout.jsonl`).toString("utf8")
        : "",
      observation.provider,
    );
    assert(
      same(actual, observation.metrics),
      "Native telemetry differs from report",
    );
    for (const field of [
      "inputTokens",
      "outputTokens",
      "cacheReadTokens",
      "cacheWriteTokens",
    ])
      assert(
        actual[field] === null || count(actual[field]),
        "Invalid token telemetry",
      );
    assert(
      actual.resolvedModel === null || label(actual.resolvedModel),
      "Invalid observed model",
    );
    if (currentSchema)
      assert(
        observation.plannedModel === profile.model &&
          observation.plannedModelSource ===
            (profile.model ? "native-config-model-override" : null) &&
          observation.modelIdentityVerified ===
            (actual.resolvedModel !== null &&
              actual.resolvedModelSource !== null),
        "Inconsistent planned/observed model provenance",
      );
    if (observation.grade !== null) {
      keys(
        observation.grade,
        [
          "passed",
          "failures",
          "evidenceKind",
          "nativeUiVerified",
          "editsVerified",
        ],
        "grade",
      );
      assert(
        typeof observation.grade.passed === "boolean" &&
          Array.isArray(observation.grade.failures) &&
          observation.grade.failures.every(
            (failure) => typeof failure === "string",
          ) &&
          observation.grade.passed ===
            (observation.grade.failures.length === 0) &&
          observation.grade.evidenceKind === "supplied-source-answer",
        "Invalid frozen grade result",
      );
    }
    assert(
      observation.humanInterventions === null &&
        observation.nativeUiVerified === false &&
        observation.editsVerified === false,
      "Unexpected human/UI/edit evidence claim",
    );
    assert(
      observation.eligible
        ? ["completed", "needs_input"].includes(observation.status) &&
            observation.grade !== null &&
            observation.grade.failures[0] !== "Invalid HELEN result contract" &&
            observation.graderError === null &&
            observation.passed === observation.grade.passed &&
            observation.versionMatches &&
            !actual.toolEvents.length &&
            (!currentSchema || !actual.nativeErrors.length) &&
            !observation.unexpectedWrites.length &&
            observation.modelCalls === 1 &&
            outcome.result?.status === outcome.status &&
            validAnswer(outcome.result)
        : observation.passed === null,
      "Inconsistent eligibility/acceptance claim",
    );
    const inputTokens =
      observation.provider === "claude"
        ? [
            actual.inputTokens,
            actual.cacheReadTokens,
            actual.cacheWriteTokens,
          ].some((value) => value === null)
          ? null
          : actual.inputTokens +
            actual.cacheReadTokens +
            actual.cacheWriteTokens
        : actual.inputTokens;
    assert(
      inputTokens === null || count(inputTokens),
      "Normalized input token overflow",
    );
    const evaluationStatus = observation.eligible
      ? "completed"
      : ["completed", "needs_input"].includes(observation.status)
        ? "invalid"
        : observation.status === "stopped"
          ? "blocked"
          : observation.status;
    records.push({
      id: stableId([fingerprint, ...identity]),
      runId: `specialty:${fingerprint}:trial:${observation.trial}`,
      caseId: spec.id,
      provider: observation.provider,
      providerVersion: observation.providerVersion ?? "unknown",
      model: actual.resolvedModel,
      condition: observation.condition === "baseline" ? "baseline" : "skill",
      evaluationStatus,
      skill: observation.condition === "baseline" ? null : spec.skill,
      skillDigest:
        observation.condition === "baseline"
          ? null
          : snapshots[`skills/${spec.skill}/SKILL.md`].sha256,
      taskDigest: hash(JSON.stringify(spec)),
      graderDigest: snapshots.grader.sha256,
      repositoryFingerprint: hash(JSON.stringify(manifest.repository)),
      accepted: observation.eligible && observation.passed === true,
      elapsedMs: observation.durationMs,
      inputTokens,
      outputTokens: actual.outputTokens,
      cachedTokens: actual.cacheReadTokens,
      retries: 0,
      humanCorrections: null,
      humanMinutes: null,
      evidence: `${path.join(files.base, "results.json")}#${identityKey}; sha256=${hash(files.read("results.json"))}; trace=${path.join(files.base, ...trace.split("/"))}`,
      source: "native-runtime",
    });
  }
  assert(calls === report.calls, "Report call total differs from attempts");
  return {
    report: files.base,
    fingerprint,
    resultsSha256: hash(files.read("results.json")),
    records,
  };
}

export function parseImportOptions(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    assert(
      ["--dry-run", "--record", "--report", "--cwd"].includes(key) &&
        !(key in parsed),
      `Unknown or repeated option: ${key}`,
    );
    if (["--dry-run", "--record"].includes(key)) parsed[key] = true;
    else {
      assert(
        argv[index + 1] && !argv[index + 1].startsWith("--"),
        `Missing value: ${key}`,
      );
      parsed[key] = argv[++index];
    }
  }
  assert(parsed["--report"], "--report <directory> is required");
  assert(
    !(parsed["--record"] && parsed["--dry-run"]),
    "--record and --dry-run are mutually exclusive",
  );
  assert(
    !parsed["--record"] || parsed["--cwd"],
    "Recording requires explicit --cwd <project>",
  );
  return {
    report: path.resolve(parsed["--report"]),
    cwd: parsed["--cwd"] ? path.resolve(parsed["--cwd"]) : null,
    record: Boolean(parsed["--record"]),
  };
}

export async function importSpecialtyOutcomes(options, api) {
  assert(
    !options.record || options.cwd,
    "Recording requires explicit --cwd <project>",
  );
  const inspected = inspectSpecialtyReport(options.report);
  const outcomes =
    api ??
    (await import(
      pathToFileURL(path.join(root, "dist/core/outcomes.js")).href
    ));
  const records = inspected.records.map((record) =>
    outcomes.outcomeInput.parse(record),
  );
  const cwd = options.cwd ? safeDirectory(options.cwd) : null;
  const existing = cwd ? outcomes.readOutcomes(cwd) : [];
  const byId = new Map(
    existing.map(({ recordedAt: _recordedAt, ...record }) => [
      record.id,
      record,
    ]),
  );
  const pending = [];
  let skipped = 0;
  for (const record of records) {
    if (!byId.has(record.id)) pending.push(record);
    else {
      const prior = byId.get(record.id);
      assert(
        Object.keys(record).length === Object.keys(prior).length &&
          Object.keys(record).every((key) => same(record[key], prior[key])),
        `Existing outcome conflicts with immutable attempt: ${record.id}`,
      );
      skipped++;
    }
  }
  assert(
    existing.length + pending.length <= 10000,
    "Import would exceed outcome record bound",
  );
  assert(
    Buffer.byteLength(
      json({
        schemaVersion: 1,
        records: [
          ...existing,
          ...pending.map((record) => ({
            ...record,
            recordedAt: new Date().toISOString(),
          })),
        ],
      }),
    ) <= MAX_FILE,
    "Import would exceed outcome storage bound",
  );
  if (options.record)
    for (const record of pending) outcomes.recordOutcome(cwd, record);
  return {
    mode: options.record ? "record" : "dry-run",
    report: inspected.report,
    fingerprint: inspected.fingerprint,
    resultsSha256: inspected.resultsSha256,
    observations: records.length,
    imported: options.record ? pending.length : 0,
    wouldImport: options.record ? 0 : pending.length,
    skipped,
    records,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  Promise.resolve()
    .then(() =>
      importSpecialtyOutcomes(parseImportOptions(process.argv.slice(2))),
    )
    .then((result) => process.stdout.write(json(result)))
    .catch((error) => {
      console.error(`Specialty import failed: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
