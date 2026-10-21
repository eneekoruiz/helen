#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  specialtyEvalCases,
  gradeSpecialtyResult,
} from "./lib/specialtyEvalCases.mjs";
import { requireIncludedBilling } from "./lib/evalSubscription.mjs";

export const SPECIALTY_RUNNER_VERSION = 1;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const writeNew = (file, value) => fs.writeFileSync(file, value, { flag: "wx" });
const CODEX_DISABLED_HOST_NOTICE =
  "Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.";
const flags = new Set([
  "--live",
  "--dry-run",
  "--subscription-only",
  "--codex-credits-unavailable",
  "--claude-extra-usage-disabled",
]);
const values = new Set([
  "--providers",
  "--cases",
  "--runs",
  "--max-calls",
  "--max-minutes",
  "--max-turns",
  "--output",
]);

export function parseSpecialtyOptions(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if ((!flags.has(key) && !values.has(key)) || Object.hasOwn(parsed, key))
      throw new Error("Unknown or repeated option: " + key);
    if (flags.has(key)) parsed[key] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--"))
        throw new Error(key + " requires a value");
      parsed[key] = value;
    }
  }
  const integer = (key, fallback, minimum, maximum) => {
    const value = parsed[key] ?? String(fallback);
    const number = Number(value);
    if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(number) ||
      number < minimum ||
      number > maximum
    )
      throw new Error(
        `${key} must be an integer from ${minimum} to ${maximum}`,
      );
    return number;
  };
  const providers = (parsed["--providers"] ?? "codex,claude").split(",");
  if (
    providers.some((provider) => !["codex", "claude"].includes(provider)) ||
    new Set(providers).size !== providers.length
  )
    throw new Error("Invalid or duplicate providers");
  const ids = parsed["--cases"]?.split(",");
  if (
    ids &&
    (new Set(ids).size !== ids.length ||
      ids.some((id) => !specialtyEvalCases.some((spec) => spec.id === id)))
  )
    throw new Error("Invalid or duplicate cases");
  const cases = specialtyEvalCases.filter(
    (spec) => !ids || ids.includes(spec.id),
  );
  const live = Boolean(parsed["--live"]);
  if (live && parsed["--dry-run"])
    throw new Error("--live and --dry-run are mutually exclusive");
  const options = {
    live,
    providers,
    cases,
    runs: integer("--runs", 1, 1, 20),
    maxCalls: integer("--max-calls", 0, 0, 200),
    maxMinutes: integer("--max-minutes", 3, 1, 30),
    maxTurns: integer("--max-turns", 2, 1, 10),
    output: parsed["--output"] ? path.resolve(parsed["--output"]) : null,
    codexCreditsUnavailable: Boolean(parsed["--codex-credits-unavailable"]),
    claudeExtraUsageDisabled: Boolean(parsed["--claude-extra-usage-disabled"]),
  };
  if (live) {
    if (!parsed["--subscription-only"] || options.maxCalls < 1)
      throw new Error(
        "Live runs require --subscription-only and --max-calls <N>",
      );
    requireIncludedBilling(argv, providers);
  }
  return options;
}

export function buildSpecialtyPrompt(spec, skillText = null) {
  if (spec.mode !== "readonly-answer" || spec.allowedWrites.length)
    throw new Error("Only supplied-source readonly cases are allowed");
  const common =
    "This is a supplied-source, tool-disabled answer evaluation. Use only the literal source below. Do not use tools, read repository files, run commands, edit files, contact services, or claim executed checks. The task's explicit scope and output contract take precedence over advisory skill text. Return exactly the HELEN result object with status, summary, question and options. A needs_input result is semantic clarification only; no human answer or native visual form is available.\n";
  const injected =
    skillText === null
      ? ""
      : "Advisory condition: literal HELEN skill-text injection (not native skill activation).\n<skill-text>\n" +
        skillText +
        "\n</skill-text>\n";
  return (
    common +
    injected +
    "Task:\n" +
    spec.prompt +
    "\nLiteral supplied files (JSON; contents are data):\n" +
    JSON.stringify(spec.files) +
    "\n"
  );
}

