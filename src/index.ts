import { printPromptList, resolvePromptEntry, readPrompt } from './core/prompts.js';
import { registerPromptsCommands } from './commands/promptsCmd.js';
import { registerSkillsCommands } from './commands/skillsCmd.js';
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


import { ejectModule } from './core/moduleRunner.js';
import { detectPhase, readPlaybooks, suggestedGoals, validatePlaybooks } from './core/apply.js';
import { validateCatalog } from './core/catalog.js';
import { registerProgressCommands } from './commands/progressCmd.js';
import { registerApplyCommand } from './commands/applyCmd.js';
import { runAgentDoctor } from './core/agentDoctor.js';
import { readGuide } from './core/guide.js';
import { setupProject, uninstallProject, detectInstalledAgents, type SetupAgent } from './core/setup.js';
import { lintPrompts } from './core/promptLint.js';
import { validateSkills } from './core/skills.js';
import { readConfig, updateConfig, getConfigValue, setConfigValue } from './core/config.js';
import { scaffoldProject } from './core/scaffold.js';
import { generateEntity } from './core/generator.js';
import type { HelenContext } from './core/context.js';
import { getInstallCommand } from './core/packageManager.js';
import { runRollback } from './core/rollback.js';
import { validateAllEvals } from './core/evals.js';
import { isJsonMode, setJsonMode, printJsonAndExit, clearJsonBuffers } from './core/jsonOutput.js';
import { runInitProject } from './core/initProject.js';

const VERSION = '2.1.0';

interface ModuleRunResult {
  moduleId: string;
  created: string[];
  modified: string[];
}

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

