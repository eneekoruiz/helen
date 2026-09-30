import { Command } from 'commander';
import * as p from '@clack/prompts';
import path from 'node:path';
import { logger } from './core/logger.js';
import { detectProject } from './core/projectDetector.js';
import { runDoctor, printDoctorResults } from './core/doctor.js';
import { runModules, printSummary } from './core/moduleRunner.js';
import { getAllModuleIds, getModule, getAllModules } from './modules/registry.js';
import { showMainMenu, showModuleSelector, showExplainSelector, printModuleExplanation, printModuleList } from './menu/mainMenu.js';
import { generateModuleDocs } from './core/docs.js';
import { printPromptContent, printPromptList, printPromptPath, searchPrompts, shortId, listPromptEntries, resolvePromptEntry, readPrompt, type PromptKind } from './core/prompts.js';
import { updatePhaseIndexes } from './core/promptIndex.js';
import { ejectModule } from './core/moduleRunner.js';
import { buildPlan, detectPhase, formatBrief, formatPlan, readPlaybooks, suggestedGoals, installedSkillNames, validatePlaybooks } from './core/apply.js';
import { getCatalogItem, listCatalog, validateCatalog } from './core/catalog.js';
import { currentIndex, formatNext, formatStatus, markDone, readProgress, runChecks, skipStep, startProgress } from './core/progress.js';
import { runAgentDoctor, updateAgentSetup } from './core/agentDoctor.js';
import { readGuide } from './core/guide.js';
import { setupProject, type SetupAgent } from './core/setup.js';
import { lintPrompts } from './core/promptLint.js';
import { SKILL_TARGETS, installSkills, listFlowSkills, listSkills, validateSkills, type SkillTarget } from './core/skills.js';
import { readConfig, updateConfig } from './core/config.js';
import { scaffoldProject } from './core/scaffold.js';
import { generateEntity } from './core/generator.js';
import type { HelenContext } from './core/context.js';
import { getInstallCommand } from './core/packageManager.js';
import { runRollback } from './core/rollback.js';
import { validateAllEvals } from './core/evals.js';
import { isJsonMode, setJsonMode, printJsonAndExit, clearJsonBuffers } from './core/jsonOutput.js';
import { runInitProject } from './core/initProject.js';

const VERSION = '2.1.0';

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