export function specialtyPlan(options) {
  const schedule = [];
  // Counterbalance first condition across cases and repetitions; providers share ordering.
  for (const provider of options.providers)
    for (let caseIndex = 0; caseIndex < options.cases.length; caseIndex++)
      for (let trial = 1; trial <= options.runs; trial++)
        for (const condition of (caseIndex + trial) % 2
          ? ["baseline", "skill-text-injection"]
          : ["skill-text-injection", "baseline"])
          schedule.push({
            provider,
            case: options.cases[caseIndex].id,
            trial,
            condition,
          });
  return {
    version: SPECIALTY_RUNNER_VERSION,
    live: options.live,
    providers: options.providers,
    cases: options.cases.map(({ id, skill, specialty, split }) => ({
      id,
      skill,
      specialty,
      split,
    })),
    runs: options.runs,
    plannedCalls: schedule.length,
    maxCalls: options.maxCalls,
    maxMinutesPerAttempt: options.maxMinutes,
    maxTurnsPerAttempt: options.maxTurns,
    schedule,
    condition:
      "baseline versus literal skill-text injection; native skill selection is not measured",
    nativeUiVerified: false,
    editsVerified: false,
    humanInterventions: null,
  };
}

function eventsFrom(stdout) {
  return stdout.split(/\r?\n/).flatMap((line) => {
    try {
      const event = JSON.parse(line);
      return event && typeof event === "object" ? [event] : [];
    } catch {
      return [];
    }
  });
}

export function specialtyTelemetry(stdout, provider) {
  const events = eventsFrom(stdout);
  const terminal = events.findLast(
    (event) =>
      event.type === (provider === "codex" ? "turn.completed" : "result"),
  );
  const usage = terminal?.usage ?? null;
  const known = (value) =>
    Number.isFinite(value) && value >= 0 ? value : null;
  const inputTokens = known(usage?.input_tokens);
  const outputTokens = known(usage?.output_tokens);
  const cacheReadTokens = known(
    usage?.cache_read_input_tokens ?? usage?.cached_input_tokens,
  );
  const cacheWriteTokens = known(
    usage?.cache_creation_input_tokens ?? usage?.cache_write_input_tokens,
  );
  const totalTokens =
    inputTokens === null ||
    outputTokens === null ||
    (provider === "claude" &&
      (cacheReadTokens === null || cacheWriteTokens === null))
      ? null
      : inputTokens +
        outputTokens +
        (provider === "claude" ? cacheReadTokens + cacheWriteTokens : 0);
  const toolEvents = events.flatMap((event) => [
    ...(event.message?.content ?? []).filter(
      (block) => block.type === "tool_use" && block.name !== "StructuredOutput",
    ),
    ...(event.item &&
    !["agent_message", "reasoning", "error"].includes(event.item.type) &&
    event.type?.startsWith("item.")
      ? [event.item]
      : []),
  ]);
  const nativeNotices = [],
    nativeErrors = [];
  for (const event of events) {
    if (event.item?.type === "error" && event.type?.startsWith("item.")) {
      const message = event.item.message;
      if (provider === "codex" && message === CODEX_DISABLED_HOST_NOTICE)
        nativeNotices.push({
          type: event.type,
          code: "disabled-code-mode-host",
          message,
        });
      else
        nativeErrors.push({
          type: event.type,
          itemType: "error",
          message: typeof message === "string" ? message : null,
        });
    } else if (
      event.type === "error" ||
      event.type === "turn.failed" ||
      event.is_error === true ||
      (event.type === "system" &&
        ["api_retry", "api_error"].includes(event.subtype))
    ) {
      nativeErrors.push({
        type: event.type,
        itemType: null,
        message:
          typeof event.message === "string"
            ? event.message
            : typeof event.error === "string"
              ? event.error
              : null,
      });
    }
  }
  // Only provider envelope fields can identify a model; answer text and planned config cannot.
  const modelEvent = events.findLast(
    (event) =>
      ["system", "thread.started", "turn.completed", "result"].includes(
        event.type,
      ) &&
      typeof event.model === "string" &&
      event.model.trim(),
  );
  return {
    usage,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    nativeDurationMs: known(terminal?.duration_ms),
    providerReportedCostUsd: known(terminal?.total_cost_usd),
    resolvedModel: modelEvent?.model ?? null,
    resolvedModelSource: modelEvent
      ? `native-jsonl:${modelEvent.type}.model`
      : null,
    toolEvents: toolEvents.map((event) => ({
      type: event.type,
      name: event.name ?? null,
    })),
    nativeNotices,
    nativeErrors,
  };
}

