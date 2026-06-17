import { Command } from 'commander';
import * as p from '@clack/prompts';
import { logger } from './core/logger.js';
import { detectProject } from './core/projectDetector.js';
import { runDoctor, printDoctorResults } from './core/doctor.js';
import { runModules, printSummary } from './core/moduleRunner.js';
import { getAllModuleIds, getModule, getAllModules } from './modules/registry.js';
import { showMainMenu, showModuleSelector, showExplainSelector, printModuleExplanation, printModuleList } from './menu/mainMenu.js';
import { generateModuleDocs } from './core/docs.js';
import { printPromptContent, printPromptList, printPromptPath, type PromptKind } from './core/prompts.js';
import { ejectModule } from './core/moduleRunner.js';
import { readConfig, updateConfig } from './core/config.js';
import { scaffoldProject } from './core/scaffold.js';
import { generateEntity } from './core/generator.js';
import type { HelenContext } from './core/context.js';
import { getInstallCommand } from './core/packageManager.js';
import { runRollback } from './core/rollback.js';



const VERSION = '1.0.0';

function buildContext(cwd: string, opts: { dryRun?: boolean; force?: boolean; securityLevel?: string }): HelenContext {
  const project = detectProject(cwd);
  return {
    cwd,
    project,
    dryRun: opts.dryRun ?? false,
    force: opts.force ?? false,
    verbose: false,
    settings: opts.securityLevel ? { securityLevel: opts.securityLevel } : {},
  };
}