function runLint(): number {
  const promptIssues = lintPrompts().map(issue => `${issue.file}: ${issue.message}`);
  const playbookIssues = validatePlaybooks().map(issue => `playbooks.json: ${issue}`);
  const skillIssues = validateSkills().map(issue => `skills: ${issue}`);
  const evalIssues = validateAllEvals().map(issue => `evals: ${issue}`);
  const catalog = validateCatalog();
  const catalogErrors = catalog.filter(issue => issue.level === 'error').map(issue => `catalog ${issue.id}: ${issue.message}`);
  const catalogWarns = catalog.filter(issue => issue.level === 'warn').map(issue => `catalog ${issue.id}: ${issue.message}`);

  const allErrors = [...promptIssues, ...playbookIssues, ...skillIssues, ...evalIssues, ...catalogErrors];
  const allWarnings = [...catalogWarns];

  if (isJsonMode()) {
    const exitCode = allErrors.length > 0 ? 1 : allWarnings.length > 0 ? 2 : 0;
    printJsonAndExit('lint', {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    }, {
      ok: allErrors.length === 0,
      warnings: allWarnings,
      errors: allErrors,
      exitCode,
    });
    return exitCode;
  }

  for (const issue of catalogWarns) logger.warn(`catalog: ${issue}`);
  for (const error of allErrors) logger.error(error);
  if (allErrors.length > 0) return 1;
  logger.success('HELEN library is valid (prompts, indexes, playbooks, skills, catalog, evals).');
  return allWarnings.length > 0 ? 2 : 0;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('helen')
    .description('HELEN — AI Agent Operating System & Project Scaffolding CLI')
    .version(VERSION)
    .option('--json', 'Output machine-readable JSON envelope', false)
    .hook('preAction', (thisCommand) => {
      clearJsonBuffers();
      if (process.argv.includes('--json') || thisCommand.opts().json) {
        setJsonMode(true);
      }
    });

  // Default: interactive menu
  program
    .action(async () => {
      if (isJsonMode()) {
        printJsonAndExit('root', {}, {
          ok: false,
          errors: ['Interactive menu cannot be run in --json mode. Specify a command (e.g., helen status --json, helen apply --json).'],
          exitCode: 1,
        });
        return;
      }
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
          case 'signature': {
            const { runEnekoRuizArt } = await import('./core/cinematicArt.js');
            await runEnekoRuizArt();
            break;
          }
          case 'modules':
            printModuleList();
            break;
          case 'doctor': {
            printDoctorResults([...runDoctor(cwd), ...runAgentDoctor(cwd)], project);
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
          case 'apply': {
            const detection = detectPhase(cwd);
            console.log(`Detected phase: ${detection.phase} (estimate). Suggested goals: ${suggestedGoals(detection.phase).join(', ')}`);
            console.log('Run: helen apply <goal>');
            break;
          }
          case 'guide':
            console.log(readGuide());
            break;
        }
      }
    });

  // helen init-project [name]
  program
    .command('init-project [name]')
    .description('One command to ready a project: adopts or creates folder, runs setup, adds guardrails, and starts tracking apply <goal>')
    .option('--agents <agents...>', 'Agents to configure: claude, codex, antigravity', ['claude', 'codex', 'antigravity'])
    .option('--goal <goal>', 'Initial goal to plan and track (default: strategy for new project, or phase recommendation)')
    .option('--yes', 'Skip confirmation prompts', false)
    .option('--dry-run', 'Preview actions without modifying disk', false)
    .action(async (name?: string, opts?: { agents: string[]; goal?: string; yes?: boolean; dryRun?: boolean }) => {
      try {
        const result = await runInitProject({
          name,
          cwd: process.cwd(),
          agents: opts?.agents,
          goal: opts?.goal,
          yes: opts?.yes,
          dryRun: opts?.dryRun,
        });

        if (isJsonMode()) {
          printJsonAndExit('init-project', result);
          return;
        }

        logger.section(`Initialized Project: ${path.basename(result.projectDir)}`);
        for (const action of result.actionsTaken) {
          logger.step(action);
        }
        logger.blank();
        logger.success(`Ready! Plan "${result.chosenGoal}" active (${result.planResult.stepsCount} steps).`);
        console.log('\nNext steps:');
        for (const step of result.nextSteps) {
          console.log(`  ${step}`);
        }
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('init-project', {}, {
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

  // helen init
  program
    .command('init')
    .description('Initialize all modules (or use --dry-run to preview)')
    .option('--dry-run', 'Preview changes without writing files', false)
    .option('--force', 'Overwrite existing files', false)
    .option('--security-level <level>', 'Cybersecurity level (simple or strict)', 'simple')
    .option('--install', 'Automatically install dependencies after changes', false)
    .action(async (opts: { dryRun: boolean; force: boolean; securityLevel: string; install: boolean }) => {
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      if (opts.dryRun && !isJsonMode()) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      const results = await runModules(getAllModuleIds(), ctx);
      persistResults(results, ctx);
      if (isJsonMode()) {
        printJsonAndExit('init', { results });
        return;
      }
      logger.banner();
      logger.info(`Installing all modules...`);
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
      const cwd = process.cwd();
      const success = await scaffoldProject({
        name,
        type: opts.next ? 'next-ts' : 'vite-react-ts',
        cwd,
      });

      if (isJsonMode()) {
        printJsonAndExit('create', { name, success, type: opts.next ? 'next-ts' : 'vite-react-ts' }, { ok: success });
        return;
      }
      logger.banner();
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
      if (isJsonMode()) {
        printJsonAndExit('generate', { type, name, dryRun: opts.dryRun });
      }
    });

  // helen modules
  program
    .command('modules')
    .description('List all available modules')
    .action(() => {
      if (isJsonMode()) {
        printJsonAndExit('modules', { modules: getAllModules().map(m => m.meta) });
        return;
      }
      printModuleList();
    });

  // helen explain <module>
  program
    .command('explain <module>')
    .description('Show detailed documentation for a module')
    .action((moduleId: string) => {
      const mod = getModule(moduleId);
      if (!mod) {
        if (isJsonMode()) {
          printJsonAndExit('explain', {}, {
            ok: false,
            errors: [`Module "${moduleId}" not found. Available: ${getAllModuleIds().join(', ')}`],
            exitCode: 1,
          });
          return;
        }
        logger.error(`Module "${moduleId}" not found.`);
        logger.info(`Available modules: ${getAllModuleIds().join(', ')}`);
        process.exitCode = 1;
        return;
      }
      if (isJsonMode()) {
        printJsonAndExit('explain', { module: mod.meta });
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
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      const results = await runModules(moduleIds, ctx);
      persistResults(results, ctx);

      if (isJsonMode()) {
        printJsonAndExit('add', { results });
        return;
      }

      logger.banner();
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing changes without writing files');
      }
      logger.info(`Installing ${moduleIds.length} module(s)...`);
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
      const cwd = process.cwd();
      const config = readConfig(cwd);
      if (!config || config.installedModules.length === 0) {
        if (isJsonMode()) {
          printJsonAndExit('update', {}, {
            ok: false,
            warnings: ['No modules detected in .helenrc. Use "helen init" or "helen add" first.'],
            exitCode: 2,
          });
          return;
        }
        logger.warn('No modules detected in .helenrc. Use "helen init" or "helen add" first.');
        return;
      }
      const ctx = buildContext(cwd, { ...opts, force: true });
      const results = await runModules(config.installedModules, ctx);

      if (isJsonMode()) {
        printJsonAndExit('update', { results });
        return;
      }

      logger.banner();
      logger.info(`Updating ${config.installedModules.length} modules...`);
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
      const cwd = process.cwd();
      const ctx = buildContext(cwd, opts);
      await ejectModule(moduleId, ctx);
      if (isJsonMode()) {
        printJsonAndExit('eject', { moduleId, dryRun: opts.dryRun });
      }
    });

  // helen generate-docs
  program
    .command('generate-docs')
    .description('Generate markdown documentation for all modules')
    .action(async () => {
      const cwd = process.cwd();
      await generateModuleDocs(cwd);
      if (isJsonMode()) {
        printJsonAndExit('generate-docs', { success: true });
      }
    });

  // helen rollback
  program
    .command('rollback')
    .alias('restore')
    .description('Rollback all HELEN-created changes and restore original files from backups')
    .option('--dry-run', 'Preview the rollback actions without applying them', false)
    .action(async (opts: { dryRun: boolean }) => {
      const cwd = process.cwd();
      const rollbackResult = await runRollback(cwd, opts);
      if (isJsonMode()) {
        printJsonAndExit('rollback', rollbackResult);
        return;
      }
      logger.banner();
      if (opts.dryRun) {
        logger.warn('DRY-RUN mode: previewing rollback actions without modifying files.');
      }
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
    .option('--fix', 'Automatically repair safe issues (hooks, dependabot, skills, .helenrc)', false)
    .action(async (opts: { fix?: boolean }) => {
      const cwd = process.cwd();
      const project = detectProject(cwd);
      let fixReport = null;
      if (opts.fix) {
        const { repairDoctorIssues } = await import('./core/doctorFix.js');
        fixReport = repairDoctorIssues(cwd);
      }
      const issues = [...runDoctor(cwd), ...runAgentDoctor(cwd)];
      if (isJsonMode()) {
        const errorCount = issues.filter(i => i.status === 'error').length;
        const warnCount = issues.filter(i => i.status === 'warn').length;
        const exitCode = errorCount > 0 ? 1 : warnCount > 0 ? 2 : 0;
        printJsonAndExit('doctor', { project, issues, fixReport }, {
          ok: errorCount === 0,
          exitCode,
        });
        return;
      }
      if (fixReport && fixReport.fixed.length > 0) {
        logger.section('Auto-Fix Remediation Applied');
        for (const item of fixReport.fixed) {
          logger.success(`Fixed: ${item}`);
        }
        logger.blank();
      }
      printDoctorResults(issues, project);
    });

  // helen dry-run
  program
    .command('dry-run')
    .description('Preview all modules without writing anything')
    .action(async () => {
      const cwd = process.cwd();
      const ctx = buildContext(cwd, { dryRun: true });
      const results = await runModules(getAllModuleIds(), ctx);
      if (isJsonMode()) {
        printJsonAndExit('dry-run', { results });
        return;
      }
      logger.banner();
      logger.info('DRY-RUN: previewing all modules...');
      printSummary(results, ctx);
    });

  // helen docs
  program
    .command('docs')
    .description('Show documentation for all modules')
    .action(() => {
      const modules = getAllModules();
      if (isJsonMode()) {
        printJsonAndExit('docs', { modules: modules.map(m => m.meta) });
        return;
      }
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
      if (isJsonMode()) {
        printJsonAndExit('prompts', { prompts: listPromptEntries().map(e => ({ id: shortId(e), fullId: e.id, summary: e.summary, kind: e.kind })) });
        return;
      }
      printPromptList();
    });

  prompts
    .command('list')
    .description('List available prompts and flows')
    .option('--kind <kind>', 'Filter by kind: master, guide, flow, checkpoint, prompt')
    .action((opts: { kind?: PromptKind }) => {
      const entries = listPromptEntries().filter(entry => !opts.kind || entry.kind === opts.kind);
      if (isJsonMode()) {
        printJsonAndExit('prompts:list', {
          kind: opts.kind ?? 'all',
          count: entries.length,
          prompts: entries.map(e => ({
            id: shortId(e),
            fullId: e.id,
            kind: e.kind,
            phase: e.phase,
            action: e.action,
            summary: e.summary,
            path: e.relativePath,
          })),
        });
        return;
      }
      printPromptList(opts.kind);
    });

  prompts
    .command('search <words...>')
    .description('Find prompts by words in their id, title, summary or aliases')
    .action((words: string[]) => {
      const query = words.join(' ');
      const results = searchPrompts(query);
      if (isJsonMode()) {
        printJsonAndExit('prompts:search', {
          query,
          count: results.length,
          results: results.map(e => ({
            id: shortId(e),
            fullId: e.id,
            kind: e.kind,
            phase: e.phase,
            action: e.action,
            summary: e.summary,
            path: e.relativePath,
          })),
        });
        return;
      }
      if (results.length === 0) {
        logger.warn('No prompt matches. Try other words or: helen prompts list');
        return;
      }
      for (const entry of results.slice(0, 15)) {
        console.log(`${shortId(entry).padEnd(46)} ${entry.summary}`);
      }
    });

  prompts
    .command('index')
    .description('Regenerate the prompt index in every phase README from prompt frontmatter')
    .action(() => {
      const changed = updatePhaseIndexes(true);
      if (isJsonMode()) {
        printJsonAndExit('prompts:index', { changed });
        return;
      }
      logger.success(changed.length ? `Updated: ${changed.join(', ')}` : 'All phase indexes are up to date.');
    });

  prompts
    .command('lint')
    .description('Same as `helen lint`')
    .action(() => {
      process.exitCode = runLint();
    });

  prompts
    .command('show <prompt>')
    .description('Print a prompt, step, checkpoint, or flow')
    .action((promptName: string) => {
      try {
        const entry = resolvePromptEntry(promptName);
        const content = readPrompt(promptName);
        if (isJsonMode()) {
          printJsonAndExit('prompts:show', {
            id: shortId(entry),
            fullId: entry.id,
            kind: entry.kind,
            summary: entry.summary,
            path: entry.relativePath,
            content,
          });
          return;
        }
        printPromptContent(promptName);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:show', {}, {
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

  prompts
    .command('path <prompt>')
    .description('Print the absolute path to a prompt, step, checkpoint, or flow')
    .action((promptName: string) => {
      try {
        const entry = resolvePromptEntry(promptName);
        if (isJsonMode()) {
          printJsonAndExit('prompts:path', {
            id: shortId(entry),
            fullId: entry.id,
            absolutePath: entry.absolutePath,
            relativePath: entry.relativePath,
          });
          return;
        }
        printPromptPath(promptName);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:path', {}, {
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

  prompts
    .command('flow <flow>')
    .description('Print an executable flow such as full-polish, release-candidate, or client-delivery')
    .action((flow: string) => {
      try {
        const entry = resolvePromptEntry(flow);
        const content = readPrompt(flow);
        if (isJsonMode()) {
          printJsonAndExit('prompts:flow', {
            id: shortId(entry),
            fullId: entry.id,
            kind: entry.kind,
            path: entry.relativePath,
            content,
          });
          return;
        }
        printPromptContent(flow);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:flow', {}, {
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
    .action(() => {
      const progress = readProgress(process.cwd());
      if (isJsonMode()) {
        printJsonAndExit('status', {
          tracking: progress !== null,
          progress,
        });
        return;
      }
      console.log(progress ? formatStatus(progress) : 'Nothing is being tracked. Start with: helen apply <goal> --track');
    });

  program
    .command('check')
    .description("Run the project's own typecheck, lint, test and build scripts as a gate")
    .action(() => {
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
      run.ok ? logger.success('Checks passed.') : logger.error('Checks failed.');
      process.exitCode = run.ok ? 0 : 3;
    });

  // helen setup
  program
    .command('setup')
    .description('One command: install HELEN skills for your agents and add HELEN instructions to AGENTS.md / CLAUDE.md')
    .option('--agents <agents...>', 'claude, codex, antigravity', ['claude', 'codex', 'antigravity'])
    .option('--flows', 'Also install every executable flow as a skill', false)
    .option('--dry-run', 'Preview without writing files', false)
    .option('--force', 'Overwrite existing skill files', false)
    .action((opts: { agents: string[]; flows: boolean; dryRun: boolean; force: boolean }) => {
      try {
        const invalid = opts.agents.filter(agent => !['claude', 'codex', 'antigravity'].includes(agent));
        if (invalid.length > 0) throw new Error(`Unknown agent(s): ${invalid.join(', ')}. Valid: claude, codex, antigravity`);
        const result = setupProject({ cwd: process.cwd(), agents: opts.agents as SetupAgent[], flows: opts.flows, dryRun: opts.dryRun, force: opts.force });
        if (isJsonMode()) {
          printJsonAndExit('setup', {
            agents: opts.agents,
            flows: opts.flows,
            skillsCreated: result.skills.created,
            skillsSkipped: result.skills.skipped,
            instructions: result.instructionFiles,
          });
          return;
        }
        logger.success(`Skills: ${result.skills.created.length} created, ${result.skills.skipped.length} already there. Instructions: ${result.instructionFiles.join(', ')}.`);
        console.log('\nNext: tell your AI "Use HELEN: analyze where the project is and what to apply", or run: helen apply');
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('setup', {}, {
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

  // helen lint
  program
    .command('lint')
    .description('Validate the whole HELEN library: prompts, indexes, playbooks, skills, catalog and evals')
    .action(() => {
      process.exitCode = runLint();
    });

  // helen guide
  program
    .command('guide')
    .description('Print the user guide: what prompts, skills, catalog and playbooks are and how to use them')
    .action(() => {
      const guideText = readGuide();
      if (isJsonMode()) {
        printJsonAndExit('guide', { guide: guideText });
        return;
      }
      console.log(guideText);
    });

  // helen apply
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
          const { startProgress: startProg, currentIndex: currIdx, markDone: doneStep, runChecks: checksRunner } = await import('./core/progress.js');
          let prog = startProg(cwd, plan, true);
          logger.section(`Autonomous Execution: ${plan.goal.title}`);
          const autoLogs: string[] = [];

          let idx = currIdx(prog);
          while (idx !== -1) {
            const currentStep = prog.steps[idx]!;

            if (currentStep.kind === 'checkpoint') {
              logger.info(`Checking gate: ${currentStep.ref}...`);
              const checkRun = checksRunner(cwd);
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
              prog = doneStep(cwd, 'Auto-verified quality gate');
              autoLogs.push(`Verified checkpoint: ${currentStep.ref}`);
              logger.success(`Passed checkpoint: ${currentStep.ref}`);
            } else {
              prog = doneStep(cwd, `Auto-staged step (${currentStep.kind}: ${currentStep.ref})`);
              autoLogs.push(`Staged: ${currentStep.kind} ${currentStep.ref}`);
              logger.success(`Staged: ${currentStep.kind} ${currentStep.ref}`);
            }
            idx = currIdx(prog);
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

  // helen skills
  const skills = program
    .command('skills')
    .description('Browse and install agent skills (SKILL.md folders)');

  skills
    .command('list')
    .description('List bundled skills (add --flows to include prompt flows)')
    .option('--flows', 'Include executable prompt flows as skills', false)
    .action((opts: { flows: boolean }) => {
      const skillsList = [...listSkills(), ...(opts.flows ? listFlowSkills() : [])];
      if (isJsonMode()) {
        printJsonAndExit('skills:list', {
          count: skillsList.length,
          skills: skillsList.map(s => ({
            name: s.name,
            isFlow: s.name.startsWith('helen-flow-'),
          })),
        });
        return;
      }
      for (const skill of skillsList) {
        console.log(skill.name);
      }
    });

  skills
    .command('install [names...]')
    .description('Install skills into the current project for one or more agents')
    .option('--target <targets...>', `Targets: ${Object.keys(SKILL_TARGETS).join(', ')}, custom`, ['claude'])
    .option('--dir <path>', 'Project-relative directory for the "custom" target (any agent that scans a skills folder)')
    .option('--flows', 'Also install executable prompt flows as helen-flow-<id> skills', false)
    .option('--dry-run', 'Preview without writing files', false)
    .option('--force', 'Overwrite existing files', false)
    .action((names: string[], opts: { target: string[]; dir?: string; flows: boolean; dryRun: boolean; force: boolean }) => {
      try {
        const valid = [...Object.keys(SKILL_TARGETS), 'custom'];
        const invalid = opts.target.filter(t => !valid.includes(t));
        if (invalid.length > 0) {
          throw new Error(`Unknown target(s): ${invalid.join(', ')}. Valid: ${valid.join(', ')}`);
        }
        const result = installSkills({
          cwd: process.cwd(),
          targets: opts.target as SkillTarget[],
          customDir: opts.dir,
          skills: names,
          flows: opts.flows,
          dryRun: opts.dryRun,
          force: opts.force,
        });
        if (isJsonMode()) {
          printJsonAndExit('skills:install', {
            created: result.created,
            overwritten: result.overwritten,
            skipped: result.skipped,
          });
          return;
        }
        logger.success(`Skills: ${result.created.length} created, ${result.overwritten.length} overwritten, ${result.skipped.length} skipped.`);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('skills:install', {}, {
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

  skills
    .command('update')
    .description('Update installed HELEN skills and the HELEN block in AGENTS.md / CLAUDE.md to this HELEN version (backs up changed files)')
    .option('--dry-run', 'Preview without writing files', false)
    .action((opts: { dryRun: boolean }) => {
      const result = updateAgentSetup(process.cwd(), opts.dryRun);
      if (isJsonMode()) {
        printJsonAndExit('skills:update', {
          dryRun: opts.dryRun,
          updatedSkills: result.skills,
          updatedInstructions: result.instructionFiles,
        });
        return;
      }
      if (result.skills.length === 0 && result.instructionFiles.length === 0) {
        logger.success('Everything is already up to date.');
        return;
      }
      logger.success(`Updated skills: ${result.skills.join(', ') || 'none'}. Instruction files: ${result.instructionFiles.join(', ') || 'none'}.`);
    });

  skills
    .command('installed')
    .description('Show which skills are installed in this project')
    .action(() => {
      const names = installedSkillNames(process.cwd());
      if (isJsonMode()) {
        printJsonAndExit('skills:installed', {
          count: names.length,
          installed: names,
        });
        return;
      }
      console.log(names.length > 0 ? names.join('\n') : 'No skills installed in .claude/skills or .agents/skills.');
    });

  skills
    .command('catalog')
    .description('List recommended third-party skills and tools (HELEN never installs them for you)')
    .option('--category <category>', 'Filter: design, quality, copy, seo, motion, components, verify, deploy, workflow, docs, data')
    .option('--kind <kind>', 'Filter: skill, plugin, cli, reference, service, mcp')
    .action((opts: { category?: string; kind?: string }) => {
      const items = listCatalog(opts.category, undefined, opts.kind);
      if (isJsonMode()) {
        printJsonAndExit('skills:catalog', {
          count: items.length,
          items,
        });
        return;
      }
      for (const item of items) {
        console.log(`${item.id.padEnd(22)} ${item.category.padEnd(11)} ${item.kind.padEnd(10)} ${item.status.padEnd(12)} ${item.summary}`);
      }
    });

  skills
    .command('external <id>')
    .description('Show what a catalog item is and the exact commands to install it (prints only, runs nothing)')
    .action((id: string) => {
      try {
        const item = getCatalogItem(id);
        if (isJsonMode()) {
          printJsonAndExit('skills:external', { item });
          return;
        }
        console.log(`${item.name} [${item.kind}, ${item.status}]`);
        if (item.status === 'discontinued') console.log('WARNING: discontinued. Do not install.');
        console.log(item.summary);
        console.log(`Source:  ${item.source}`);
        console.log(`License: ${item.license}`);
        console.log(`Phases:  ${item.phases.join(', ')}`);
        console.log('\nInstall (review, then run yourself):');
        for (const command of item.install) console.log(`  ${command}`);
        if (item.notes) console.log(`\nNote: ${item.notes}`);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('skills:external', {}, {
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

  // helen scripts
  const scripts = program
    .command('scripts')
    .description('Manage and run utility scripts');

  scripts
    .command('easter-egg')
    .description("Run Helen's cinematic terminal art sequence")
    .action(async () => {
      const { runEasterEgg } = await import('./core/easterEgg.js');
      await runEasterEgg();
    });

  scripts
    .command('signature')
    .description('Run the ENEKO RUIZ cinematic signature sequence')
    .action(async () => {
      const { runEnekoRuizArt } = await import('./core/cinematicArt.js');
      await runEnekoRuizArt();
    });

  // helen easter-egg (convenience alias)
  program
    .command('easter-egg')
    .description("Run Helen's cinematic terminal art sequence")
    .action(async () => {
      const { runEasterEgg } = await import('./core/easterEgg.js');
      await runEasterEgg();
    });

  // helen signature
  program
    .command('signature')
    .description('Run the ENEKO RUIZ cinematic signature sequence')
    .action(async () => {
      const { runEnekoRuizArt } = await import('./core/cinematicArt.js');
      await runEnekoRuizArt();
    });

  // helen report
  program
    .command('report')
    .description('Generate an interactive HTML dashboard and project health report')
    .option('--open', 'Open the generated report in your default browser', false)
    .action(async (opts: { open?: boolean }) => {
      const cwd = process.cwd();
      const { writeReport, openInBrowser } = await import('./core/report.js');
      const { data, filePath } = writeReport(cwd);
      if (isJsonMode()) {
        printJsonAndExit('report', data);
        return;
      }
      logger.section('HELEN Project Report');
      logger.success(`Dashboard generated: ${filePath}`);
      logger.info(`Phase: ${data.phase.current} (${data.phase.progressPercentage}% done)`);
      logger.info(`Health: ${data.health.passed}/${data.health.total} checks passing`);
      if (opts.open) {
        openInBrowser(filePath);
      } else {
        logger.info(`To view in browser, run with --open or open: ${filePath}`);
      }
    });

  // helen token-budget
  program
    .command('token-budget [target]')
    .description('Estimate token usage and costs across AI models for prompts and playbooks')
    .action(async (target?: string) => {
      const { computeTokenBudget, printTokenBudget } = await import('./core/tokenBudget.js');
      const summary = computeTokenBudget(target);
      if (isJsonMode()) {
        printJsonAndExit('token-budget', summary);
        return;
      }
      printTokenBudget(summary);
    });

  // helen mcp
  program
    .command('mcp')
    .description('Start the HELEN Model Context Protocol (MCP) server over stdio')
    .action(async () => {
      const { startMcpServer } = await import('./core/mcp.js');
      startMcpServer(process.stdin, process.stdout);
    });

  return program;
}