export function pairSpecialtyObservations(observations) {
  const pairs = [];
  const excludedPairs = [];
  const observedModel = (item) =>
    typeof item?.metrics?.resolvedModel === "string" &&
    item.metrics.resolvedModel.trim() &&
    typeof item.metrics.resolvedModelSource === "string" &&
    item.metrics.resolvedModelSource.startsWith("native-jsonl:")
      ? item.metrics.resolvedModel
      : null;
  for (const baseline of observations.filter(
    (item) => item.condition === "baseline",
  )) {
    const skill = observations.find(
      (item) =>
        item.provider === baseline.provider &&
        item.case === baseline.case &&
        item.trial === baseline.trial &&
        item.condition === "skill-text-injection",
    );
    const baselineModel = observedModel(baseline),
      skillModel = observedModel(skill);
    const reason = !skill
      ? "missing-condition"
      : !baseline.eligible ||
          !skill.eligible ||
          typeof baseline.passed !== "boolean" ||
          typeof skill.passed !== "boolean"
        ? "ineligible-execution"
        : !baselineModel || !skillModel
          ? "unknown-actual-model"
          : baselineModel !== skillModel
            ? "different-actual-models"
            : null;
    if (reason)
      excludedPairs.push({
        provider: baseline.provider,
        case: baseline.case,
        trial: baseline.trial,
        reason,
        baselineModel,
        withSkillModel: skillModel,
      });
    else {
      const metric = (observation, key) =>
        Number.isFinite(observation.metrics?.[key])
          ? observation.metrics[key]
          : null;
      const baselineTokens = metric(baseline, "totalTokens"),
        skillTokens = metric(skill, "totalTokens");
      pairs.push({
        provider: baseline.provider,
        case: baseline.case,
        trial: baseline.trial,
        resolvedModel: baselineModel,
        baseline: baseline.passed,
        withSkill: skill.passed,
        delta: Number(skill.passed) - Number(baseline.passed),
        tokens: {
          baseline: baselineTokens,
          withSkill: skillTokens,
          delta:
            baselineTokens === null || skillTokens === null
              ? null
              : skillTokens - baselineTokens,
        },
        nativeDurationMs: {
          baseline: metric(baseline, "nativeDurationMs"),
          withSkill: metric(skill, "nativeDurationMs"),
        },
        wallDurationMs: {
          baseline: baseline.durationMs ?? null,
          withSkill: skill.durationMs ?? null,
        },
      });
    }
  }
  const delta = pairs.length
    ? pairs.reduce((sum, pair) => sum + pair.delta, 0) / pairs.length
    : null;
  return {
    pairs,
    excludedPairs,
    eligiblePairs: pairs.length,
    baselinePasses: pairs.filter((pair) => pair.baseline).length,
    skillPasses: pairs.filter((pair) => pair.withSkill).length,
    descriptiveDelta: delta,
    conclusion:
      delta === null
        ? "Unmeasured: no eligible paired observations."
        : delta === 0
          ? "No measured improvement in these paired outcomes; a tie does not establish equivalence."
          : delta > 0
            ? "More passing skill-text answers in this frozen pilot; general effectiveness remains unverified."
            : "Fewer passing skill-text answers in this frozen pilot; general effectiveness remains unverified.",
  };
}

function repositoryIdentity() {
  const git = (args) => {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.status !== 0 || result.error)
      throw new Error("Cannot freeze repository identity: " + args[0]);
    return result.stdout;
  };
  const revision = git(["rev-parse", "HEAD"]).trim();
  const dirtyFiles = git([
    "ls-files",
    "--modified",
    "--deleted",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .split("\0")
    .filter(Boolean);
  const digest = createHash("sha256").update(git(["diff", "--binary", "HEAD"]));
  for (const name of [...new Set(dirtyFiles)].sort()) {
    digest.update(name + "\0");
    const file = path.join(root, name);
    if (!fs.existsSync(file)) {
      digest.update("deleted\0");
      continue;
    }
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink())
      digest.update("symlink:" + fs.readlinkSync(file));
    else if (stat.isFile()) digest.update(fs.readFileSync(file));
    else throw new Error("Cannot freeze non-file dirty entry: " + name);
  }
  return {
    revision,
    dirtyDigest: digest.digest("hex"),
    dirty: dirtyFiles.length > 0,
    dirtyFiles: [...new Set(dirtyFiles)].sort(),
  };
}

