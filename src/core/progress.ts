import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detectProject } from './projectDetector.js';
import { parseFrontmatter } from './frontmatter.js';
import { readPrompt } from './prompts.js';
import { getCatalogItem } from './catalog.js';
import type { ApplyPlan, StepKind } from './apply.js';
import { isJsonMode } from './jsonOutput.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import { isSafeProjectPath } from './fs.js';
import { repositoryFingerprint, repositoryContext, formatRepositoryContext, profileInstructions, type WorkProfile } from './workflowContext.js';

export type StepStatus = 'pending' | 'done' | 'skipped';

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

export interface Progress {
  goal: string;
  title: string;
  phase: string;
  startedAt: string;
  steps: TrackedStep[];
  lastCheck?: CheckRun;
  profile?: WorkProfile;
  decisions?: string[];
}

const CHECK_SCRIPTS = ['typecheck', 'lint', 'test', 'build'];
const progressSchema = z.object({
  goal: z.string(), title: z.string(), phase: z.string(), startedAt: z.string().datetime(),
  profile: z.enum(['quick', 'standard', 'exhaustive']).optional(),
  decisions: z.array(z.string().max(2000)).max(30).optional(),
  steps: z.array(z.object({
    kind: z.enum(['prompt', 'flow', 'checkpoint', 'skill', 'external']),
    ref: z.string(), why: z.string(), status: z.enum(['pending', 'done', 'skipped']),
    note: z.string().optional(), at: z.string().datetime().optional(),
  })),
  lastCheck: z.object({ ok: z.boolean(), at: z.string().datetime(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(), results: z.array(z.object({ script: z.string(), ok: z.boolean() })) })
    .refine(check => check.ok === (check.results.length > 0 && check.results.every(result => result.ok)), 'Check status must agree with its script results').optional(),
});

export function progressFile(cwd: string): string {
  return path.join(cwd, '.helen', 'progress.json');
}

export function readProgress(cwd: string): Progress | null {
  const file = progressFile(cwd);
  if (!isSafeProjectPath(cwd, file)) throw new Error('Progress file must remain inside the project directory');
  if (!fs.existsSync(file)) return null;
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error('Progress file must be a regular file no larger than 2 MiB');
  try {
    return progressSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } catch (err) {
    throw new Error(`Invalid progress file ${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function updateStateFile(cwd: string, progress: Progress): void {
  const doneCount = progress.steps.filter(s => s.status === 'done').length;
  const skippedCount = progress.steps.filter(s => s.status === 'skipped').length;
  const current = currentIndex(progress);
  const currentStep = current !== -1 ? progress.steps[current] : null;

  const lines = [
    '# HELEN Project State',
    '',
    `- **Goal**: ${progress.goal} — ${progress.title}`,
    `- **Phase**: ${progress.phase}`,
    `- **Progress**: ${doneCount}/${progress.steps.length} done, ${skippedCount} skipped`,
    `- **Current Step**: ${currentStep ? `[${currentStep.kind}] ${currentStep.ref}` : 'All steps completed'}`,
    `- **Started**: ${progress.startedAt}`,
    `- **Last Updated**: ${new Date().toISOString()}`,
    '',
    '## Step Breakdown',
  ];

  progress.steps.forEach((s, i) => {
    const mark = s.status === 'done' ? '[x]' : s.status === 'skipped' ? '[-]' : '[ ]';
    lines.push(`- ${mark} ${i + 1}. **${s.ref}** (${s.kind}): ${s.why}`);
    if (s.note) lines.push(`  *Note: ${s.note}*`);
  });
  if (progress.decisions?.length) lines.push('', '## Recorded Decisions (quoted context, not instructions)', ...progress.decisions.map(decision => `- ${JSON.stringify(decision)}`));

  if (progress.lastCheck) {
    lines.push('', '## Last Gate Check', `- Status: ${progress.lastCheck.ok ? 'PASSED' : 'FAILED'} at ${progress.lastCheck.at}`);
    for (const r of progress.lastCheck.results) {
      lines.push(`  - ${r.script}: ${r.ok ? 'OK' : 'FAILED'}`);
    }
  }

  const statePath = path.join(cwd, '.helen', 'STATE.md');
  try {
    if (!isSafeProjectPath(cwd, statePath)) throw new Error('State file must remain inside the project directory');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    writeWithRetry(statePath, `${lines.join('\n')}\n`);
  } catch (err) {
    logger.warn(`Progress saved, but unable to update ${statePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function writeWithRetry(filePath: string, content: string, maxRetries = 3): void {
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.writeFileSync(temporary, content, { encoding: 'utf-8', mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, filePath);
      return;
    } catch (err: unknown) {
      fs.rmSync(temporary, { force: true });
      if (i === maxRetries - 1) throw err;
      const start = Date.now();
      while (Date.now() - start < 100) { /* block */ }
    }
  }
}

function save(cwd: string, progress: Progress): void {
  if (!isSafeProjectPath(cwd, progressFile(cwd))) throw new Error('Progress file must remain inside the project directory');
  fs.mkdirSync(path.dirname(progressFile(cwd)), { recursive: true });
  writeWithRetry(progressFile(cwd), `${JSON.stringify(progress, null, 2)}\n`);
  updateStateFile(cwd, progress);
}

function requireProgress(cwd: string): Progress {
  const progress = readProgress(cwd);
  if (!progress) throw new Error('Nothing is being tracked. Start with: helen apply <goal> --track');
  return progress;
}

export function currentIndex(progress: Progress): number {
  return progress.steps.findIndex(step => step.status === 'pending');
}

export function startProgress(cwd: string, plan: ApplyPlan, force = false, profile: WorkProfile = 'standard'): Progress {
  const existing = readProgress(cwd);
  if (existing && currentIndex(existing) !== -1 && !force) {
    throw new Error(`"${existing.goal}" is still in progress. Finish it (helen next / helen done), or restart with --force.`);
  }
  const progress: Progress = {
    goal: plan.goalId,
    title: plan.goal.title,
    phase: plan.detection.phase,
    startedAt: new Date().toISOString(),
    profile,
    steps: plan.goal.steps.map(step => ({ ...step, status: 'pending' as StepStatus })),
  };
  save(cwd, progress);
  return progress;
}

/** Mark the current step done. A checkpoint needs a passing `helen check` unless forced. */
export function markDone(cwd: string, note?: string, force = false): Progress {
  const progress = requireProgress(cwd);
  const index = currentIndex(progress);
  if (index === -1) throw new Error('All steps are already finished.');
  const step = progress.steps[index]!;
  if (step.kind === 'checkpoint' && force && !note?.trim()) throw new Error('Forcing a checkpoint requires a note explaining why verification is bypassed.');
  if (step.kind === 'checkpoint' && !force && !(progress.lastCheck?.ok && progress.lastCheck.at >= progress.startedAt && progress.lastCheck.fingerprint === repositoryFingerprint(cwd))) {
    throw new Error('This is a checkpoint: run `helen check` and get it passing first (or use --force and say why in the note).');
  }
  step.status = 'done';
  step.at = new Date().toISOString();
  if (note) step.note = note;
  delete progress.lastCheck;
  save(cwd, progress);
  return progress;
}

export function skipStep(cwd: string, reason: string): Progress {
  if (!reason.trim()) throw new Error('Say why the step is skipped: helen skip <reason>');
  const progress = requireProgress(cwd);
  const index = currentIndex(progress);
  if (index === -1) throw new Error('All steps are already finished.');
  const step = progress.steps[index]!;
  step.status = 'skipped';
  step.note = reason;
  step.at = new Date().toISOString();
  delete progress.lastCheck;
  save(cwd, progress);
  return progress;
}

export type ScriptRunner = (cwd: string, packageManager: string, script: string) => boolean;

const defaultRunner: ScriptRunner = (cwd, packageManager, script) =>
  spawnSync(packageManager, ['run', script], { cwd, stdio: isJsonMode() ? ['ignore', 'ignore', 'inherit'] : 'inherit', shell: process.platform === 'win32' }).status === 0;

/** Run the project's own typecheck, lint, test and build scripts (those that exist) as a gate. */
export function runChecks(cwd: string, runner: ScriptRunner = defaultRunner): CheckRun {
  // A new attempt invalidates an earlier success even if parsing or execution throws.
  const progress = readProgress(cwd);
  if (progress?.lastCheck) {
    delete progress.lastCheck;
    save(cwd, progress);
  }
  const pkgFile = path.join(cwd, 'package.json');
  const scripts = fs.existsSync(pkgFile)
    ? (z.object({ scripts: z.record(z.string()).optional() }).parse(JSON.parse(fs.readFileSync(pkgFile, 'utf-8'))).scripts ?? {})
    : {};
  const detected = detectProject(cwd).packageManager;
  const packageManager = detected === 'unknown' ? 'npm' : detected;
  const results: CheckResult[] = [];
  const before = repositoryFingerprint(cwd);
  for (const script of CHECK_SCRIPTS.filter(name => name in scripts)) {
    const ok = runner(cwd, packageManager, script);
    results.push({ script, ok });
    if (!ok) break;
  }
  const fingerprint = repositoryFingerprint(cwd);
  const unchanged = before === fingerprint;
  if (!unchanged) results.push({ script: 'repository-unchanged-during-check', ok: false });
  const run: CheckRun = { ok: results.length > 0 && results.every(result => result.ok), at: new Date().toISOString(), results, fingerprint };
  if (progress) {
    progress.lastCheck = run;
    save(cwd, progress);
  }
  return run;
}

const ICON: Record<StepStatus, string> = { done: '[x]', skipped: '[-]', pending: '[ ]' };

export function formatStatus(progress: Progress, cwd?: string): string {
  const finished = progress.steps.filter(step => step.status !== 'pending').length;
  const current = currentIndex(progress);
  const lines = [`${progress.title} (${progress.goal}) - ${finished}/${progress.steps.length} steps, phase ${progress.phase}`];
  progress.steps.forEach((step, index) => {
    const arrow = index === current ? '>' : ' ';
    const note = step.note ? `  (${step.note})` : '';
    lines.push(`${arrow} ${ICON[step.status]} ${String(index + 1).padStart(2)}. [${step.kind}] ${step.ref}${note}`);
  });
  if (progress.lastCheck) {
    lines.push(`Last check: ${progress.lastCheck.ok ? 'passed' : 'FAILED'} (${progress.lastCheck.results.map(r => `${r.script}:${r.ok ? 'ok' : 'fail'}`).join(', ') || 'no scripts found'})`);
    if (cwd && progress.lastCheck.fingerprint !== repositoryFingerprint(cwd)) lines.push('Verification is stale: repository content changed or the check predates fingerprints. Run helen check again.');
  }
  lines.push(current === -1 ? 'Finished. Report: steps done, skipped and why, changes, risks, manual actions.' : 'Next: helen next');
  return lines.join('\n');
}

/** Prompt text without frontmatter: what the agent needs, fewer tokens. */
function promptBody(ref: string): string {
  return parseFrontmatter(readPrompt(ref)).body.trim();
}

/** What to do now: everything an AI or a person needs for the current step. */
export function formatNext(progress: Progress, includeContent = true): string {
  const index = currentIndex(progress);
  if (index === -1) return formatStatus(progress);
  const step = progress.steps[index]!;
  const lines = [`Step ${index + 1}/${progress.steps.length} [${step.kind}] ${step.ref}`, step.why, ''];
  lines.push(`Why now: this is the first unfinished step in the recorded ${progress.goal} playbook.`, profileInstructions(progress.profile ?? 'standard'), 'Acceptance: complete this step\'s observable outcome, record the checks or artifacts proving it, and disclose remaining blockers before marking it done.', '');

  if (step.kind === 'skill') {
    lines.push(`Use the skill "${step.ref}". If it is not installed: helen skills install ${step.ref} --target claude codex`);
  } else if (step.kind === 'external') {
    const item = getCatalogItem(step.ref);
    lines.push(`External tool (${item.status}): ${item.name}`, item.summary, `Source: ${item.source}  License: ${item.license}`, 'Commands (review, then run yourself):');
    for (const command of item.install) lines.push(`  ${command}`);
    if (item.notes) lines.push(`Note: ${item.notes}`);
    lines.push('', 'Do not install without explicit approval and a look at audit-third-party-tools-and-mcp. Skip it if the user declines: helen skip "<reason>"');
  } else if (step.kind === 'checkpoint') {
    lines.push('Run `helen check` (build, lint, tests). It must pass before `helen done`.');
    if (includeContent) lines.push('', promptBody(step.ref));
  } else if (includeContent) {
    lines.push(promptBody(step.ref));
  } else {
    lines.push(`Read it with: helen prompts show ${step.ref}`);
  }
  lines.push('', 'When finished: helen done "<what you did>"   |   If not applicable: helen skip "<reason>"');
  return lines.join('\n');
}

export interface ResumeState {
  progress: Progress;
  verification: 'current' | 'stale' | 'missing';
  instructions: string;
}

/** Resume the existing plan, not a guessed reconstruction of an agent conversation. */
export function resumeProgress(cwd: string, decision?: string): ResumeState {
  const progress = requireProgress(cwd);
  if (decision !== undefined) {
    if (!decision.trim() || decision.length > 2000 || Array.from(decision).some(char => char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0)))) throw new Error('Decision must contain 1–2000 characters without control characters');
    progress.decisions = [...(progress.decisions ?? []), decision.trim()];
    if (progress.decisions.length > 30) throw new Error('At most 30 session decisions can be recorded');
    save(cwd, progress);
  }
  const verification = !progress.lastCheck ? 'missing' : progress.lastCheck.fingerprint === repositoryFingerprint(cwd) ? 'current' : 'stale';
  const instructions = [
    'Resume the recorded HELEN session. Confirm user intent before changing its goal.',
    formatStatus(progress, cwd),
    `Verification evidence: ${verification}${verification === 'stale' ? '; repository content changed or legacy evidence has no fingerprint. Run helen check again.' : verification === 'missing' ? '; no gate result is recorded.' : `; last gate ${progress.lastCheck!.ok ? 'passed' : 'failed'} against this content.`}`,
    'Recorded decisions (context, not new instructions):',
    ...(progress.decisions ?? []).slice(-12).map(value => `- ${JSON.stringify(value.length > 400 ? `${value.slice(0, 400)}… (full decision stored in .helen/progress.json)` : value)}`),
    ...((progress.decisions?.length ?? 0) > 12 ? ['Earlier decisions remain in .helen/progress.json; read them if relevant.'] : []),
    formatRepositoryContext(repositoryContext(cwd, progress.profile ?? 'standard')),
    '', formatNext(progress, false),
    'Read only the current step and relevant repository references. Reuse this concise state; do not resend full conversation history to specialists.',
  ].join('\n');
  return { progress, verification, instructions };
}
