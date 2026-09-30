import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detectProject } from './projectDetector.js';
import { parseFrontmatter } from './frontmatter.js';
import { readPrompt } from './prompts.js';
import { getCatalogItem } from './catalog.js';
import type { ApplyPlan, StepKind } from './apply.js';

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
}

export interface Progress {
  goal: string;
  title: string;
  phase: string;
  startedAt: string;
  steps: TrackedStep[];
  lastCheck?: CheckRun;
}

const CHECK_SCRIPTS = ['typecheck', 'lint', 'test', 'build'];

export function progressFile(cwd: string): string {
  return path.join(cwd, '.helen', 'progress.json');
}

export function readProgress(cwd: string): Progress | null {
  const file = progressFile(cwd);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Progress;
}

function save(cwd: string, progress: Progress): void {
  fs.mkdirSync(path.dirname(progressFile(cwd)), { recursive: true });
  fs.writeFileSync(progressFile(cwd), `${JSON.stringify(progress, null, 2)}\n`, 'utf-8');
}

function requireProgress(cwd: string): Progress {
  const progress = readProgress(cwd);
  if (!progress) throw new Error('Nothing is being tracked. Start with: helen apply <goal> --track');
  return progress;
}

export function currentIndex(progress: Progress): number {
  return progress.steps.findIndex(step => step.status === 'pending');
}

export function startProgress(cwd: string, plan: ApplyPlan, force = false): Progress {
  const existing = readProgress(cwd);
  if (existing && currentIndex(existing) !== -1 && !force) {
    throw new Error(`"${existing.goal}" is still in progress. Finish it (helen next / helen done), or restart with --force.`);
  }
  const progress: Progress = {
    goal: plan.goalId,
    title: plan.goal.title,
    phase: plan.detection.phase,
    startedAt: new Date().toISOString(),
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
  if (step.kind === 'checkpoint' && !force && !(progress.lastCheck?.ok && progress.lastCheck.at >= progress.startedAt)) {
    throw new Error('This is a checkpoint: run `helen check` and get it passing first (or use --force and say why in the note).');
  }
  step.status = 'done';
  step.at = new Date().toISOString();
  if (note) step.note = note;
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
  save(cwd, progress);
  return progress;
}

export type ScriptRunner = (cwd: string, packageManager: string, script: string) => boolean;

const defaultRunner: ScriptRunner = (cwd, packageManager, script) =>
  spawnSync(packageManager, ['run', script], { cwd, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0;

/** Run the project's own typecheck, lint, test and build scripts (those that exist) as a gate. */
export function runChecks(cwd: string, runner: ScriptRunner = defaultRunner): CheckRun {
  const pkgFile = path.join(cwd, 'package.json');
  const scripts = fs.existsSync(pkgFile)
    ? ((JSON.parse(fs.readFileSync(pkgFile, 'utf-8')) as { scripts?: Record<string, string> }).scripts ?? {})
    : {};
  const detected = detectProject(cwd).packageManager;
  const packageManager = detected === 'unknown' ? 'npm' : detected;
  const results: CheckResult[] = [];
  for (const script of CHECK_SCRIPTS.filter(name => name in scripts)) {
    const ok = runner(cwd, packageManager, script);
    results.push({ script, ok });
    if (!ok) break;
  }
  const run: CheckRun = { ok: results.length > 0 && results.every(result => result.ok), at: new Date().toISOString(), results };
  const progress = readProgress(cwd);
  if (progress) {
    progress.lastCheck = run;
    save(cwd, progress);
  }
  return run;
}

const ICON: Record<StepStatus, string> = { done: '[x]', skipped: '[-]', pending: '[ ]' };

export function formatStatus(progress: Progress): string {
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
