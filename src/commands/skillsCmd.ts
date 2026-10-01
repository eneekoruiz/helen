import { Command } from 'commander';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { logger } from '../core/logger.js';
import { SKILL_TARGETS, installSkills, listFlowSkills, listSkills, type SkillTarget } from '../core/skills.js';
import { installedSkillNames } from '../core/apply.js';
import { updateAgentSetup } from '../core/agentDoctor.js';
import { listCatalog, getCatalogItem, compareCatalogItems, checkCatalogHealth } from '../core/catalog.js';

export function registerSkillsCommands(program: Command) {
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
    .option('--check', 'Check catalog health, freshness, and flag discontinued tools', false)
    .action((opts: { category?: string; kind?: string; check?: boolean }) => {
      if (opts.check) {
        const health = checkCatalogHealth();
        if (isJsonMode()) {
          printJsonAndExit('skills:catalog:check', health);
          return;
        }
        logger.section('Catalog Health & Verification');
        logger.info(`Total items: ${health.total} (${health.active} active, ${health.caution} caution, ${health.discontinued} discontinued)`);
        if (health.issues.length === 0) {
          logger.success('All catalog entries pass validation.');
        } else {
          for (const issue of health.issues) {
            console.log(`  [${issue.level.toUpperCase()}] ${issue.id}: ${issue.message}`);
          }
        }
        return;
      }

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
    .command('compare <id1> <id2>')
    .description('Compare features, licenses, and overlapping capabilities between two catalog tools')
    .action((id1: string, id2: string) => {
      try {
        const comp = compareCatalogItems(id1, id2);
        if (isJsonMode()) {
          printJsonAndExit('skills:compare', comp);
          return;
        }
        logger.section(`Catalog Comparison: ${comp.item1.name} vs ${comp.item2.name}`);
        console.log(`Category: ${comp.item1.category} ${comp.sameCategory ? '(Match)' : `vs ${comp.item2.category}`}`);
        console.log(`Kind:     ${comp.item1.kind} ${comp.sameKind ? '(Match)' : `vs ${comp.item2.kind}`}`);
        console.log(`License:  ${comp.item1.license} vs ${comp.item2.license}`);
        console.log(`Shared Phases: ${comp.sharedPhases.join(', ') || 'None'}`);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('skills:compare', {}, {
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
  
}