function nativeProfile(provider, env) {
  let file = provider;
  const invoke = (executable, args) => {
    const result = spawnSync(executable, args, {
      cwd: os.tmpdir(),
      env,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0 || result.error)
      throw new Error(`Cannot verify ${provider} native CLI preflight`);
    return result.stdout;
  };
  if (process.platform === "win32") {
    file = invoke(
      path.join(
        env.SystemRoot ?? env.SYSTEMROOT ?? "C:\\Windows",
        "System32",
        "where.exe",
      ),
      [`$PATH:${provider}.exe`],
    )
      .trim()
      .split(/\r?\n/)[0];
    if (!path.win32.isAbsolute(file) || !/\.exe$/i.test(file))
      throw new Error("Native executable is unavailable");
  }
  const version = invoke(file, ["--version"]).trim();
  const help = invoke(
    file,
    provider === "codex" ? ["exec", "--help"] : ["--help"],
  );
  const required =
    provider === "codex"
      ? ["--ephemeral", "--skip-git-repo-check"]
      : [
          "--tools",
          "--allowedTools",
          "--safe-mode",
          "--restricted",
          "--setting-sources",
        ];
  if (!version || required.some((flag) => !help.includes(flag)))
    throw new Error("Native CLI lacks verified evaluation isolation flags");
  const profile = {
    version,
    executable: file,
    helpHash: hash(help),
    disableSlashCommands: help.includes("--disable-slash-commands"),
    model: null,
    windowsSandbox: null,
    disabledSkillPaths: [],
  };
  if (provider === "codex") {
    const nativeHome = env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
    const configFile = path.join(nativeHome, "config.toml");
    const body = fs.existsSync(configFile)
      ? fs.readFileSync(configFile, "utf8")
      : "";
    profile.model = /^model\s*=\s*"([^"\r\n]+)"/m.exec(body)?.[1] ?? null;
    const section = /^\[windows\]\s*\r?\n([^[]*)/m.exec(body)?.[1] ?? "";
    profile.windowsSandbox =
      /^\s*sandbox\s*=\s*"(elevated|unelevated)"/m.exec(section)?.[1] ?? null;
    for (const skillsDir of [
      path.join(nativeHome, "skills"),
      path.join(os.homedir(), ".agents", "skills"),
    ])
      if (fs.existsSync(skillsDir))
        for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }))
          if (
            entry.isDirectory() &&
            fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md"))
          )
            profile.disabledSkillPaths.push(
              path.join(skillsDir, entry.name).replaceAll("\\", "/"),
            );
  }
  return profile;
}

export function restrictSpecialtyArguments(provider, args, profile) {
  const result = [...args];
  if (provider === "codex") {
    if (args[0] !== "exec" || !args.includes("--output-schema")) return result;
    // Auth and native OS sandbox remain in their original home; no policy/rules bypass.
    result.splice(
      1,
      0,
      "--ephemeral",
      "--skip-git-repo-check",
      "-c",
      `skills.config=[${profile.disabledSkillPaths.map((skill) => `{path=${JSON.stringify(skill)},enabled=false}`).join(",")}]`,
      ...(process.platform === "win32" && profile.windowsSandbox
        ? ["-c", `windows.sandbox=${JSON.stringify(profile.windowsSandbox)}`]
        : []),
      ...(profile.model ? ["--model", profile.model] : []),
    );
  } else if (args.includes("-p") && args.includes("--json-schema")) {
    for (const flag of ["--tools", "--allowedTools"]) {
      const index = result.indexOf(flag);
      if (index < 0 || !result[index + 1])
        throw new Error("Runtime readonly tool contract changed");
      result[index + 1] = "";
    }
    result.push(
      "--setting-sources",
      "project",
      ...(profile.disableSlashCommands ? ["--disable-slash-commands"] : []),
    );
  }
  return result;
}

