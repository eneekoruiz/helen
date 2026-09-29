import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCatalogItem } from './catalog.js';
import { resolvePromptEntry } from './prompts.js';
import { SKILL_TARGETS, listSkills } from './skills.js';

export type StepKind = 'prompt' | 'flow' | 'checkpoint' | 'skill' | 'external';

export interface PlaybookStep {
  kind: StepKind;
  ref: string;
  why: string;
}

export interface Goal {
  title: string;
  description: string;
  keywords: string[];
  steps: PlaybookStep[];
}

export interface Playbooks {
  phaseGoals: Record<string, string[]>;
  goals: Record<string, Goal>;
}

export interface PhaseDetection {
  phase: string;
  confidence: 'low' | 'medium';
  evidence: string[];
}

export interface ApplyPlan {
  detection: PhaseDetection;
  goalId: string;
  goal: Goal;
  installedSkills: string[];
  missingSkills: string[];
}

const PLAYBOOKS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'prompts', 'playbooks.json');

export function readPlaybooks(file: string = PLAYBOOKS_FILE): Playbooks {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Playbooks;
}

function has(cwd: string, ...parts: string[]): boolean {
  return fs.existsSync(path.join(cwd, ...parts));
}

function readPackageScripts(cwd: string): Record<string, string> {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Heuristic, transparent phase estimate. It only reads the file system and
 * always reports its evidence: the agent or the user confirms the result.
 */
export function detectPhase(cwd: string): PhaseDetection {
  const evidence: string[] = [];
  const scripts = readPackageScripts(cwd);
  const hasPackage = has(cwd, 'package.json');
  const hasSource = has(cwd, 'src') || has(cwd, 'app') || has(cwd, 'pages');
  const hasTests = has(cwd, 'tests') || has(cwd, 'test') || has(cwd, '__tests__') || 'test' in scripts;
  const hasCi = has(cwd, '.github', 'workflows');
  const hasChangelog = has(cwd, 'CHANGELOG.md');
  const hasDeploy = ['vercel.json', 'netlify.toml', 'wrangler.toml', 'Dockerfile'].some(file => has(cwd, file));
  const hasKnowledge = has(cwd, 'AGENTS.md') || has(cwd, 'CLAUDE.md') || has(cwd, 'docs', 'decisions') || has(cwd, 'docs', 'adr');

  if (hasPackage) evidence.push('package.json present');
  if (hasSource) evidence.push('source folder present');
  if (hasTests) evidence.push('tests present');
  if (hasCi) evidence.push('CI workflows present');
  if (hasChangelog) evidence.push('CHANGELOG.md present');
  if (hasDeploy) evidence.push('deploy config present');
  if (hasKnowledge) evidence.push('AI context or decision records present');

  let phase: string;
  if (!hasPackage && !hasSource) phase = '01-start-project';
  else if (!hasTests || !hasCi) phase = '02-building';
  else if (hasChangelog && hasDeploy && hasKnowledge) phase = '08-maintenance';
  else if (hasChangelog && hasDeploy) phase = '07-client-handoff';
  else if (hasChangelog) phase = '06-release';
  else phase = '03-finish-features';

  if (evidence.length === 0) evidence.push('no project files found');
  return { phase, confidence: evidence.length >= 4 ? 'medium' : 'low', evidence };
}

export function installedSkillNames(cwd: string, extraDirs: string[] = []): string[] {
  const dirs = [...Object.values(SKILL_TARGETS), ...extraDirs];
  const names = new Set<string>();
  for (const dir of dirs) {
    const full = path.join(cwd, dir);
    if (!fs.existsSync(full)) continue;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(full, entry.name, 'SKILL.md'))) names.add(entry.name);
    }
  }
  return [...names].sort();
}

/** Resolve a goal id, or match free text (Spanish or English) against goal keywords. */
export function resolveGoal(input: string, playbooks: Playbooks = readPlaybooks()): string | undefined {
  const text = input.trim().toLowerCase();
  if (text in playbooks.goals) return text;
  let best: { id: string; score: number } | undefined;
  for (const [id, goal] of Object.entries(playbooks.goals)) {
    const score = goal.keywords.filter(keyword => text.includes(keyword)).length;
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }
  return best?.id;
}

