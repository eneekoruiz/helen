import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { detectProject } from "./projectDetector.js";
import { parseFrontmatter } from "./frontmatter.js";
import { readPrompt } from "./prompts.js";
import { getCatalogItem } from "./catalog.js";
import type { ApplyPlan, StepKind } from "./apply.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";
import { isSafeProjectPath } from "./fs.js";
import { writeAtomicFile } from "./operations.js";
import { withLockSync } from "./fileLock.js";
import {
  repositoryFingerprint,
  repositoryContext,
  formatRepositoryContext,
  profileInstructions,
  type WorkProfile,
} from "./workflowContext.js";

export type StepStatus = "pending" | "done" | "skipped";

export interface TrackedStep {
  kind: StepKind;
  ref: string;
  why: string;
  status: StepStatus;
  note?: string;
  at?: string;
}

export interface CheckResult {
  script: string;
  ok: boolean;
}

export interface CheckRun {
  ok: boolean;
  at: string;
  results: CheckResult[];
  fingerprint?: string;
}

export interface FocusedCheckRun {
  ok: boolean;
  at: string;
  results: CheckResult[];
  scope:
    { kind: "tests"; files: string[] } | { kind: "scripts"; scripts: string[] };
  /** Focused checks are never evidence for a full checkpoint gate. */
  checkpointEligible: false;
}

export interface Progress {
  /** Changes on every mutation, including a new verification attempt. */
  revision?: string;
  goal: string;
  title: string;
  phase: string;
  startedAt: string;
  steps: TrackedStep[];
  lastCheck?: CheckRun;
  profile?: WorkProfile;
  decisions?: string[];
}

const CHECK_SCRIPTS = ["typecheck", "lint", "test", "build"];
const progressSchema = z.object({
  revision: z.string().uuid().optional(),
  goal: z.string(),
  title: z.string(),
  phase: z.string(),
  startedAt: z.string().datetime(),
  profile: z.enum(["quick", "standard", "exhaustive"]).optional(),
  decisions: z.array(z.string().max(2000)).max(30).optional(),
  steps: z.array(
    z.object({
      kind: z.enum(["prompt", "flow", "checkpoint", "skill", "external"]),
      ref: z.string(),
      why: z.string(),
      status: z.enum(["pending", "done", "skipped"]),
      note: z.string().optional(),
      at: z.string().datetime().optional(),
    }),
  ),
  lastCheck: z
    .object({
      ok: z.boolean(),
      at: z.string().datetime(),
      fingerprint: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      results: z.array(z.object({ script: z.string(), ok: z.boolean() })),
    })
    .refine(
      (check) =>
        check.ok ===
        (check.results.length > 0 &&
          check.results.every((result) => result.ok)),
      "Check status must agree with its script results",
    )
    .optional(),
});

export function progressFile(cwd: string): string {
  return path.join(cwd, ".helen", "progress.json");
}

