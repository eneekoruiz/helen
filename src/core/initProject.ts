import fs from 'node:fs';
import path from 'node:path';
import { setupProject, type SetupAgent } from './setup.js';
import { guardrailsModule } from '../modules/guardrails/index.js';
import { detectProject } from './projectDetector.js';
import { buildPlan, detectPhase, readPlaybooks, suggestedGoals } from './apply.js';
import { startProgress, readProgress } from './progress.js';
import { createEmptyResult, type HelenContext } from './context.js';
import { isSafeProjectPath } from './fs.js';

export interface InitProjectOptions {
  name?: string;
  cwd: string;
  agents?: string[];
  goal?: string;
  yes?: boolean;
  dryRun?: boolean;
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
  planResult: {
    goalId: string;
    title: string;
    phase: string;
    stepsCount: number;
  };
  actionsTaken: string[];
  nextSteps: string[];
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
      scripts: {},
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

  if (!dryRun) {
    // Start tracking the plan (safely re-usable)
    const existingProgress = readProgress(targetDir);
    if (!existingProgress || existingProgress.goal !== chosenGoal) {
      startProgress(targetDir, plan, true);
      actionsTaken.push(`Started plan tracking: "${chosenGoal}" (${plan.goal.steps.length} steps)`);
    } else {
      actionsTaken.push(`Plan "${chosenGoal}" already tracked in .helen/progress.json`);
    }
  } else {
    actionsTaken.push(`[DRY-RUN] Would start plan tracking for "${chosenGoal}" (${plan.goal.steps.length} steps)`);
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
    planResult: {
      goalId: plan.goalId,
      title: plan.goal.title,
      phase: plan.detection.phase,
      stepsCount: plan.goal.steps.length,
    },
    actionsTaken,
    nextSteps,
  };
}
