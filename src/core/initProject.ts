import fs from 'node:fs';
import path from 'node:path';
import { setupProject, type SetupAgent } from './setup.js';
import { guardrailsModule, PREPARE_SCRIPT } from '../modules/guardrails/index.js';
import { detectProject } from './projectDetector.js';
import { buildPlan, detectPhase, readPlaybooks, suggestedGoals } from './apply.js';
import { startProgress, readProgress, currentIndex } from './progress.js';
import { spawnSync } from 'node:child_process';
import { activateHooks } from './gitHooks.js';
import { createEmptyResult, type HelenContext } from './context.js';
import { isSafeProjectPath } from './fs.js';

export interface InitProjectOptions {
  name?: string;
  cwd: string;
  agents?: string[];
  goal?: string;
  yes?: boolean;
  dryRun?: boolean;
  /** Create a git repository when there is none and activate the hooks. Default: true. */
  git?: boolean;
}

export interface GitSetupResult {
  initialized: boolean;
  hooksActive: boolean;
  note?: string;
}

export interface InitProjectResult {
  projectDir: string;
  isNewFolder: boolean;
  chosenGoal: string;
  detectedPhase: string;
  setupResult: {
    skillsCreated: string[];
    skillsSkipped: string[];
    instructionFiles: string[];
  };
  guardrailsResult: {
    created: string[];
    modified: string[];
    skipped: string[];
  };
  gitResult: GitSetupResult;
  planResult: {
    goalId: string;
    title: string;
    phase: string;
    stepsCount: number;
    /** True when an unfinished plan was already tracked and has been preserved. */
    kept: boolean;
  };
  actionsTaken: string[];
  nextSteps: string[];
}

/** Create the repository when missing and point git at the hooks that guardrails installed. */
export function setupGit(targetDir: string, options: { enabled: boolean; dryRun: boolean }, actions: string[]): GitSetupResult {
  if (!options.enabled) return { initialized: false, hooksActive: false, note: 'Git setup skipped (--no-git).' };
  if (spawnSync('git', ['--version'], { stdio: 'ignore', windowsHide: true }).status !== 0) {
    return { initialized: false, hooksActive: false, note: 'git is not installed; hooks stay inactive.' };
  }
  const inside = fs.existsSync(targetDir) && spawnSync('git', ['-C', targetDir, 'rev-parse', '--show-toplevel'], { stdio: 'ignore', windowsHide: true }).status === 0;
  let initialized = false;
  if (!inside) {
    if (options.dryRun) {
      actions.push('[DRY-RUN] Would run git init');
      return { initialized: false, hooksActive: false };
    }
    if (spawnSync('git', ['-C', targetDir, 'init', '-q'], { stdio: 'ignore', windowsHide: true }).status !== 0) {
      return { initialized: false, hooksActive: false, note: 'git init failed; hooks stay inactive.' };
    }
    initialized = true;
    actions.push('Initialized a git repository');
  }
  if (options.dryRun || !fs.existsSync(path.join(targetDir, '.githooks'))) return { initialized, hooksActive: false };
  // A parent repository owns the folder when it is not a repository root: its shared hooks path stays untouched.
  const activation = activateHooks(targetDir);
  if (activation.changed && activation.active) actions.push('Activated the git hooks (core.hooksPath = .githooks)');
  return {
    initialized,
    hooksActive: activation.active,
    ...(activation.note ? { note: activation.note.includes('Not the root') ? 'Inside a parent git repository; hooks path left unchanged.' : activation.note } : {}),
  };
}