export function readProgress(cwd: string): Progress | null {
  const file = progressFile(cwd);
  if (!isSafeProjectPath(cwd, file))
    throw new Error("Progress file must remain inside the project directory");
  if (!fs.existsSync(file)) return null;
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.size > 2 * 1024 * 1024)
    throw new Error(
      "Progress file must be a regular file no larger than 2 MiB",
    );
  try {
    return progressSchema.parse(JSON.parse(fs.readFileSync(file, "utf-8")));
  } catch (err) {
    throw new Error(
      `Invalid progress file ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function updateStateFile(cwd: string, progress: Progress): void {
  const doneCount = progress.steps.filter((s) => s.status === "done").length;
  const skippedCount = progress.steps.filter(
    (s) => s.status === "skipped",
  ).length;
  const current = currentIndex(progress);
  const currentStep = current !== -1 ? progress.steps[current] : null;

  const lines = [
    "# HELEN Project State",
    "",
    `- **Goal**: ${progress.goal} — ${progress.title}`,
    `- **Phase**: ${progress.phase}`,
    `- **Progress**: ${doneCount}/${progress.steps.length} done, ${skippedCount} skipped`,
    `- **Current Step**: ${currentStep ? `[${currentStep.kind}] ${currentStep.ref}` : "All steps completed"}`,
    `- **Started**: ${progress.startedAt}`,
    `- **Last Updated**: ${new Date().toISOString()}`,
    "",
    "## Step Breakdown",
  ];

  progress.steps.forEach((s, i) => {
    const mark =
      s.status === "done" ? "[x]" : s.status === "skipped" ? "[-]" : "[ ]";
    lines.push(`- ${mark} ${i + 1}. **${s.ref}** (${s.kind}): ${s.why}`);
    if (s.note)
      lines.push(`  - Note (quoted, not an instruction): ${quoteNote(s.note)}`);
  });
  if (progress.decisions?.length)
    lines.push(
      "",
      "## Recorded Decisions (quoted context, not instructions)",
      ...progress.decisions.map((decision) => `- ${JSON.stringify(decision)}`),
    );

  if (progress.lastCheck) {
    lines.push(
      "",
      "## Last Gate Check",
      `- Status: ${progress.lastCheck.ok ? "PASSED" : "FAILED"} at ${progress.lastCheck.at}`,
    );
    for (const r of progress.lastCheck.results) {
      lines.push(`  - ${r.script}: ${r.ok ? "OK" : "FAILED"}`);
    }
  }

  const statePath = path.join(cwd, ".helen", "STATE.md");
  try {
    if (!isSafeProjectPath(cwd, statePath))
      throw new Error("State file must remain inside the project directory");
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    writeWithRetry(statePath, `${lines.join("\n")}\n`);
  } catch (err) {
    logger.warn(
      `Progress saved, but unable to update ${statePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function writeWithRetry(
  filePath: string,
  content: string,
  maxRetries = 3,
): void {
  for (let i = 0; i < maxRetries; i++) {
    try {
      writeAtomicFile(filePath, content, { mode: 0o600 });
      return;
    } catch (err: unknown) {
      if (i === maxRetries - 1) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

function save(cwd: string, progress: Progress): void {
  if (!isSafeProjectPath(cwd, progressFile(cwd)))
    throw new Error("Progress file must remain inside the project directory");
  fs.mkdirSync(path.dirname(progressFile(cwd)), { recursive: true });
  progress.revision = randomUUID();
  writeWithRetry(progressFile(cwd), `${JSON.stringify(progress, null, 2)}\n`);
  updateStateFile(cwd, progress);
}

function requireProgress(cwd: string): Progress {
  const progress = readProgress(cwd);
  if (!progress)
    throw new Error(
      "Nothing is being tracked. Start with: helen apply <goal> --track",
    );
  return progress;
}

/**
 * Several agents may update the same plan at once. Every read-modify-write of progress.json goes
 * through this lock, otherwise the last writer silently erases the others' updates.
 */
function withProgressLock<T>(cwd: string, action: () => T): T {
  const lock = path.join(cwd, ".helen", "progress.lock");
  if (!isSafeProjectPath(cwd, lock))
    throw new Error("Progress lock must remain inside the project directory");
  return withLockSync(lock, action);
}

export function currentIndex(progress: Progress): number {
  return progress.steps.findIndex((step) => step.status === "pending");
}

export function startProgress(
  cwd: string,
  plan: ApplyPlan,
  force = false,
  profile: WorkProfile = "standard",
): Progress {
  return withProgressLock(cwd, () => {
    const existing = readProgress(cwd);
    if (existing && currentIndex(existing) !== -1 && !force) {
      throw new Error(
        `"${existing.goal}" is still in progress. Finish it (helen next / helen done), or restart with --force.`,
      );
    }
    const progress: Progress = {
      goal: plan.goalId,
      title: plan.goal.title,
      phase: plan.detection.phase,
      startedAt: new Date().toISOString(),
      profile,
      steps: plan.goal.steps.map((step) => ({
        ...step,
        status: "pending" as StepStatus,
      })),
    };
    save(cwd, progress);
    return progress;
  });
}

function finishStep(
  cwd: string,
  progress: Progress,
  index: number,
  note: string | undefined,
  force: boolean,
): Progress {
  const step = progress.steps[index]!;
  if (step.kind === "checkpoint" && force && !note?.trim())
    throw new Error(
      "Forcing a checkpoint requires a note explaining why verification is bypassed.",
    );
  if (
    step.kind === "checkpoint" &&
    !force &&
    !(
      progress.lastCheck?.ok &&
      progress.lastCheck.at >= progress.startedAt &&
      progress.lastCheck.fingerprint === repositoryFingerprint(cwd)
    )
  ) {
    throw new Error(
      "This is a checkpoint: run `helen check` and get it passing first (or use --force and say why in the note).",
    );
  }
  step.status = "done";
  step.at = new Date().toISOString();
  if (note) step.note = note;
  delete progress.lastCheck;
  save(cwd, progress);
  return progress;
}

/** Mark the current step done. A checkpoint needs a passing `helen check` unless forced. */
export function markDone(cwd: string, note?: string, force = false): Progress {
  return withProgressLock(cwd, () => {
    const progress = requireProgress(cwd);
    const index = currentIndex(progress);
    if (index === -1) throw new Error("All steps are already finished.");
    return finishStep(cwd, progress, index, note, force);
  });
}

/** Mark a specific pending step done (parallel work: steps need not finish in order). Same checkpoint gate as markDone. */
export function completeStepAt(
  cwd: string,
  index: number,
  note?: string,
  force = false,
): Progress {
  return withProgressLock(cwd, () => {
    const progress = requireProgress(cwd);
    const step = progress.steps[index];
    if (!step)
      throw new Error(`There is no step ${index + 1} in the tracked plan.`);
    if (step.status !== "pending")
      throw new Error(`Step ${index + 1} is already ${step.status}.`);
    return finishStep(cwd, progress, index, note, force);
  });
}

function skipAt(
  cwd: string,
  progress: Progress,
  index: number,
  reason: string,
): Progress {
  const step = progress.steps[index]!;
  step.status = "skipped";
  step.note = reason;
  step.at = new Date().toISOString();
  delete progress.lastCheck;
  save(cwd, progress);
  return progress;
}

export function skipStep(cwd: string, reason: string): Progress {
  if (!reason.trim())
    throw new Error("Say why the step is skipped: helen skip <reason>");
  return withProgressLock(cwd, () => {
    const progress = requireProgress(cwd);
    const index = currentIndex(progress);
    if (index === -1) throw new Error("All steps are already finished.");
    return skipAt(cwd, progress, index, reason);
  });
}

/** Skip a specific pending step with a recorded reason. */
export function skipStepAt(
  cwd: string,
  index: number,
  reason: string,
): Progress {
  if (!reason.trim()) throw new Error("Say why the step is skipped.");
  return withProgressLock(cwd, () => {
    const progress = requireProgress(cwd);
    const step = progress.steps[index];
    if (!step)
      throw new Error(`There is no step ${index + 1} in the tracked plan.`);
    if (step.status !== "pending")
      throw new Error(`Step ${index + 1} is already ${step.status}.`);
    return skipAt(cwd, progress, index, reason);
  });
}

export type ScriptRunner = (
  cwd: string,
  packageManager: string,
  script: string,
) => boolean;
export type FocusedScriptRunner = (
  cwd: string,
  packageManager: string,
  script: string,
  args: string[],
) => boolean;

/**
 * Project scripts must never write to our stdout (it is the MCP/JSON protocol channel) or read our stdin
 * (the protocol input). Their output goes to stderr, and a hung script is stopped after ten minutes.
 */
const SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;
const scriptOptions = (cwd: string): SpawnSyncOptions => ({
  cwd,
  stdio: ["ignore", process.stderr.fd, process.stderr.fd],
  windowsHide: true,
  timeout: SCRIPT_TIMEOUT_MS,
  killSignal: "SIGKILL",
});

const defaultRunner: ScriptRunner = (cwd, packageManager, script) =>
  (process.platform === "win32"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `${packageManager} run ${script}`],
        scriptOptions(cwd),
      )
    : spawnSync(packageManager, ["run", script], scriptOptions(cwd))
  ).status === 0;

/** Run the project's own typecheck, lint, test and build scripts (those that exist) as a gate. */
export function runChecks(
  cwd: string,
  runner: ScriptRunner = defaultRunner,
): CheckRun {
  // A new attempt invalidates an earlier success even if parsing or execution throws.
  // The lock is held only while changing state, never while the project's scripts run.
  const expected = withProgressLock(cwd, () => {
    const progress = readProgress(cwd);
    if (progress?.lastCheck) {
      delete progress.lastCheck;
      save(cwd, progress);
    }
    return JSON.stringify(progress);
  });
  const pkgFile = path.join(cwd, "package.json");
  const scripts = fs.existsSync(pkgFile)
    ? (z
        .object({ scripts: z.record(z.string(), z.string()).optional() })
        .parse(JSON.parse(fs.readFileSync(pkgFile, "utf-8"))).scripts ?? {})
    : {};
  const detected = detectProject(cwd).packageManager;
  const packageManager = detected === "unknown" ? "npm" : detected;
  const results: CheckResult[] = [];
  const before = repositoryFingerprint(cwd);
  for (const script of CHECK_SCRIPTS.filter((name) => name in scripts)) {
    const ok = runner(cwd, packageManager, script);
    results.push({ script, ok });
    if (!ok) break;
  }
  const fingerprint = repositoryFingerprint(cwd);
  const unchanged = before === fingerprint;
  if (!unchanged)
    results.push({ script: "repository-unchanged-during-check", ok: false });
  const run: CheckRun = {
    ok: results.length > 0 && results.every((result) => result.ok),
    at: new Date().toISOString(),
    results,
    fingerprint,
  };
  withProgressLock(cwd, () => {
    const latest = readProgress(cwd);
    // Whoever changed the plan while the scripts ran owns the newer state: keep it, and do not grant this stale gate.
    if (JSON.stringify(latest) !== expected) {
      run.results.push({
        script: "progress-unchanged-during-check",
        ok: false,
      });
      run.ok = false;
    } else if (latest) {
      latest.lastCheck = run;
      save(cwd, latest);
    }
  });
  return run;
}

const ICON: Record<StepStatus, string> = {
  done: "[x]",
  skipped: "[-]",
  pending: "[ ]",
};

/**
 * Notes are written by agents. Render them as one quoted line so a note can never forge a heading,
 * a list item or an instruction in STATE.md or in a status listing.
 */
export function quoteNote(note: string, max = 500): string {
  const single = note.replace(/\s+/g, " ").trim();
  return JSON.stringify(
    single.length > max ? `${single.slice(0, max)}...` : single,
  );
}

export function formatStatus(progress: Progress, cwd?: string): string {
  const finished = progress.steps.filter(
    (step) => step.status !== "pending",
  ).length;
  const current = currentIndex(progress);
  const lines = [
    `${progress.title} (${progress.goal}) - ${finished}/${progress.steps.length} steps, phase ${progress.phase}`,
  ];
  progress.steps.forEach((step, index) => {
    const arrow = index === current ? ">" : " ";
    const note = step.note ? `  (${quoteNote(step.note, 160)})` : "";
    lines.push(
      `${arrow} ${ICON[step.status]} ${String(index + 1).padStart(2)}. [${step.kind}] ${step.ref}${note}`,
    );
  });
  if (progress.lastCheck) {
    lines.push(
      `Last check: ${progress.lastCheck.ok ? "passed" : "FAILED"} (${progress.lastCheck.results.map((r) => `${r.script}:${r.ok ? "ok" : "fail"}`).join(", ") || "no scripts found"})`,
    );
    if (cwd && progress.lastCheck.fingerprint !== repositoryFingerprint(cwd))
      lines.push(
        "Verification is stale: repository content changed or the check predates fingerprints. Run helen check again.",
      );
  }
  lines.push(
    current === -1
      ? "Finished. Report: steps done, skipped and why, changes, risks, manual actions."
      : "Next: helen next",
  );
  return lines.join("\n");
}

/** Prompt text without frontmatter: what the agent needs, fewer tokens. */
function promptBody(ref: string): string {
  return parseFrontmatter(readPrompt(ref)).body.trim();
}

/** What to do now: everything an AI or a person needs for the current step. */
export function formatNext(progress: Progress, includeContent = true): string {
  const index = currentIndex(progress);
  if (index === -1) return formatStatus(progress);
  return formatStepAt(progress, index, includeContent);
}

/** The same instructions as `formatNext`, for any step (parallel work addresses steps directly). */
export function formatStepAt(
  progress: Progress,
  index: number,
  includeContent = true,
): string {
  const step = progress.steps[index]!;
  const lines = [
    `Step ${index + 1}/${progress.steps.length} [${step.kind}] ${step.ref}`,
    step.why,
    "",
  ];
  lines.push(
    `Why now: this is the first unfinished step in the recorded ${progress.goal} playbook.`,
    profileInstructions(progress.profile ?? "standard"),
    "Acceptance: complete this step's observable outcome, record the checks or artifacts proving it, and disclose remaining blockers before marking it done.",
    "",
  );

  if (step.kind === "skill") {
    lines.push(
      `Use the skill "${step.ref}". If it is not installed: helen skills install ${step.ref} --target claude codex`,
    );
  } else if (step.kind === "external") {
    const item = getCatalogItem(step.ref);
    lines.push(
      `External tool (${item.status}): ${item.name}`,
      item.summary,
      `Source: ${item.source}  License: ${item.license}`,
      "Commands (review, then run yourself):",
    );
    for (const command of item.install) lines.push(`  ${command}`);
    if (item.notes) lines.push(`Note: ${item.notes}`);
    lines.push(
      "",
      'Do not install without explicit approval and a look at audit-third-party-tools-and-mcp. Skip it if the user declines: helen skip "<reason>"',
    );
  } else if (step.kind === "checkpoint") {
    lines.push(
      "Run `helen check` (build, lint, tests). It must pass before `helen done`.",
    );
    if (includeContent) lines.push("", promptBody(step.ref));
  } else if (includeContent) {
    lines.push(promptBody(step.ref));
  } else {
    lines.push(`Read it with: helen prompts show ${step.ref}`);
  }
  lines.push(
    "",
    'When finished: helen done "<what you did>"   |   If not applicable: helen skip "<reason>"',
  );
  return lines.join("\n");
}

const defaultFocusedRunner: FocusedScriptRunner = (
  cwd,
  packageManager,
  script,
  args,
) => {
  if (script === "test" && args.includes("--run")) {
    return runVerifiedFocusedVitest(cwd, args);
  }
  const cmdArgs = ["run", script, ...(args.length ? ["--", ...args] : [])];
  return (
    (process.platform === "win32"
      ? spawnSync(
          "cmd.exe",
          ["/d", "/s", "/c", `${packageManager} ${cmdArgs.join(" ")}`],
          scriptOptions(cwd),
        )
      : spawnSync(packageManager, cmdArgs, scriptOptions(cwd))
    ).status === 0
  );
};

function runVerifiedFocusedVitest(cwd: string, args: string[]): boolean {
  const runIndex = args.indexOf("--run");
  if (runIndex < 0 || runIndex === args.length - 1)
    throw new Error("Focused Vitest requires at least one file filter");
  const options = args.slice(0, runIndex);
  const filters = args.slice(runIndex + 1);
  const requireFromProject = createRequire(path.join(cwd, "package.json"));
  let vitestEntry: string;
  try {
    vitestEntry = path.join(
      path.dirname(requireFromProject.resolve("vitest/package.json")),
      "vitest.mjs",
    );
  } catch {
    throw new Error(
      "Focused checks require Vitest installed in the project; no project-local Vitest package was found",
    );
  }

  // Vitest treats the optional argument after bare --json as an output filename, so keep it last.
  const discovery = spawnSync(
    process.execPath,
    [vitestEntry, "list", ...options, "--filesOnly", ...filters, "--json"],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      windowsHide: true,
    },
  );
  if (discovery.error || discovery.status !== 0 || !discovery.stdout) {
    throw new Error(
      `Unable to verify focused Vitest file selection (list exited ${discovery.status ?? "with a spawn error"}); focus was not run`,
    );
  }
  let discovered: unknown;
  try {
    discovered = JSON.parse(discovery.stdout);
  } catch {
    throw new Error(
      "Unable to verify focused Vitest file selection (list did not return valid JSON); focus was not run",
    );
  }
  if (
    !Array.isArray(discovered) ||
    !discovered.every(
      (entry: unknown) =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as { file?: unknown }).file === "string",
    )
  ) {
    throw new Error(
      "Unable to verify focused Vitest file selection (unexpected list output); focus was not run",
    );
  }

  const normalize = (file: string): string =>
    fs.realpathSync.native(path.resolve(cwd, file)).replaceAll("\\", "/");
  const expected = new Set(filters.map(normalize));
  const actual = new Set(
    (discovered as Array<{ file: string }>).map((entry) =>
      normalize(entry.file),
    ),
  );
  const missing = [...expected].filter((file) => !actual.has(file));
  const extra = [...actual].filter((file) => !expected.has(file));
  if (missing.length || extra.length || actual.size !== expected.size) {
    throw new Error(
      `Vitest resolved a different file set than requested (requested ${filters.length}, discovered ${actual.size}); missing: ${missing.map((file) => path.relative(cwd, file)).join(", ") || "none"}; extra: ${extra.map((file) => path.relative(cwd, file)).join(", ") || "none"}. Focus was not run`,
    );
  }

  const result = spawnSync(
    process.execPath,
    [vitestEntry, "run", ...options, "--run", ...filters],
    scriptOptions(cwd),
  );
  if (result.error || result.status === null) {
    throw new Error(
      "Unable to start the project-local Vitest process; focused checks did not run",
    );
  }
  return result.status === 0;
}

const FOCUSED_SCRIPT_VALUE_OPTIONS = new Set([
  "--config",
  "--project",
  "--dir",
  "--reporter",
  "--outputFile",
  "--testNamePattern",
  "--pool",
  "--maxWorkers",
  "--minWorkers",
  "--retry",
  "--sequence.seed",
  "--coverage.provider",
  "--coverage.reporter",
  "--coverage.reportsDirectory",
]);

/** Accept only a direct Vitest invocation with inert flags, so appended filters reach Vitest. */
function focusedVitestArgs(script: string): string[] | null {
  const parts = script.trim().split(/\s+/).filter(Boolean);
  const executable = parts.shift();
  if (
    !executable ||
    !/^(?:vitest(?:\.cmd)?|(?:\.\/)?node_modules\/\.bin\/vitest(?:\.cmd)?)$/i.test(
      executable,
    )
  )
    return null;

  const args: string[] = [];
  let hasRun = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.toLowerCase() === "run" && !hasRun && args.length === 0) {
      hasRun = true;
      continue;
    }
    if (!/^--[a-z][a-z0-9.-]*(?:=[a-z0-9._/:\\-]+)?$/i.test(part)) return null;
    const [option, inlineValue] = part.split("=", 2);
    if (option === "--run") {
      if (inlineValue !== undefined) return null;
      continue;
    }
    if (option === "--watch" || option === "--json" || option === "--filesOnly")
      return null;
    if (
      inlineValue === undefined &&
      FOCUSED_SCRIPT_VALUE_OPTIONS.has(option!)
    ) {
      const value = parts[++i];
      if (!value || value.startsWith("-") || !/^[a-z0-9._/:\\-]+$/i.test(value))
        return null;
      args.push(part, value);
    } else if (
      inlineValue !== undefined &&
      FOCUSED_SCRIPT_VALUE_OPTIONS.has(option!)
    ) {
      args.push(part);
    } else {
      args.push(part);
    }
  }
  return args;
}