async function handleAutoInstall(results: any[], ctx: HelenContext, isInteractive: boolean): Promise<void> {
  if (ctx.dryRun) return;
  const packageJsonModified = results.some(r => r.modified.includes('package.json'));
  if (!packageJsonModified) return;

  const pm = ctx.project.packageManager;
  const installCmd = getInstallCommand(pm);

  if (isInteractive) {
    const shouldInstall = await p.confirm({
      message: `Dependencies have changed in package.json. Would you like to run "${installCmd}" automatically?`,
      initialValue: true,
    });
    
    if (p.isCancel(shouldInstall) || !shouldInstall) {
      return;
    }

    const spinner = p.spinner();
    spinner.start(`Installing dependencies via ${pm}...`);
    try {
      const { execSync } = await import('node:child_process');
      execSync(installCmd, { cwd: ctx.cwd, stdio: 'ignore' });
      spinner.stop(`Dependencies installed successfully via ${pm}!`);
    } catch (err) {
      spinner.stop(`Failed to install dependencies: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    logger.blank();
    logger.info(`Remember to run "${installCmd}" to install newly added dependencies.`);
  }
}

function persistResults(results: any[], ctx: HelenContext): void {
  if (ctx.dryRun || results.length === 0) return;
  const createdFiles = results.flatMap(r => r.created);
  updateConfig(ctx.cwd, {
    projectName: ctx.project.name,
    framework: ctx.project.framework,
    packageManager: ctx.project.packageManager,
    installedModules: results.map(r => r.moduleId),
    createdFiles: createdFiles,
  });
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('helen')
    .description('HELEN — Modern project setup CLI for React + Vite + TypeScript')
    .version(VERSION);

  // Default: interactive menu
  program
    .action(async () => {
      logger.banner();
      const cwd = process.cwd();
      const project = detectProject(cwd);
      logger.info(`Project: ${project.name} | Framework: ${project.framework} | PM: ${project.packageManager}`);
      logger.blank();

      let running = true;
      while (running) {
        const action = await showMainMenu();
        if (p.isCancel(action) || action === 'exit') {
          p.outro('Bye!');
          running = false;
          break;
        }

        switch (action) {
          case 'add': {
            const selected = await showModuleSelector();
            if (p.isCancel(selected)) break;

            let securityLevel: string | undefined = undefined;
            if ((selected as string[]).includes('security')) {
              const level = await p.select({
                message: 'Choose a cybersecurity level for your boilerplate:',
                options: [
                  { value: 'simple', label: 'Simple', hint: 'Standard Zod env, basic HTML escaping' },
                  { value: 'strict', label: 'Strict (Robust)', hint: 'Fail-fast Zod, strict sanitizers, Web Crypto AES-GCM ciphers, SHA-256 hashing, strict CSP setup' }
                ]
              });
              if (p.isCancel(level)) break;
              securityLevel = level as string;
            }

            const dryRunOpt = await p.confirm({ message: 'Dry-run mode? (preview without writing)', initialValue: false });
            if (p.isCancel(dryRunOpt)) break;
            const ctx = buildContext(cwd, { dryRun: dryRunOpt as boolean, securityLevel });
            const results = await runModules(selected as string[], ctx);
            persistResults(results, ctx);
            printSummary(results, ctx);
            await handleAutoInstall(results, ctx, true);
            break;
          }
          case 'rollback': {
            const confirm = await p.confirm({
              message: 'Are you sure you want to rollback all modifications and remove HELEN-created files?',
              initialValue: false,
            });
            if (p.isCancel(confirm) || !confirm) break;

            const dryRunOpt = await p.confirm({
              message: 'Dry-run mode? (preview rollback without making changes)',
              initialValue: false,
            });
            if (p.isCancel(dryRunOpt)) break;

            const rollbackResult = await runRollback(cwd, { dryRun: dryRunOpt as boolean });
            if (rollbackResult.restored.length === 0 && rollbackResult.removed.length === 0) {
              logger.info('No backups or created files found to rollback.');
            } else {
              logger.success(`Rollback completed: restored ${rollbackResult.restored.length} files, removed ${rollbackResult.removed.length} files.`);
            }
            break;
          }
          case 'easter-egg': {
            const { runEasterEgg } = await import('./core/easterEgg.js');
            await runEasterEgg();
            break;
          }
          case 'modules':
            printModuleList();
            break;
          case 'doctor': {
            const checks = runDoctor(cwd);
            printDoctorResults(checks, project);
            break;
          }
          case 'explain': {
            const moduleId = await showExplainSelector();
            if (p.isCancel(moduleId)) break;
            const mod = getModule(moduleId as string);
            if (mod) printModuleExplanation(mod);
            break;
          }
          case 'docs':
            printModuleList();
            break;
          case 'prompts':
            printPromptList();
            break;
        }
      }
    });

  // helen init
  program
    .command('init')
    .description('Initialize all modules (or use --dry-run to preview)')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('--force', 'Overwrite existing files', false)
    .option('--security-level <level>', 'Cybersecurity level (simple or strict)', 'simple')
    .option('--install', 'Automatically install dependencies after changes', false)
    .action(async (opts: { dryRun: boolean; force: boolean; securityLevel: string; install: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      logger.info(`Installing all modules...`);
      const results = await runModules(getAllModuleIds(), ctx);
      persistResults(results, ctx);
      printSummary(results, ctx);
      if (opts.install) {
        await handleAutoInstall(results, ctx, false);
      } else {
        const packageJsonModified = results.some(r => r.modified.includes('package.json'));
        if (packageJsonModified && !opts.dryRun) {
          logger.blank();
          logger.info(`Remember to run "${getInstallCommand(ctx.project.packageManager)}" to install new dependencies.`);
        }
      }
    });

  // helen create <name>
  program
    .command('create <name>')
    .description('Scaffold a new project from scratch')
    .option('--next', 'Use Next.js instead of Vite', false)
    .action(async (name: string, opts: { next: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const success = await scaffoldProject({
        name,
        type: opts.next ? 'next-ts' : 'vite-react-ts',
        cwd,
      });

      if (success) {
        p.outro(`Next steps: cd ${name} && helen init`);
      }
    });

  // helen generate <type> <name>
  program
    .command('generate <type> <name>')
    .alias('g')
    .description('Generate project entities (component, hook, page, entity)')
    .option('--dry-run', 'Preview without writing', false)
    .action(async (type: any, name: string, opts: { dryRun: boolean }) => {
      const cwd = process.cwd();
      await generateEntity({
        type,
        name,
        cwd,
        dryRun: opts.dryRun,
      });
    });


  // helen modules
  program
    .command('modules')
    .description('List all available modules')
    .action(() => {
      printModuleList();
    });

  // helen explain <module>
  program
    .command('explain <module>')
    .description('Show detailed documentation for a module')
    .action((moduleId: string) => {
      const mod = getModule(moduleId);
      if (!mod) {
        logger.error(`Module "${moduleId}" not found.`);
        logger.info(`Available modules: ${getAllModuleIds().join(', ')}`);
        process.exitCode = 1;
        return;
      }
      printModuleExplanation(mod);
    });

  // helen add <modules...>
  program
    .command('add <modules...>')
    .description('Add one or more modules to the project')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('--force', 'Overwrite existing files', false)
    .option('--security-level <level>', 'Cybersecurity level (simple or strict)', 'simple')
    .option('--install', 'Automatically install dependencies after changes', false)
    .action(async (moduleIds: string[], opts: { dryRun: boolean; force: boolean; securityLevel: string; install: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      logger.info(`Installing ${moduleIds.length} module(s)...`);
      const results = await runModules(moduleIds, ctx);
      
      persistResults(results, ctx);
      
      printSummary(results, ctx);
      if (opts.install) {
        await handleAutoInstall(results, ctx, false);
      } else {
        const packageJsonModified = results.some(r => r.modified.includes('package.json'));
        if (packageJsonModified && !opts.dryRun) {
          logger.blank();
          logger.info(`Remember to run "${getInstallCommand(ctx.project.packageManager)}" to install new dependencies.`);
        }
      }
    });

  // helen update
  program
    .command('update')
    .description('Update all installed modules to latest templates')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('--install', 'Automatically install dependencies after changes', false)
    .action(async (opts: { dryRun: boolean; install: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const config = readConfig(cwd);
      if (!config || config.installedModules.length === 0) {
        logger.warn('No modules detected in .helenrc. Use "helen init" or "helen add" first.');
        return;
      }
      const ctx = buildContext(cwd, { ...opts, force: true });
      logger.info(`Updating ${config.installedModules.length} modules...`);
      const results = await runModules(config.installedModules, ctx);
      printSummary(results, ctx);
      if (opts.install) {
        await handleAutoInstall(results, ctx, false);
      } else {
        const packageJsonModified = results.some(r => r.modified.includes('package.json'));
        if (packageJsonModified && !opts.dryRun) {
          logger.blank();
          logger.info(`Remember to run "${getInstallCommand(ctx.project.packageManager)}" to install new dependencies.`);
        }
      }
    });


  // helen eject <module>
  program
    .command('eject <module>')
    .description('Remove a module and its files')
    .option('--dry-run', 'Preview removal without deleting files', false)
    .action(async (moduleId: string, opts: { dryRun: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      await ejectModule(moduleId, ctx);
    });

  // helen generate-docs
  program
    .command('generate-docs')
    .description('Generate markdown documentation for all modules')
    .action(async () => {
      const cwd = process.cwd();
      await generateModuleDocs(cwd);
    });


  // helen rollback
  program
    .command('rollback')
    .alias('restore')
    .description('Rollback all HELEN-created changes and restore original files from backups')
    .option('--dry-run', 'Preview the rollback actions without applying them', false)
    .action(async (opts: { dryRun: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing rollback actions without modifying files.');
      }
      const rollbackResult = await runRollback(cwd, opts);
      if (rollbackResult.restored.length === 0 && rollbackResult.removed.length === 0) {
        logger.info('No backups or created files found to rollback.');
      } else {
        logger.success(`Rollback completed: restored ${rollbackResult.restored.length} files, removed ${rollbackResult.removed.length} files.`);
      }
    });

  // helen doctor
  program
    .command('doctor')
    .description('Check project health')
    .action(() => {
      const cwd = process.cwd();
      const project = detectProject(cwd);
      const checks = runDoctor(cwd);
      printDoctorResults(checks, project);
    });

  // helen dry-run
  program
    .command('dry-run')
    .description('Preview all modules without writing anything')
    .action(async () => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, { dryRun: true });
      logger.info('DRY-RUN: previewing all modules...');
      const results = await runModules(getAllModuleIds(), ctx);
      printSummary(results, ctx);
    });

  // helen docs
  program
    .command('docs')
    .description('Show documentation for all modules')
    .action(() => {
      const modules = getAllModules();
      for (const mod of modules) {
        printModuleExplanation(mod);
        console.log('─'.repeat(70));
      }
    });

  // helen prompts
  const prompts = program
    .command('prompts')
    .description('Browse reusable project prompts, atomic steps, checkpoints, and executable flows')
    .action(() => {
      printPromptList();
    });

  prompts
    .command('list')
    .description('List available prompts and flows')
    .option('--kind <kind>', 'Filter by kind: master, flow, step, checkpoint, prompt')
    .action((opts: { kind?: PromptKind }) => {
      printPromptList(opts.kind);
    });

  prompts
    .command('show <prompt>')
    .description('Print a prompt, step, checkpoint, or flow')
    .action((prompt: string) => {
      try {
        printPromptContent(prompt);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  prompts
    .command('path <prompt>')
    .description('Print the absolute path to a prompt, step, checkpoint, or flow')
    .action((prompt: string) => {
      try {
        printPromptPath(prompt);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  prompts
    .command('flow <flow>')
    .description('Print an executable flow such as full-polish, release-candidate, or client-delivery')
    .action((flow: string) => {
      try {
        printPromptContent(flow);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // helen scripts
  const scripts = program
    .command('scripts')
    .description('Manage and run utility scripts');

  scripts
    .command('easter-egg')
    .description('Run the vibrant 24-bit Truecolor console Easter Egg animation')
    .action(async () => {
      const { runEasterEgg } = await import('./core/easterEgg.js');
      await runEasterEgg();
    });

  // helen easter-egg (convenience alias)
  program
    .command('easter-egg')
    .description('Run the vibrant 24-bit Truecolor console Easter Egg animation')
    .action(async () => {
      const { runEasterEgg } = await import('./core/easterEgg.js');
      await runEasterEgg();
    });

  return program;
}
