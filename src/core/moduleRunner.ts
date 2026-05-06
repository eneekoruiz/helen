import type { HelenContext, ModuleResult } from './context.js';
import { getModule } from '../modules/registry.js';
import { logger } from './logger.js';
import pc from 'picocolors';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'node:path';

/**
 * Run a single module by ID in the given context.
 */
export async function runModule(
  moduleId: string,
  ctx: HelenContext,
): Promise<ModuleResult | null> {
  const mod = getModule(moduleId);

  if (!mod) {
    logger.error(`Module "${moduleId}" not found in registry.`);
    return null;
  }

  const spinner = ora({
    text: `Installing module: ${pc.bold(mod.meta.name)}...`,
    color: 'cyan',
    spinner: 'dots',
  });

  logger.section(`${mod.meta.name} (${mod.meta.category})`);
  logger.info(mod.meta.summary);

  if (ctx.dryRun) {
    logger.warn('DRY-RUN mode: no files will be written.');
  }

  try {
    spinner.start();
    const result = await mod.execute(ctx);
    spinner.succeed(`Module ${pc.bold(mod.meta.name)} installed.`);
    printResult(result);
    return result;
  } catch (err) {
    spinner.fail(`Module ${pc.bold(mod.meta.name)} failed.`);
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Module "${moduleId}" failed: ${message}`);
    console.error(err);
    return null;
  }
}



/**
 * Run multiple modules sequentially.
 */
export async function runModules(
  moduleIds: string[],
  ctx: HelenContext,
): Promise<ModuleResult[]> {
  const results: ModuleResult[] = [];

  for (const id of moduleIds) {
    const result = await runModule(id, ctx);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Print a module result summary.
 */
function printResult(result: ModuleResult): void {
  const { created, modified, skipped, warnings, nextSteps } = result;

  if (created.length > 0) {
    logger.success(`Created:  ${created.length} file(s)`);
  }
  if (modified.length > 0) {
    logger.info(`Modified: ${modified.length} file(s)`);
  }
  if (skipped.length > 0) {
    logger.warn(`Skipped:  ${skipped.length} file(s)`);
  }
  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.warn(w);
    }
  }
  if (nextSteps.length > 0) {
    console.log(`\n  ${pc.bold('Next steps:')}`);
    for (const step of nextSteps) {
      console.log(`    ${pc.dim('→')} ${step}`);
    }
  }

  logger.success(`Module "${result.moduleName}" completed.`);
}

/**
 * Eject a module: removes its files and reverts package.json changes where possible.
 */
export async function ejectModule(
  moduleId: string,
  ctx: HelenContext,
): Promise<boolean> {
  const mod = getModule(moduleId);
  if (!mod) {
    logger.error(`Module "${moduleId}" not found.`);
    return false;
  }

  logger.warn(`Ejecting module: ${pc.bold(mod.meta.name)}...`);
  
  if (ctx.dryRun) {
    logger.info(`[DRY-RUN] Would remove files: ${mod.meta.filesCreated.join(', ')}`);
    return true;
  }

  // Remove files
  for (const file of mod.meta.filesCreated) {
    const filePath = path.join(ctx.cwd, file);
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
      logger.step(`Removed: ${file}`);
    }
  }

  // Note: Reverting package.json and complex file modifications is omitted 
  // for safety in this version.
  
  logger.success(`Module ${mod.meta.name} ejected.`);
  return true;
}



/**
 * Print a final summary of all module results.
 */
export function printSummary(results: ModuleResult[]): void {
  logger.section('Summary');

  const totalCreated = results.reduce((a, r) => a + r.created.length, 0);
  const totalModified = results.reduce((a, r) => a + r.modified.length, 0);
  const totalSkipped = results.reduce((a, r) => a + r.skipped.length, 0);

  logger.success(`Created:  ${totalCreated} file(s)`);
  logger.info(`Modified: ${totalModified} file(s)`);
  logger.warn(`Skipped:  ${totalSkipped} file(s)`);

  const allNextSteps = results.flatMap((r) => r.nextSteps);
  if (allNextSteps.length > 0) {
    console.log(`\n  ${pc.bold('Next steps:')}`);
    for (const step of allNextSteps) {
      console.log(`    ${pc.dim('→')} ${step}`);
    }
  }

  logger.blank();
}