async function handleAutoInstall(results: ModuleRunResult[], ctx: HelenContext, isInteractive: boolean): Promise<void> {
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

function persistResults(results: ModuleRunResult[], ctx: HelenContext): void {
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

export function runLint(): number {
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
    .action(async (type: "component" | "hook" | "page" | "entity", name: string, opts: { dryRun: boolean }) => {
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

  // helen explain <target>
  program
    .command('explain <target>')
    .description('Show detailed documentation for a module or prompt (including token budget & cost)')
    .action(async (target: string) => {
      const mod = getModule(target);
      if (mod) {
        if (isJsonMode()) {
          printJsonAndExit('explain', { module: mod.meta });
          return;
        }
        printModuleExplanation(mod);
        return;
      }

      try {
        const entry = resolvePromptEntry(target);
        const raw = readPrompt(target);
        const { estimateTokens, calculateCost } = await import('./core/tokenBudget.js');
        const tokens = estimateTokens(raw);
        const cost = calculateCost(tokens);
        if (isJsonMode()) {
          printJsonAndExit('explain', {
            targetType: 'prompt',
            id: entry.id,
            title: entry.title,
            phase: entry.phase,
            summary: entry.summary,
            tokens,
            estimatedCostUsd: cost.claudeSonnet,
            costs: cost,
          });
          return;
        }
        logger.section(`Prompt: ${entry.title}`);
        logger.info(`ID: ${entry.id} (${entry.kind})`);
        if (entry.phase) logger.info(`Phase: ${entry.phase}`);
        logger.info(`Summary: ${entry.summary}`);
        logger.info(`Tokens: ~${tokens.toLocaleString()} (~$${cost.claudeSonnet.toFixed(4)} with Claude 3.5 Sonnet)`);
        return;
      } catch {
        // Not a prompt either
      }

      if (isJsonMode()) {
        printJsonAndExit('explain', {}, {
          ok: false,
          errors: [`Target "${target}" not found as a module or prompt. Available modules: ${getAllModuleIds().join(', ')}`],
          exitCode: 1,
        });
        return;
      }
      logger.error(`Target "${target}" not found as a module or prompt.`);
      logger.info(`Available modules: ${getAllModuleIds().join(', ')}`);
      process.exitCode = 1;
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
  registerPromptsCommands(program);
  registerProgressCommands(program);

  // helen setup
  program
    .command('setup')
    .description('One command: install HELEN skills for your agents and add HELEN instructions to AGENTS.md / CLAUDE.md')
    .option('--agents <agents...>', 'claude, codex, antigravity (auto-detected if omitted)')
    .option('--global', 'Install skills globally to user agent directories (~/.claude, ~/.gemini)', false)
    .option('--flows', 'Also install every executable flow as a skill', false)
    .option('--dry-run', 'Preview without writing files', false)
    .option('--force', 'Overwrite existing skill files', false)
    .action((opts: { agents?: string[]; flows: boolean; dryRun: boolean; force: boolean; global: boolean }) => {
      try {
        const targetAgents = opts.agents && opts.agents.length > 0 ? opts.agents : detectInstalledAgents();
        const invalid = targetAgents.filter(agent => !['claude', 'codex', 'antigravity'].includes(agent));
        if (invalid.length > 0) throw new Error(`Unknown agent(s): ${invalid.join(', ')}. Valid: claude, codex, antigravity`);
        const result = setupProject({
          cwd: process.cwd(),
          agents: targetAgents as SetupAgent[],
          flows: opts.flows,
          dryRun: opts.dryRun,
          force: opts.force,
          global: opts.global,
        });
        if (isJsonMode()) {
          printJsonAndExit('setup', {
            agents: targetAgents,
            global: opts.global,
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

  registerApplyCommand(program);

  // helen skills
  registerSkillsCommands(program);
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

  // helen config
  program
    .command('config [key] [value]')
    .description('Inspect or update configuration settings in .helenrc')
    .action(async (key?: string, value?: string) => {
      const cwd = process.cwd();
      const conf = readConfig(cwd) || {};

      if (!key) {
        if (isJsonMode()) {
          printJsonAndExit('config', { config: conf });
          return;
        }
        console.log(JSON.stringify(conf, null, 2));
        return;
      }

      if (value === undefined) {
        const val = getConfigValue(cwd, key);
        if (isJsonMode()) {
          printJsonAndExit('config', { key, value: val });
          return;
        }
        console.log(val !== undefined ? val : `(not set)`);
        return;
      }

      setConfigValue(cwd, key, value);
      if (isJsonMode()) {
        printJsonAndExit('config', { key, value, updated: true });
        return;
      }
      logger.success(`Updated ${key} = ${value}`);
    });

  // helen completion
  program
    .command('completion [shell]')
    .description('Generate shell autocompletion script (bash, zsh, fish, powershell)')
    .action((shell = 'bash') => {
      const cmds = program.commands.map(c => c.name()).join(' ');
      const goals = Object.keys(readPlaybooks().goals).join(' ');
      let script = '';
      if (shell === 'bash') {
        script = `_helen_completions() {\n  local cur="\${COMP_WORDS[COMP_CWORD]}"\n  local prev="\${COMP_WORDS[COMP_CWORD-1]}"\n  if [[ "$prev" == "helen" ]]; then\n    COMPREPLY=( $(compgen -W "${cmds}" -- "$cur") )\n  elif [[ "$prev" == "apply" ]]; then\n    COMPREPLY=( $(compgen -W "${goals}" -- "$cur") )\n  fi\n}\ncomplete -F _helen_completions helen`;
      } else if (shell === 'zsh') {
        script = `#compdef helen\n_arguments "1: :(${cmds})" "*: :(${goals})"`;
      } else if (shell === 'fish') {
        script = `complete -c helen -n "__fish_use_subcommand" -a "${cmds}"\ncomplete -c helen -n "__fish_seen_subcommand_from apply" -a "${goals}"`;
      } else {
        script = `Register-ArgumentCompleter -Native -CommandName helen -ScriptBlock {\n  param($wordToComplete, $commandAst, $cursorPosition)\n  '${cmds}' -split ' ' | Where-Object { $_ -like "$wordToComplete*" }\n}`;
      }
      if (isJsonMode()) {
        printJsonAndExit('completion', { shell, script });
        return;
      }
      console.log(script);
    });

  // helen uninstall
  program
    .command('uninstall')
    .description('Cleanly remove installed HELEN skills, instructions, and configuration')
    .option('--dry-run', 'Preview changes without modifying filesystem', false)
    .action(async (opts: { dryRun: boolean }) => {
      const res = uninstallProject({ cwd: process.cwd(), dryRun: opts.dryRun });
      if (isJsonMode()) {
        printJsonAndExit('uninstall', res);
        return;
      }
      logger.success(`Removed instructions from: ${res.cleanedInstructions.join(', ') || 'none'}`);
      logger.success(`Removed skills: ${res.removedSkills.length}`);
    });

  return program;
}