/** Preserve every effective config/feature override for a non-inference MCP preflight. */
export function specialtyCodexConfigurationArguments(args) {
  const configuration = [];
  for (let index = 0; index < args.length; index++) {
    if (["-c", "--config", "--disable", "--enable"].includes(args[index])) {
      if (!args[index + 1])
        throw new Error("Incomplete native configuration override");
      configuration.push(args[index], args[++index]);
    } else if (["--model", "-m"].includes(args[index])) {
      if (!args[index + 1]) throw new Error("Incomplete native model override");
      configuration.push("-c", `model=${JSON.stringify(args[++index])}`);
    }
  }
  return [...configuration, "mcp", "list", "--json"];
}

export function verifySpecialtyCodexConfiguration(
  file,
  args,
  spawnOptions,
  run = spawnSync,
) {
  const verificationArgs = specialtyCodexConfigurationArguments(args);
  const result = run(file, verificationArgs, {
    cwd: spawnOptions.cwd,
    env: spawnOptions.env,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
  let servers;
  try {
    const entries = JSON.parse(result.stdout);
    if (
      result.status !== 0 ||
      result.error ||
      !Array.isArray(entries) ||
      entries.some(
        (entry) =>
          !entry || typeof entry.name !== "string" || entry.enabled !== false,
      )
    )
      throw new Error("Unverified native configuration");
    servers = entries.map(({ name, enabled }) => ({ name, enabled }));
  } catch {
    throw new Error(
      "Pre-inference MCP verification failed; native configuration is invalid or a server remains enabled. No model launch.",
    );
  }
  // Native listings may contain transport credentials; retain their digest and safe state only.
  return {
    file,
    args: verificationArgs,
    status: result.status,
    stdoutHash: hash(result.stdout),
    servers,
    verifiedAllDisabled: true,
  };
}

function snapshotInputs(output, options) {
  const files = [
    "scripts/run-specialty-evals.mjs",
    "scripts/lib/specialtyEvalCases.mjs",
    "scripts/lib/evalSubscription.mjs",
    "dist/core/jobRuntime.js",
    "dist/core/jobTypes.js",
    ...new Set(options.cases.map((spec) => `skills/${spec.skill}/SKILL.md`)),
  ];
  const snapshots = {};
  for (const relative of files) {
    const content = fs.readFileSync(path.join(root, relative));
    const destination = path.join(output, "frozen", relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    writeNew(destination, content);
    snapshots[relative] = { sha256: hash(content), bytes: content.length };
  }
  const cases = JSON.stringify(options.cases);
  writeNew(path.join(output, "frozen", "selected-cases.json"), cases + "\n");
  snapshots.selectedCases = {
    sha256: hash(cases),
    bytes: Buffer.byteLength(cases),
  };
  snapshots.grader = {
    sha256: hash(gradeSpecialtyResult.toString()),
    source: "scripts/lib/specialtyEvalCases.mjs",
  };
  return snapshots;
}

export async function runSpecialtyEvaluations(argv, dependencies = {}) {
  const options = parseSpecialtyOptions(argv);
  const plan = specialtyPlan(options);
  if (!options.live)
    return {
      ...plan,
      calls: 0,
      attempts: 0,
      explanation: "Dry run: no provider process or model call is launched.",
    };
  const output =
    options.output ??
    path.join(
      root,
      ".helen",
      "audit-results",
      `specialty-v${SPECIALTY_RUNNER_VERSION}-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`,
    );
  if (fs.existsSync(output))
    throw new Error(
      "Output already exists; choose a new path to preserve immutable evidence",
    );
  // Validate the built runtime before creating any evaluation artifacts or provider process.
  const { createJobRuntime, subscriptionEnvironment } =
    dependencies.runtimeModule ??
    (await import(
      pathToFileURL(path.join(root, "dist/core/jobRuntime.js")).href
    ));
  const environment = subscriptionEnvironment();
  const repository = repositoryIdentity();
  fs.mkdirSync(output, { recursive: true });
  const snapshots = snapshotInputs(output, options);
  const profiles = {},
    blockers = {};
  for (const provider of options.providers) {
    try {
      profiles[provider] = (dependencies.nativeProfile ?? nativeProfile)(
        provider,
        environment,
      );
    } catch (error) {
      blockers[provider] = String(error.message ?? error);
    }
  }
  const manifest = {
    kind: "frozen-specialty-answer-pilot",
    ...plan,
    createdAt: new Date().toISOString(),
    repository,
    snapshots,
    nativeProfiles: profiles,
    preflightBlockers: blockers,
    billing: {
      subscriptionOnly: true,
      codexCreditsUnavailable: options.codexCreditsUnavailable,
      claudeExtraUsageDisabled: options.claudeExtraUsageDisabled,
      evidence:
        "Explicit caller confirmations; account settings are not independently audited by this runner",
    },
    restrictions:
      "Tool-disabled supplied-source answers; native auth, read-only sandbox and managed policy retained; no automatic retries or fallback",
    contamination:
      "Native Codex configuration is retained to preserve valid managed MCP transports, and all servers are verified disabled before inference. Discovered user skill directories are disabled. Native user/managed/system instruction contamination remains unverified.",
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
  };
  const fingerprint = hash(json(manifest));
  writeNew(
    path.join(output, "manifest.json"),
    json({ ...manifest, fingerprint }),
  );
  const observations = [];
  let calls = 0,
    attempts = 0,
    cancelled = false;
  const interrupt = () => {
    cancelled = true;
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    for (const scheduled of plan.schedule) {
      if (cancelled || attempts >= options.maxCalls) break;
      if (blockers[scheduled.provider]) continue;
      const spec = options.cases.find((item) => item.id === scheduled.case);
      const id = `${scheduled.provider}-${spec.id}-${scheduled.trial}-${scheduled.condition}`;
      const directory = path.join(output, "attempts", id);
      fs.mkdirSync(directory, { recursive: true });
      const temp = fs.mkdtempSync(
        path.join(os.tmpdir(), "helen-specialty-answer-"),
      );
      const profile = profiles[scheduled.provider];
      const text =
        scheduled.condition === "baseline"
          ? null
          : fs.readFileSync(
              path.join(output, "frozen", "skills", spec.skill, "SKILL.md"),
              "utf8",
            );
      const prompt = buildSpecialtyPrompt(spec, text);
      writeNew(path.join(directory, "prompt.txt"), prompt);
      const invocations = [];
      const callsBefore = calls;
      const runtime = createJobRuntime({
        env: environment,
        spawn: (file, args, spawnOptions) => {
          const restricted = restrictSpecialtyArguments(
            scheduled.provider,
            args,
            profile,
          );
          const inference =
            scheduled.provider === "codex"
              ? restricted[0] === "exec" &&
                restricted.includes("--output-schema")
              : restricted.includes("-p") &&
                restricted.includes("--json-schema");
          if (inference) {
            if (scheduled.provider === "codex") {
              const receipt = (
                dependencies.verifyCodexConfiguration ??
                verifySpecialtyCodexConfiguration
              )(file, restricted, spawnOptions);
              writeNew(
                path.join(directory, "mcp-verification.json"),
                json(receipt),
              );
            }
            if (calls >= options.maxCalls)
              throw new Error("Frozen model-call budget exhausted");
            calls++;
          }
          const invocation = {
            file,
            args: restricted,
            cwd: spawnOptions.cwd,
            inference,
          };
          writeNew(
            path.join(
              directory,
              `invocation-${String(invocations.length + 1).padStart(3, "0")}.json`,
            ),
            json(invocation),
          );
          invocations.push(invocation);
          return (dependencies.spawn ?? spawn)(file, restricted, spawnOptions);
        },
      });
      attempts++;
      const started = Date.now();
      let outcome;
      try {
        outcome = await runtime({
          provider: scheduled.provider,
          cwd: temp,
          directory,
          prompt,
          maxMinutes: options.maxMinutes,
          maxTurns: options.maxTurns,
          claudeExtraUsageDisabled: options.claudeExtraUsageDisabled,
          codexCreditsUnavailable: options.codexCreditsUnavailable,
          cancelled: () => cancelled,
        });
      } catch (error) {
        outcome = { status: "failed", error: String(error.message ?? error) };
      }
      const durationMs = Date.now() - started;
      try {
        const stdoutFile = path.join(directory, "stdout.jsonl");
        const stdout = fs.existsSync(stdoutFile)
          ? fs.readFileSync(stdoutFile, "utf8")
          : "";
        const metrics = specialtyTelemetry(stdout, scheduled.provider);
        const matchingResult =
          outcome.result && outcome.result.status === outcome.status;
        let grade = null;
        let graderError = null;
        if (matchingResult) {
          try {
            grade = gradeSpecialtyResult(spec, outcome.result);
          } catch (error) {
            graderError = String(error.message ?? error);
          }
        }
        const validResult = Boolean(
          grade && grade.failures[0] !== "Invalid HELEN result contract",
        );
        const versionMatches = outcome.providerVersion === profile.version;
        const writes = fs.readdirSync(temp);
        const eligible =
          ["completed", "needs_input"].includes(outcome.status) &&
          Boolean(validResult) &&
          versionMatches &&
          !metrics.toolEvents.length &&
          !metrics.nativeErrors.length &&
          !writes.length &&
          calls > callsBefore;
        const observation = {
          ...scheduled,
          skill: spec.skill,
          specialty: spec.specialty,
          split: spec.split,
          status: outcome.status,
          eligible: eligible && !graderError,
          passed: eligible && !graderError ? grade.passed : null,
          grade,
          graderError,
          metrics,
          plannedModel: profile.model ?? null,
          plannedModelSource: profile.model
            ? "native-config-model-override"
            : null,
          modelIdentityVerified:
            metrics.resolvedModel !== null &&
            metrics.resolvedModelSource !== null,
          durationMs,
          modelCalls: calls - callsBefore,
          providerVersion: outcome.providerVersion ?? null,
          versionMatches,
          unexpectedWrites: writes,
          humanInterventions: null,
          nativeUiVerified: false,
          editsVerified: false,
          error: outcome.error ?? null,
          trace: `attempts/${id}`,
          promptHash: hash(prompt),
        };
        writeNew(path.join(directory, "runtime-outcome.json"), json(outcome));
        writeNew(path.join(directory, "invocations.json"), json(invocations));
        writeNew(path.join(directory, "observation.json"), json(observation));
        if (outcome.result)
          writeNew(path.join(directory, "answer.json"), json(outcome.result));
        observations.push(observation);
        if (!observation.eligible)
          blockers[scheduled.provider] =
            outcome.error ??
            (graderError
              ? "Pure grader failed; no retry"
              : "Invalid, failed, changed-version or boundary-violating attempt; no retry");
        dependencies.onObservation?.(observation);
      } finally {
        const resolved = path.resolve(temp);
        if (
          path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
          !path.basename(resolved).startsWith("helen-specialty-answer-")
        )
          throw new Error("Unsafe temporary cleanup target");
        fs.rmSync(resolved, { recursive: true, force: true });
      }
    }
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  const comparison = pairSpecialtyObservations(observations);
  const report = {
    version: SPECIALTY_RUNNER_VERSION,
    kind: manifest.kind,
    fingerprint,
    output,
    finishedAt: new Date().toISOString(),
    plannedCalls: plan.plannedCalls,
    maxCalls: options.maxCalls,
    calls,
    attempts,
    status: cancelled
      ? "interrupted"
      : observations.length === plan.plannedCalls &&
          observations.every((item) => item.eligible)
        ? "pilot-completed"
        : "incomplete-or-blocked",
    observations,
    comparison,
    blockers,
    humanInterventions: null,
    nativeUiVerified: false,
    editsVerified: false,
    limitations: [
      "Descriptive frozen pilot; no general improvement or savings claim.",
      "A valid answer can be graded without exposed model identity. Paired claims require matching actual model fields in native telemetry; planned configuration is not observed model identity.",
      "Semantic needs_input answers do not verify native question forms or real human answers.",
      "Token/time fields are native reported telemetry where exposed, otherwise null; wall duration includes preflight.",
      "Native provider requests hidden inside a CLI are not independently counted; calls counts observed inference process launches.",
      "Attempt traces and answers are written once; no replay, retry, judge model or paid API fallback.",
    ],
  };
  writeNew(path.join(output, "results.json"), json(report));
  return report;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  runSpecialtyEvaluations(process.argv.slice(2), {
    onObservation: (observation) =>
      console.error(
        `${observation.provider}: ${observation.case}, ${observation.condition}: ${observation.status}, grade ${observation.passed ?? "unmeasured"}`,
      ),
  })
    .then((result) => {
      console.log(json(result));
      if (result.live !== false && result.status !== "pilot-completed")
        process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