/** Find substring-filter collisions conservatively; fail closed rather than run extra files. */
function assertFocusedFiltersUnambiguous(
  cwd: string,
  selected: string[],
): void {
  const maxEntries = 20_000;
  let count = 0;
  const selectedSet = new Set(
    selected.map((file) => fs.realpathSync.native(path.resolve(cwd, file))),
  );
  const filters = selected.map((file) => file.toLocaleLowerCase());
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && [".git", "node_modules"].includes(entry.name))
        continue;
      if (++count > maxEntries)
        throw new Error(
          `Focused file scan exceeds ${maxEntries} entries; use --scripts for a bounded supported subset`,
        );
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const candidate = path
        .relative(cwd, absolute)
        .replaceAll("\\", "/")
        .toLocaleLowerCase();
      if (filters.some((filter) => candidate.includes(filter))) {
        if (selectedSet.has(fs.realpathSync.native(absolute))) continue;
        throw new Error(
          `Vitest's substring filter for a selected path could also run ${candidate}; rename the file or use --scripts`,
        );
      }
    }
  };
  visit(cwd);
}

/**
 * Run a deliberately partial check without reading or changing checkpoint evidence.
 * File focus is supported only when the project's test script invokes Vitest.
 */
export function runFocusedChecks(
  cwd: string,
  selection: { files: string[] } | { scripts: string[] },
  runner: FocusedScriptRunner = defaultFocusedRunner,
): FocusedCheckRun {
  const pkgFile = path.join(cwd, "package.json");
  if (
    !fs.existsSync(pkgFile) ||
    !isSafeProjectPath(cwd, pkgFile) ||
    !fs.lstatSync(pkgFile).isFile()
  ) {
    throw new Error(
      "Focused checks require a safe package.json in the project directory",
    );
  }
  const scripts =
    z
      .object({ scripts: z.record(z.string(), z.string()).optional() })
      .parse(JSON.parse(fs.readFileSync(pkgFile, "utf-8"))).scripts ?? {};
  const detected = detectProject(cwd).packageManager;
  const packageManager = detected === "unknown" ? "npm" : detected;
  const before = repositoryFingerprint(cwd);
  const results: CheckResult[] = [];
  let scope: FocusedCheckRun["scope"];

  if ("files" in selection) {
    if (selection.files.length === 0)
      throw new Error("Pass at least one test file after --focus");
    const vitestArgs = scripts.test ? focusedVitestArgs(scripts.test) : null;
    if (
      !scripts.test ||
      detectProject(cwd).testRunner !== "vitest" ||
      !vitestArgs
    ) {
      throw new Error(
        "Focused test files require a direct Vitest script (vitest [run] with supported flags); use --scripts for wrappers or other scripts",
      );
    }
    const files = [...new Set(selection.files)].map((input) => {
      if (!input || input.startsWith("-"))
        throw new Error(`Invalid focused test path: ${input}`);
      const absolute = path.resolve(cwd, input);
      if (!isSafeProjectPath(cwd, absolute) || !fs.existsSync(absolute))
        throw new Error(
          `Focused test path must exist inside the project and contain no symlinks: ${input}`,
        );
      const info = fs.lstatSync(absolute);
      if (!info.isFile())
        throw new Error(`Focused test path must be a regular file: ${input}`);
      const relative = path.relative(cwd, absolute).replaceAll("\\", "/");
      // Only the normalized relative path reaches the package-manager shell.
      if (relative.startsWith("-") || !/^[a-z0-9._/-]+$/i.test(relative))
        throw new Error(
          `Invalid focused test path after normalization: ${input}`,
        );
      return relative;
    });
    assertFocusedFiltersUnambiguous(cwd, files);
    scope = { kind: "tests", files };
    // The package script already contains its validated flags; append only the run-mode guard and filters.
    const ok = runner(cwd, packageManager, "test", [
      ...vitestArgs,
      "--run",
      ...files,
    ]);
    results.push({ script: "test", ok });
  } else {
    if (selection.scripts.length === 0)
      throw new Error("Pass at least one script name after --scripts");
    const chosen = [...new Set(selection.scripts)];
    for (const script of chosen) {
      if (!CHECK_SCRIPTS.includes(script) || !(script in scripts))
        throw new Error(`Unsupported or missing check script: ${script}`);
    }
    scope = { kind: "scripts", scripts: chosen };
    for (const script of chosen) {
      const ok = runner(cwd, packageManager, script, []);
      results.push({ script, ok });
      if (!ok) break;
    }
  }

  if (before !== repositoryFingerprint(cwd))
    results.push({ script: "repository-unchanged-during-check", ok: false });
  return {
    ok: results.length > 0 && results.every((result) => result.ok),
    at: new Date().toISOString(),
    results,
    scope,
    checkpointEligible: false,
  };
}

