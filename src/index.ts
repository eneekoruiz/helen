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
import { buildPlan, detectPhase, formatBrief, formatPlan, readPlaybooks, suggestedGoals, installedSkillNames, validatePlaybooks } from './core/apply.js';
import { getCatalogItem, listCatalog } from './core/catalog.js';
import { formatNext, formatStatus, markDone, readProgress, runChecks, skipStep, startProgress } from './core/progress.js';
import { readGuide } from './core/guide.js';
import { setupProject, type SetupAgent } from './core/setup.js';
import { lintPrompts } from './core/promptLint.js';
import { SKILL_TARGETS, installSkills, listFlowSkills, listSkills, type SkillTarget } from './core/skills.js';
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
          case 'signature': {
            const { runEnekoRuizArt } = await import('./core/cinematicArt.js');
            await runEnekoRuizArt();
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
    .option('--kind <kind>', 'Filter by kind: master, guide, flow, step, checkpoint, prompt')
    .action((opts: { kind?: PromptKind }) => {
      printPromptList(opts.kind);
    });

  prompts
    .command('lint')
    .description('Validate prompt frontmatter and links against the Premium Prompt Contract')
    .action(() => {
      const issues = lintPrompts();
      const playbookIssues = validatePlaybooks();
      for (const issue of issues) {
        logger.error(`${issue.file}: ${issue.message}`);
      }
      for (const issue of playbookIssues) {
        logger.error(`playbooks.json: ${issue}`);
      }
      if (issues.length > 0 || playbookIssues.length > 0) {
        process.exitCode = 1;
        return;
      }
      logger.success('Prompt library is valid.');
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

  // helen next / done / skip / status / check
  program
    .command('next')
    .description('Show the current step of the tracked plan, with the prompt or commands to use')
    .option('--short', 'Do not print the prompt text', false)
    .action((opts: { short: boolean }) => {
      try {
        const progress = readProgress(process.cwd());
        if (!progress) throw new Error('Nothing is being tracked. Start with: helen apply <goal> --track');
        console.log(formatNext(progress, !opts.short));
      } catch (err) {
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
        console.log(formatStatus(markDone(process.cwd(), note.join(' ') || undefined, opts.force)));
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  program
    .command('skip <reason...>')
    .description('Skip the current step, recording why')
    .action((reason: string[]) => {
      try {
        console.log(formatStatus(skipStep(process.cwd(), reason.join(' '))));
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  program
    .command('status')
    .description('Show progress of the tracked plan')
    .action(() => {
      const progress = readProgress(process.cwd());
      console.log(progress ? formatStatus(progress) : 'Nothing is being tracked. Start with: helen apply <goal> --track');
    });

  program
    .command('check')
    .description("Run the project's own typecheck, lint, test and build scripts as a gate")
    .action(() => {
      const run = runChecks(process.cwd());
      if (run.results.length === 0) {
        logger.warn('No typecheck, lint, test or build scripts found in package.json.');
      }
      run.ok ? logger.success('Checks passed.') : logger.error('Checks failed.');
      process.exitCode = run.ok ? 0 : 1;
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
        logger.success(`Skills: ${result.skills.created.length} created, ${result.skills.skipped.length} already there. Instructions: ${result.instructionFiles.join(', ')}.`);
        console.log('\nNext: tell your AI "Use HELEN: analyze where the project is and what to apply", or run: helen apply');
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // helen guide
  program
    .command('guide')
    .description('Print the user guide: what prompts, skills, catalog and playbooks are and how to use them')
    .action(() => {
      console.log(readGuide());
    });

  // helen apply
  program
    .command('apply [goal...]')
    .description('Analyze the project, detect its phase, and plan which HELEN prompts, skills and tools to use for a goal (e.g. "design", "release", "mejora el diseño")')
    .option('--brief', 'Print a paste-ready brief for an AI agent instead of the plan', false)
    .option('--track', 'Follow the plan step by step: then use helen next / done / skip / status / check', false)
    .option('--force', 'With --track: restart even if another plan is in progress', false)
    .option('--install', 'Install the bundled skills the goal needs into --target', false)
    .option('--target <targets...>', 'Where to install skills: claude, codex, custom', ['claude'])
    .option('--dir <path>', 'Project-relative directory for the "custom" target')
    .action((goalWords: string[], opts: { brief: boolean; track: boolean; force: boolean; install: boolean; target: string[]; dir?: string }) => {
      try {
        const playbooks = readPlaybooks();
        const cwd = process.cwd();
        if (goalWords.length === 0) {
          const detection = detectPhase(cwd);
          console.log(`Detected phase: ${detection.phase} (confidence ${detection.confidence}; estimate, please confirm)`);
          console.log(`Evidence: ${detection.evidence.join('; ')}`);
          console.log(`Suggested goals for this phase: ${suggestedGoals(detection.phase, playbooks).join(', ')}`);
          console.log('\nAll goals:');
          for (const [id, goal] of Object.entries(playbooks.goals)) console.log(`  ${id.padEnd(13)} ${goal.title}`);
          console.log('\nRun: helen apply <goal>   (add --brief for an AI-ready brief, --install to install the needed skills)');
          return;
        }
        const plan = buildPlan(cwd, goalWords.join(' '), playbooks);
        console.log(opts.brief ? formatBrief(plan) : formatPlan(plan));
        if (opts.track) {
          startProgress(cwd, plan, opts.force);
          console.log('\nTracking started (.helen/progress.json; add .helen/ to .gitignore if you do not want it in git). Next: helen next');
        }
        if (opts.install && plan.missingSkills.length > 0) {
          const result = installSkills({ cwd, targets: opts.target as SkillTarget[], customDir: opts.dir, skills: plan.missingSkills });
          logger.success(`Skills: ${result.created.length} created, ${result.skipped.length} skipped.`);
        }
      } catch (err) {
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
      for (const skill of [...listSkills(), ...(opts.flows ? listFlowSkills() : [])]) {
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
        logger.success(`Skills: ${result.created.length} created, ${result.overwritten.length} overwritten, ${result.skipped.length} skipped.`);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  skills
    .command('installed')
    .description('Show which skills are installed in this project')
    .action(() => {
      const names = installedSkillNames(process.cwd());
      console.log(names.length > 0 ? names.join('\n') : 'No skills installed in .claude/skills or .agents/skills.');
    });

  skills
    .command('catalog')
    .description('List recommended third-party skills and tools (HELEN never installs them for you)')
    .option('--category <category>', 'Filter: design, quality, copy, seo, motion, components, verify, deploy, workflow, docs, data')
    .option('--kind <kind>', 'Filter: skill, plugin, cli, reference, service, mcp')
    .action((opts: { category?: string; kind?: string }) => {
      for (const item of listCatalog(opts.category, undefined, opts.kind)) {
        console.log(`${item.id.padEnd(22)} ${item.category.padEnd(11)} ${item.kind.padEnd(10)} ${item.status.padEnd(12)} ${item.summary}`);
      }
    });

  skills
    .command('external <id>')
    .description('Show what a catalog item is and the exact commands to install it (prints only, runs nothing)')
    .action((id: string) => {
      try {
        const item = getCatalogItem(id);
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

  return program;
}
