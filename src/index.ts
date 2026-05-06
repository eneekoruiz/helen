import { Command } from 'commander';
import * as p from '@clack/prompts';
import { logger } from './core/logger.js';
import { detectProject } from './core/projectDetector.js';
import { runDoctor, printDoctorResults } from './core/doctor.js';
import { runModules, printSummary } from './core/moduleRunner.js';
import { getAllModuleIds, getModule, getAllModules } from './modules/registry.js';
import { showMainMenu, showModuleSelector, showExplainSelector, printModuleExplanation, printModuleList } from './menu/mainMenu.js';
import { generateModuleDocs } from './core/docs.js';
import { ejectModule } from './core/moduleRunner.js';
import { readConfig, updateConfig } from './core/config.js';
import { scaffoldProject } from './core/scaffold.js';
import { generateEntity } from './core/generator.js';
import type { HelenContext } from './core/context.js';



const VERSION = '1.0.0';

function buildContext(cwd: string, opts: { dryRun?: boolean; force?: boolean }): HelenContext {
  const project = detectProject(cwd);
  return {
    cwd,
    project,
    dryRun: opts.dryRun ?? false,
    force: opts.force ?? false,
    verbose: false,
  };
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
            const dryRunOpt = await p.confirm({ message: 'Dry-run mode? (preview without writing)', initialValue: false });
            if (p.isCancel(dryRunOpt)) break;
            const ctx = buildContext(cwd, { dryRun: dryRunOpt as boolean });
            const results = await runModules(selected as string[], ctx);
            printSummary(results);
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
        }
      }
    });

  // helen init
  program
    .command('init')
    .description('Initialize all modules (or use --dry-run to preview)')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('--force', 'Overwrite existing files', false)
    .action(async (opts: { dryRun: boolean; force: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      logger.info(`Installing all modules...`);
      const results = await runModules(getAllModuleIds(), ctx);
      printSummary(results);
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
    .action(async (moduleIds: string[], opts: { dryRun: boolean; force: boolean }) => {
      logger.banner();
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      logger.info(`Installing ${moduleIds.length} module(s)...`);
      const results = await runModules(moduleIds, ctx);
      
      if (!opts.dryRun && results.length > 0) {
        updateConfig(cwd, {
          projectName: ctx.project.name,
          framework: ctx.project.framework,
          packageManager: ctx.project.packageManager,
          installedModules: results.map(r => r.moduleId)
        });
      }
      
      printSummary(results);
    });

  // helen update
  program
    .command('update')
    .description('Update all installed modules to latest templates')
    .option('--dry-run', 'Preview changes without writing files', false)
    .action(async (opts: { dryRun: boolean }) => {
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
      printSummary(results);
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
      printSummary(results);
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

  return program;
}