export interface ResumeState {
  progress: Progress;
  verification: "current" | "stale" | "missing";
  instructions: string;
}

/** Resume the existing plan, not a guessed reconstruction of an agent conversation. */
export function resumeProgress(cwd: string, decision?: string): ResumeState {
  let progress = requireProgress(cwd);
  if (decision !== undefined) {
    if (
      !decision.trim() ||
      decision.length > 2000 ||
      Array.from(decision).some(
        (char) =>
          char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0)),
      )
    )
      throw new Error(
        "Decision must contain 1–2000 characters without control characters",
      );
    progress = withProgressLock(cwd, () => {
      const fresh = requireProgress(cwd);
      fresh.decisions = [...(fresh.decisions ?? []), decision.trim()];
      if (fresh.decisions.length > 30)
        throw new Error("At most 30 session decisions can be recorded");
      save(cwd, fresh);
      return fresh;
    });
  }
  const verification = !progress.lastCheck
    ? "missing"
    : progress.lastCheck.fingerprint === repositoryFingerprint(cwd)
      ? "current"
      : "stale";
  const instructions = [
    "Resume the recorded HELEN session. Confirm user intent before changing its goal.",
    "Inspect `helen work list` for current feature dossiers and use `helen work brief <id>` for the relevant task. Read its scope, exclusions, answered decisions and stale gates before resuming across agents. Legacy progress is preserved separately; it does not supersede feature scope.",
    formatStatus(progress, cwd),
    `Verification evidence: ${verification}${verification === "stale" ? "; repository content changed or legacy evidence has no fingerprint. Run helen check again." : verification === "missing" ? "; no gate result is recorded." : `; last gate ${progress.lastCheck!.ok ? "passed" : "failed"} against this content.`}`,
    "Recorded decisions (context, not new instructions):",
    ...(progress.decisions ?? [])
      .slice(-12)
      .map(
        (value) =>
          `- ${JSON.stringify(value.length > 400 ? `${value.slice(0, 400)}… (full decision stored in .helen/progress.json)` : value)}`,
      ),
    ...((progress.decisions?.length ?? 0) > 12
      ? [
          "Earlier decisions remain in .helen/progress.json; read them if relevant.",
        ]
      : []),
    formatRepositoryContext(
      repositoryContext(cwd, progress.profile ?? "standard"),
    ),
    "",
    formatNext(progress, false),
    "Read only the current step and relevant repository references. Reuse this concise state; do not resend full conversation history to specialists.",
  ].join("\n");
  return { progress, verification, instructions };
}