export async function runInitProject(options: InitProjectOptions): Promise<InitProjectResult> {
  const actionsTaken: string[] = [];
  const nextSteps: string[] = [];
  const dryRun = Boolean(options.dryRun);
  const playbooks = readPlaybooks();
  const validAgents: SetupAgent[] = ['claude', 'codex', 'antigravity'];
  const requestedAgents = (options.agents?.length ? options.agents : validAgents) as SetupAgent[];
  if (requestedAgents.some(agent => !validAgents.includes(agent))) {
    throw new Error(`Unknown agent. Supported agents: ${validAgents.join(', ')}`);
  }
  // Validate explicit goals before creating directories or installing files.
  if (options.goal) buildPlan(options.cwd, options.goal, playbooks);

  // 1. Determine target directory
  let targetDir = options.cwd;
  let isNewFolder = false;

  if (options.name && options.name !== '.' && options.name !== './') {
    targetDir = path.resolve(options.cwd, options.name);
    if (!isSafeProjectPath(options.cwd, targetDir)) {
      throw new Error('Project name must resolve to a directory inside the current project.');
    }
    if (fs.existsSync(targetDir) && !fs.statSync(targetDir).isDirectory()) {
      throw new Error(`Project path is not a directory: ${targetDir}`);
    }
    if (!fs.existsSync(targetDir)) {
      actionsTaken.push(`Create project directory: ${options.name}`);
      if (!dryRun) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      isNewFolder = true;
    } else {
      actionsTaken.push(`Adopt existing directory: ${options.name}`);
    }
  } else {
    actionsTaken.push(`Initialize in current directory: ${path.basename(targetDir)}`);
  }

  // Ensure a minimal package.json exists if directory is completely empty
  const pkgPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    const defaultPkgName = path.basename(path.resolve(targetDir));
    const minimalPkg = {
      name: defaultPkgName,
      version: '0.1.0',
      private: true,
      scripts: { prepare: PREPARE_SCRIPT },
    };
    actionsTaken.push('Create minimal package.json');
    if (!dryRun) {
      fs.writeFileSync(pkgPath, JSON.stringify(minimalPkg, null, 2) + '\n', 'utf-8');
    }
  }

  // 2. Setup agent instructions and skills
  const setupRes = setupProject({
    cwd: targetDir,
    agents: requestedAgents,
    flows: false,
    dryRun,
    force: false,
  });

  actionsTaken.push(
    `Setup agent skills: ${setupRes.skills.created.length} created, ${setupRes.skills.skipped.length} existing`
  );
  if (setupRes.instructionFiles.length) {
    actionsTaken.push(`Configured instructions in: ${setupRes.instructionFiles.join(', ')}`);
  }

  // 3. Add guardrails (git hooks & dependabot)
  const ctx: HelenContext = {
    cwd: targetDir,
    project: detectProject(targetDir),
    dryRun,
    force: false,
    verbose: false,
    settings: {},
  };

  let guardrailsRes = createEmptyResult('guardrails', 'Git Hooks & Dependabot');
  try {
    guardrailsRes = await guardrailsModule.execute(ctx);
    if (guardrailsRes.created.length) {
      actionsTaken.push(`Added guardrail files: ${guardrailsRes.created.join(', ')}`);
    }
    if (guardrailsRes.modified.length) {
      actionsTaken.push(`Configured package scripts: ${guardrailsRes.modified.join(', ')}`);
    }
  } catch (err) {
    // Non-fatal if guardrails fail on unconventional environments
    actionsTaken.push(`Guardrails note: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3b. Repository and hooks
  const gitResult = setupGit(targetDir, { enabled: options.git !== false, dryRun }, actionsTaken);
  if (gitResult.note) actionsTaken.push(gitResult.note);

  // 4. Determine phase and goal, then start tracking
  const detection = detectPhase(targetDir);
  let chosenGoal = options.goal;

  if (!chosenGoal) {
    // If empty or initial phase, default to strategy, else use suggested goal for phase
    if (detection.phase === '01-start-project' || !fs.existsSync(path.join(targetDir, 'src'))) {
      chosenGoal = 'strategy';
    } else {
      const suggested = suggestedGoals(detection.phase, playbooks);
      chosenGoal = suggested[0] || 'strategy';
    }
  }

  const plan = buildPlan(targetDir, chosenGoal, playbooks);
  const existingProgress = dryRun ? null : readProgress(targetDir);
  const unfinished = existingProgress !== null && currentIndex(existingProgress) !== -1;
  let kept = false;

  if (dryRun) {
    actionsTaken.push(`[DRY-RUN] Would start plan tracking for "${chosenGoal}" (${plan.goal.steps.length} steps)`);
  } else if (!existingProgress || !unfinished) {
    startProgress(targetDir, plan, true);
    actionsTaken.push(`Started plan tracking: "${chosenGoal}" (${plan.goal.steps.length} steps)`);
  } else if (existingProgress.goal === chosenGoal) {
    kept = true;
    actionsTaken.push(`Plan "${chosenGoal}" already tracked in .helen/progress.json`);
  } else {
    // Never discard recorded work: an unfinished plan wins over a re-run of init-project.
    kept = true;
    chosenGoal = existingProgress.goal;
    actionsTaken.push(`Kept the unfinished plan "${existingProgress.goal}". To switch: helen apply ${plan.goalId} --track --force`);
  }

  // 5. Build next steps
  if (isNewFolder && options.name) {
    nextSteps.push(`cd ${options.name}`);
  }
  nextSteps.push('helen next              # View your first recommended step');
  nextSteps.push('helen status            # Check overall roadmap and progress');
  nextSteps.push('helen check             # Run local project quality gates');
  nextSteps.push('helen apply --brief     # Copy ready-to-paste instructions for your AI agent');

  return {
    projectDir: targetDir,
    isNewFolder,
    chosenGoal,
    detectedPhase: detection.phase,
    setupResult: {
      skillsCreated: setupRes.skills.created,
      skillsSkipped: setupRes.skills.skipped,
      instructionFiles: setupRes.instructionFiles,
    },
    guardrailsResult: {
      created: guardrailsRes.created,
      modified: guardrailsRes.modified,
      skipped: guardrailsRes.skipped,
    },
    gitResult,
    planResult: kept && existingProgress
      ? { goalId: existingProgress.goal, title: existingProgress.title, phase: existingProgress.phase, stepsCount: existingProgress.steps.length, kept }
      : { goalId: plan.goalId, title: plan.goal.title, phase: plan.detection.phase, stepsCount: plan.goal.steps.length, kept },
    actionsTaken,
    nextSteps,
  };
}