export function buildPlan(cwd: string, goalInput: string, playbooks: Playbooks = readPlaybooks()): ApplyPlan {
  const goalId = resolveGoal(goalInput, playbooks);
  if (!goalId) {
    throw new Error(`No goal matches "${goalInput}". Goals: ${Object.keys(playbooks.goals).join(', ')}`);
  }
  const goal = playbooks.goals[goalId]!;
  const installedSkills = installedSkillNames(cwd);
  const bundled = new Set(listSkills().map(skill => skill.name));
  const neededSkills = goal.steps.filter(step => step.kind === 'skill').map(step => step.ref);
  const missingSkills = neededSkills.filter(name => bundled.has(name) && !installedSkills.includes(name));
  return { detection: detectPhase(cwd), goalId, goal, installedSkills, missingSkills };
}

export function suggestedGoals(phase: string, playbooks: Playbooks = readPlaybooks()): string[] {
  return playbooks.phaseGoals[phase] ?? [];
}

function command(step: PlaybookStep): string {
  if (step.kind === 'external') return `helen skills external ${step.ref}`;
  if (step.kind === 'skill') return `skill: ${step.ref}`;
  return `helen prompts show ${step.ref}`;
}

export function formatPlan(plan: ApplyPlan): string {
  const lines: string[] = [];
  lines.push(`Detected phase: ${plan.detection.phase} (confidence ${plan.detection.confidence}; estimate, please confirm)`);
  lines.push(`Evidence: ${plan.detection.evidence.join('; ')}`);
  lines.push(`Goal: ${plan.goalId} - ${plan.goal.title}`);
  lines.push(plan.goal.description);
  lines.push('');
  plan.goal.steps.forEach((step, index) => {
    lines.push(`${String(index + 1).padStart(2)}. [${step.kind}] ${step.ref}`);
    lines.push(`      ${step.why}`);
    lines.push(`      ${command(step)}`);
  });
  lines.push('');
  if (plan.missingSkills.length > 0) {
    lines.push(`Bundled skills not installed here: ${plan.missingSkills.join(', ')}`);
    lines.push(`Install them: helen skills install ${plan.missingSkills.join(' ')} --target claude codex`);
  } else {
    lines.push('All bundled skills this goal needs are installed (or none are needed).');
  }
  lines.push('External tools are never installed by HELEN: review each with `helen skills external <id>` and the audit-third-party-skills-supply-chain prompt.');
  return lines.join('\n');
}

/** A paste-ready brief for any AI agent that has access to the HELEN repository or CLI. */
export function formatBrief(plan: ApplyPlan): string {
  const steps = plan.goal.steps
    .map((step, index) => `${index + 1}. [${step.kind}] ${step.ref}: ${step.why}. Use: ${command(step)}`)
    .join('\n');
  return [
    'Use the HELEN repository (prompts, skills and catalog) to work on this project.',
    `Estimated phase: ${plan.detection.phase}. Confirm it from the repository before acting.`,
    `Goal: ${plan.goal.title}. ${plan.goal.description}`,
    '',
    'Follow these steps in order. Read each prompt with the command shown, apply it, and stop if a checkpoint fails:',
    steps,
    '',
    'Rules:',
    '- Do not install any external tool without showing me its commands and getting my approval.',
    '- Use at most one main design skill.',
    '- Never invent content, testimonials, metrics, logos or claims.',
    '- Keep changes minimal and verify with build, lint and tests when they exist.',
    '- At the end, report: steps done, steps skipped and why, changes, remaining risks, manual actions.',
  ].join('\n');
}

/** Checks that every step of every playbook points at something that exists. */
export function validatePlaybooks(playbooks: Playbooks = readPlaybooks()): string[] {
  const issues: string[] = [];
  const bundled = new Set(listSkills().map(skill => skill.name));

  for (const [goalId, goal] of Object.entries(playbooks.goals)) {
    if (goal.steps.length === 0) issues.push(`goal ${goalId} has no steps`);
    for (const step of goal.steps) {
      try {
        if (step.kind === 'external') getCatalogItem(step.ref);
        else if (step.kind === 'skill') {
          if (!bundled.has(step.ref)) throw new Error(`bundled skill "${step.ref}" not found`);
        } else resolvePromptEntry(step.ref);
      } catch (err) {
        issues.push(`goal ${goalId}: ${step.kind} ${step.ref}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  for (const [phase, goals] of Object.entries(playbooks.phaseGoals)) {
    for (const goalId of goals) {
      if (!(goalId in playbooks.goals)) issues.push(`phase ${phase} references unknown goal ${goalId}`);
    }
  }
  return issues;
}
