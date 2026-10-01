import { Command } from 'commander';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { readPlaybooks, detectPhase, suggestedGoals, buildPlan, formatBrief, formatPlan } from '../core/apply.js';
import { installSkills, type SkillTarget } from '../core/skills.js';
import { startProgress, currentIndex, markDone, runChecks } from '../core/progress.js';
import { logger } from '../core/logger.js';

export function registerApplyCommand(program: Command) {
  program
    .command('apply [goal...]')
    .description('Analyze the project, detect its phase, and plan which HELEN prompts, skills and tools to use for a goal (e.g. "design", "release", "mejora el diseño")')
    .option('--brief', 'Print a paste-ready brief for an AI agent instead of the plan', false)
    .option('--track', 'Follow the plan step by step: then use helen next / done / skip / status / check', false)
    .option('--auto', 'Run in semi-autonomous mode: verify checkpoints automatically and execute steps', false)
    .option('--force', 'With --track: restart even if another plan is in progress', false)
    .option('--install', 'Install the bundled skills the goal needs into --target', false)
    .option('--target <targets...>', 'Where to install skills: claude, codex, custom', ['claude'])
    .option('--dir <path>', 'Project-relative directory for the "custom" target')
    .action(async (goalWords: string[], opts: { brief: boolean; track: boolean; auto: boolean; force: boolean; install: boolean; target: string[]; dir?: string }) => {
      try {
        const playbooks = readPlaybooks();
        const cwd = process.cwd();
        if (goalWords.length === 0) {
          const detection = detectPhase(cwd);
          const suggested = suggestedGoals(detection.phase, playbooks);
          if (isJsonMode()) {
            printJsonAndExit('apply', {
              detection,
              suggestedGoals: suggested,
              goals: Object.entries(playbooks.goals).map(([id, g]) => ({ id, title: g.title, description: g.description, keywords: g.keywords })),
            });
            return;
          }
          console.log(`Detected phase: ${detection.phase} (confidence ${detection.confidence}; estimate, please confirm)`);
          console.log(`Evidence: ${detection.evidence.join('; ')}`);
          console.log(`Suggested goals for this phase: ${suggested.join(', ')}`);
          console.log('\nAll goals:');
          for (const [id, goal] of Object.entries(playbooks.goals)) console.log(`  ${id.padEnd(13)} ${goal.title}`);
          console.log('\nRun: helen apply <goal>   (add --brief for an AI-ready brief, --install to install the needed skills)');
          return;
        }

        const plan = buildPlan(cwd, goalWords.join(' '), playbooks);

        if (opts.auto) {
          let prog = startProgress(cwd, plan, true);
          logger.section(`Autonomous Execution: ${plan.goal.title}`);
          const autoLogs: string[] = [];

          let idx = currentIndex(prog);
          while (idx !== -1) {
            const currentStep = prog.steps[idx]!;

            if (currentStep.kind === 'checkpoint') {
              logger.info(`Checking gate: ${currentStep.ref}...`);
              const checkRun = runChecks(cwd);
              if (!checkRun.ok) {
                const failed = checkRun.results.filter(r => !r.ok).map(r => r.script).join(', ');
                const errMsg = `Autonomous stop: checkpoint verification failed on scripts [${failed}].`;
                if (isJsonMode()) {
                  printJsonAndExit('apply', { plan, progress: prog, failedCheckpoint: currentStep }, {
                    ok: false,
                    errors: [errMsg],
                    exitCode: 3,
                  });
                  return;
                }
                logger.error(errMsg);
                process.exitCode = 3;
                return;
              }
              prog = markDone(cwd, 'Auto-verified quality gate', true);
              autoLogs.push(`Verified checkpoint: ${currentStep.ref}`);
              logger.success(`Passed checkpoint: ${currentStep.ref}`);
            } else {
              prog = markDone(cwd, `Auto-staged step (${currentStep.kind}: ${currentStep.ref})`, true);
              autoLogs.push(`Staged: ${currentStep.kind} ${currentStep.ref}`);
              logger.success(`Staged: ${currentStep.kind} ${currentStep.ref}`);
            }
            idx = currentIndex(prog);
          }

          if (isJsonMode()) {
            printJsonAndExit('apply', {
              plan,
              progress: prog,
              autoLogs,
              completed: true,
            });
            return;
          }
          logger.success(`Autonomous execution of goal "${plan.goalId}" completed successfully!`);
          return;
        }

        let progress = null;
        if (opts.track) {
          progress = startProgress(cwd, plan, opts.force);
        }

        let installedSkillsResult = null;
        if (opts.install && plan.missingSkills.length > 0) {
          installedSkillsResult = installSkills({
            cwd,
            targets: opts.target as SkillTarget[],
            customDir: opts.dir,
            skills: plan.missingSkills,
          });
        }

        if (isJsonMode()) {
          printJsonAndExit('apply', {
            plan,
            tracking: progress,
            installedSkills: installedSkillsResult,
          });
          return;
        }

        console.log(opts.brief ? formatBrief(plan) : formatPlan(plan));
        if (opts.track) {
          console.log('\nTracking started (.helen/progress.json; add .helen/ to .gitignore if you do not want it in git). Next: helen next');
        }
        if (installedSkillsResult) {
          logger.success(`Skills: ${installedSkillsResult.created.length} created, ${installedSkillsResult.skipped.length} skipped.`);
        }
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('apply', {}, {
            ok: false,
            errors: [err instanceof Error ? err.message : String(err)],
            exitCode: 1,
          });
          return;
        }
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
