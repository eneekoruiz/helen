import { Command } from 'commander';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { readProgress, formatStatus, runChecks, runFocusedChecks, currentIndex, formatNext, markDone, skipStep, resumeProgress } from '../core/progress.js';
import { logger } from '../core/logger.js';
import { repositoryFingerprint } from '../core/workflowContext.js';

export function registerProgressCommands(program: Command) {
  program.command('resume')
    .description('Resume the tracked session with decisions, repository context and current/stale verification evidence')
    .option('--decision <text>', 'Record a durable project decision before resuming')
    .action((opts: { decision?: string }) => {
      try {
        const result = resumeProgress(process.cwd(), opts.decision);
        if (isJsonMode()) { printJsonAndExit('resume', result); return; }
        console.log(result.instructions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isJsonMode()) { printJsonAndExit('resume', {}, { ok: false, errors: [message], exitCode: 1 }); return; }
        logger.error(message);
        process.exitCode = 1;
      }
    });
  // helen next / done / skip / status / check
  program
    .command('next')
    .description('Show the current step of the tracked plan, with the prompt or commands to use')
    .option('--short', 'Do not print the prompt text', false)
    .action((opts: { short: boolean }) => {
      try {
        const progress = readProgress(process.cwd());
        if (!progress) {
          if (isJsonMode()) {
            printJsonAndExit('next', { progress: null }, {
              ok: false,
              errors: ['Nothing is being tracked. Start with: helen apply <goal> --track'],
              exitCode: 1,
            });
            return;
          }
          throw new Error('Nothing is being tracked. Start with: helen apply <goal> --track');
        }
        const idx = currentIndex(progress);
        const currentStep = idx !== -1 ? progress.steps[idx] : null;
        if (isJsonMode()) {
          printJsonAndExit('next', {
            goal: progress.goal,
            title: progress.title,
            phase: progress.phase,
            currentIndex: idx,
            totalSteps: progress.steps.length,
            step: currentStep,
            progress,
            instructions: formatNext(progress, !opts.short),
          });
          return;
        }
        console.log(formatNext(progress, !opts.short));
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('next', {}, {
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

  program
    .command('done [note...]')
    .description('Mark the current step as done (checkpoints need a passing helen check)')
    .option('--force', 'Allow a checkpoint without a passing check (say why in the note)', false)
    .action((note: string[], opts: { force: boolean }) => {
      try {
        const progress = markDone(process.cwd(), note.join(' ') || undefined, opts.force);
        if (isJsonMode()) {
          printJsonAndExit('done', {
            progress,
            completedStepIndex: currentIndex(progress) === -1 ? progress.steps.length - 1 : currentIndex(progress) - 1,
          });
          return;
        }
        console.log(formatStatus(progress));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isCheckpoint = msg.toLowerCase().includes('checkpoint');
        if (isJsonMode()) {
          printJsonAndExit('done', {}, {
            ok: false,
            errors: [msg],
            exitCode: isCheckpoint ? 3 : 1,
          });
          return;
        }
        logger.error(msg);
        process.exitCode = isCheckpoint ? 3 : 1;
      }
    });

  program
    .command('skip <reason...>')
    .description('Skip the current step, recording why')
    .action((reason: string[]) => {
      try {
        const progress = skipStep(process.cwd(), reason.join(' '));
        if (isJsonMode()) {
          printJsonAndExit('skip', { progress });
          return;
        }
        console.log(formatStatus(progress));
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('skip', {}, {
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

  program
    .command('status')
    .description('Show progress of the tracked plan')
    .option('--html', 'Output dashboard in HTML format', false)
    .action(async (opts: { html: boolean }) => {
      const progress = readProgress(process.cwd());
      if (opts.html) {
        const { writeReport } = await import('../core/report.js');
        const { filePath: reportPath } = writeReport(process.cwd());
        if (isJsonMode()) {
          printJsonAndExit('status', { tracking: progress !== null, progress, reportPath });
          return;
        }
        logger.success(`HTML report generated at: ${reportPath}`);
        return;
      }
      if (isJsonMode()) {
        printJsonAndExit('status', {
          tracking: progress !== null,
          progress,
          verification: !progress?.lastCheck ? 'missing' : progress.lastCheck.fingerprint === repositoryFingerprint(process.cwd()) ? 'current' : 'stale',
        });
        return;
      }
      console.log(progress ? formatStatus(progress, process.cwd()) : 'Nothing is being tracked. Start with: helen apply <goal> --track');
    });

  program
    .command('check')
    .description("Run the project's typecheck, lint, test and build scripts as a gate; --focus/--scripts run partial checks only")
    .option('--focus <test-files...>', 'Run selected test files with a Vitest test script')
    .option('--scripts <names...>', 'Run only selected check scripts (typecheck, lint, test, build)')
    .action((opts: { focus?: string[]; scripts?: string[] }) => {
      if (opts.focus?.length && opts.scripts?.length) {
        const message = 'Use either --focus or --scripts, not both';
        if (isJsonMode()) printJsonAndExit('check', { scope: 'focused', checkpointEligible: false }, { ok: false, errors: [message], exitCode: 1 });
        else { logger.error(message); process.exitCode = 1; }
        return;
      }
      if (opts.focus?.length || opts.scripts?.length) {
        try {
          const run = runFocusedChecks(process.cwd(), opts.focus?.length ? { files: opts.focus } : { scripts: opts.scripts! });
          if (isJsonMode()) {
            printJsonAndExit('check', run, { ok: run.ok, exitCode: run.ok ? 0 : 1 });
            return;
          }
          const selected = run.scope.kind === 'tests' ? run.scope.files.join(', ') : run.scope.scripts.join(', ');
          console.log(`Focused checks (${run.scope.kind}): ${selected}`);
          console.log('Partial checks do not satisfy checkpoints; run `helen check` for the full gate.');
          if (run.ok) logger.success('Focused checks passed.');
          else logger.error('Focused checks failed.');
          process.exitCode = run.ok ? 0 : 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (isJsonMode()) printJsonAndExit('check', { scope: 'focused', checkpointEligible: false }, { ok: false, errors: [message], exitCode: 1 });
          else { logger.error(message); process.exitCode = 1; }
        }
        return;
      }

      const run = runChecks(process.cwd());
      if (isJsonMode()) {
        printJsonAndExit('check', {
          ok: run.ok,
          at: run.at,
          results: run.results,
        }, {
          ok: run.ok,
          exitCode: run.ok ? 0 : 3, // checkpoint failure code 3
        });
        return;
      }
      if (run.results.length === 0) {
        logger.warn('No typecheck, lint, test or build scripts found in package.json.');
      }
      if (run.ok) {
        logger.success('Checks passed.');
      } else {
        logger.error('Checks failed.');
      }
      process.exitCode = run.ok ? 0 : 3;
    });
}
