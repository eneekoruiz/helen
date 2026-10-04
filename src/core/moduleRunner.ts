import type { HelenContext, ModuleResult } from './context.js';
import { validateModuleResult, validateContextSettings } from './context.js';
import { getModule } from '../modules/registry.js';
import { logger, withCapturedErrors } from './logger.js';
import { patchPackageJson, readJson, isSafeProjectPath } from './fs.js';
import { getInstallCommand, getRunCommand } from './packageManager.js';
import pc from 'picocolors';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'node:path';
import { writeAtomicFile, removeTrackedFile } from './operations.js';
import { renderPreview } from './preview.js';
import { isJsonMode } from './jsonOutput.js';

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

  if (mod.meta.status === 'planned') {
    logger.error(`Module "${moduleId}" is planned and cannot be executed.`);
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

  let partialResult: ModuleResult | undefined;
  let stage = 'validate';
  try {
    spinner.start();
    validateContextSettings(ctx.settings ?? {});
    const failures: string[] = [];
    const observeFailure = (message: string): void => { failures.push(message); };
    stage = 'write';
    const result = validateModuleResult(await withCapturedErrors(() => mod.execute(ctx), observeFailure));
    if (result.moduleId !== moduleId) throw new Error('Module result ID does not match the requested module');
    partialResult = result;
    if (result.failed) throw new Error('Module reported an incomplete installation');
    for (const file of [...result.created, ...result.modified, ...result.skipped]) {
      const absolute = path.resolve(ctx.cwd, file);
      if (absolute === path.resolve(ctx.cwd) || !isSafeProjectPath(ctx.cwd, absolute)) throw new Error(`Invalid module result path: ${file}`);
    }
    if (failures.length > 0) throw new Error(`Required module writes failed: ${failures.join('; ')}`);
    
    stage = 'dependencies';
    // Inject runtime and dev dependencies defined in metadata
    if (result) {
      const pkg = readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(path.join(ctx.cwd, 'package.json'));
      const existing = { ...pkg?.dependencies, ...pkg?.devDependencies };
      const depsPatch: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
      if (mod.meta.runtimeDependencies && mod.meta.runtimeDependencies.length > 0) {
        depsPatch.dependencies = {};
        for (const dep of mod.meta.runtimeDependencies) {
          if (!existing[dep]) depsPatch.dependencies[dep] = getDependencyVersion(dep);
        }
      }
      if (mod.meta.devDependencies && mod.meta.devDependencies.length > 0) {
        depsPatch.devDependencies = {};
        for (const dep of mod.meta.devDependencies) {
          if (!existing[dep]) {
            if (dep === '@vitest/coverage-v8' && existing.vitest) {
              depsPatch.devDependencies[dep] = existing.vitest;
            } else if (dep === 'vitest' && existing['@vitest/coverage-v8']) {
              depsPatch.devDependencies[dep] = existing['@vitest/coverage-v8'];
            } else {
              depsPatch.devDependencies[dep] = getDependencyVersion(dep);
            }
          }
        }
      }
      if (Object.keys(depsPatch).length > 0) {
        const patchStatus = withCapturedErrors(() => patchPackageJson(ctx.cwd, depsPatch, { dryRun: ctx.dryRun }), observeFailure);
        if (patchStatus === 'modified') {
          if (!result.modified.includes('package.json')) {
            result.modified.push('package.json');
          }
        }
      }
    }

    if (failures.length > 0) throw new Error(`Required module writes failed: ${failures.join('; ')}`);
    spinner.succeed(`Module ${pc.bold(mod.meta.name)} installed.`);
    printResult(result, ctx);
    return result;
  } catch (err) {
    spinner.fail(`Module ${pc.bold(mod.meta.name)} failed.`);
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Module "${moduleId}" failed: ${message}`);
    console.error(err);
    return partialResult ? { ...partialResult, failed: true, diagnostics: [...(partialResult.diagnostics ?? []), { code: 'MODULE_OPERATION_FAILED', stage,
      message, recoveryCommand: 'helen recover' }] } : null;
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
function printResult(result: ModuleResult, ctx?: HelenContext): void {
  if (isJsonMode()) return;
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
      const pm = ctx?.project.packageManager ?? 'npm';
      const formattedStep = step
        .replace(/npm run (\w+)/g, (_, script) => getRunCommand(pm, script))
        .replace(/npm install/g, () => getInstallCommand(pm));
      console.log(`    ${pc.dim('→')} ${formattedStep}`);
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

  const { readConfig, getConfigPath } = await import('./config.js');
  const configPath = getConfigPath(ctx.cwd);
  if (!isSafeProjectPath(ctx.cwd, configPath)) return false;
  const config = readConfig(ctx.cwd, { recoverCorrupt: false });
  if (!config?.installedModules.includes(moduleId)) {
    logger.warn(`Module "${moduleId}" is not installed; no files were changed.`);
    return false;
  }
  const otherInstalled = config.installedModules.filter(id => id !== moduleId);
  const ownership = config.moduleFiles?.[moduleId];
  const owned = (file: string): boolean => !ownership || ownership.created.includes(file) || ownership.modified.includes(file) ||
    (config.createdFiles ?? []).includes(file);
  const shared = (file: string): boolean => otherInstalled.some(id => {
    const files = config.moduleFiles?.[id];
    const other = getModule(id);
    // Unknown plugin ownership cannot be inferred from the bundled registry.
    return Boolean(files?.created.includes(file) || files?.modified.includes(file)) ||
      !other || other.meta.filesModified.includes(file) || other.meta.filesCreated.includes(file);
  });
  const created = mod.meta.filesCreated.filter(file => owned(file) && (config.createdFiles || []).includes(file) && !shared(file));
  const overwritten = mod.meta.filesCreated.filter(file => owned(file) && !shared(file) && fs.existsSync(path.resolve(ctx.cwd, `${file}.helen-backup`)));
  const files = [...new Set([...created, ...overwritten, ...mod.meta.filesModified.filter(file => owned(file) && !shared(file))])];
  // Validate the entire operation before modifying any project file.
  for (const file of files) {
    const full = path.resolve(ctx.cwd, file);
    const backup = `${full}.helen-backup`;
    if (full === path.resolve(ctx.cwd) || !isSafeProjectPath(ctx.cwd, full) || !isSafeProjectPath(ctx.cwd, backup) ||
      (fs.existsSync(full) && !fs.lstatSync(full).isFile()) ||
      (fs.existsSync(backup) && !fs.lstatSync(backup).isFile())) {
      logger.error(`Unsafe module path: ${file}`);
      return false;
    }
  }

  logger.warn(`Ejecting module: ${pc.bold(mod.meta.name)}...`);
  for (const file of files) {
    const full = path.resolve(ctx.cwd, file);
    const backup = `${full}.helen-backup`;
    if (fs.existsSync(backup)) {
      if (!ctx.dryRun) {
        writeAtomicFile(full, fs.readFileSync(backup));
      }
      logger.step(`${ctx.dryRun ? '[DRY-RUN] Would restore' : 'Restored'} backup: ${file}`);
    } else if (created.includes(file) && fs.existsSync(full)) {
      if (!ctx.dryRun) removeTrackedFile(full);
      logger.step(`${ctx.dryRun ? '[DRY-RUN] Would remove' : 'Removed'}: ${file}`);
    }
  }
  const updatedCreatedFiles = (config.createdFiles || []).filter(file => !created.includes(file));
  if (!ctx.dryRun) {
    if (otherInstalled.length === 0 && updatedCreatedFiles.length === 0) {
      removeTrackedFile(configPath);
    } else {
      const moduleFiles = Object.fromEntries(Object.entries(config.moduleFiles ?? {}).filter(([id]) => id !== moduleId));
      writeAtomicFile(configPath, `${JSON.stringify({ ...config, moduleFiles, installedModules: otherInstalled, createdFiles: updatedCreatedFiles, updatedAt: new Date().toISOString() }, null, 2)}\n`);
    }
    // Once ownership metadata is committed, leftover backups cannot make a retry
    // delete a restored original. Before that point keep every recovery copy.
    for (const file of files) {
      const backup = `${path.resolve(ctx.cwd, file)}.helen-backup`;
      if (!fs.existsSync(backup)) continue;
      try { removeTrackedFile(backup); }
      catch (err) {
        logger.warn(`Module ejected, but backup cleanup failed for ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  
  logger.success(`Module ${mod.meta.name} ejected.`);
  return true;
}



export function printSummary(results: ModuleResult[], ctx?: HelenContext): void {
  logger.section('Summary');
  const failures = results.filter(result => result.failed).length;
  if (failures) logger.warn(`Failed: ${failures} module(s); partial writes remain tracked for rollback or retry.`);

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
      const pm = ctx?.project.packageManager ?? 'npm';
      const formattedStep = step
        .replace(/npm run (\w+)/g, (_, script) => getRunCommand(pm, script))
        .replace(/npm install/g, () => getInstallCommand(pm));
      console.log(`    ${pc.dim('→')} ${formattedStep}`);
    }
  }

  logger.blank();
  if (ctx?.preview) console.log(renderPreview(ctx.plannedChanges ?? [], ctx.cwd));
}

function getDependencyVersion(dep: string): string {
  const versions: Record<string, string> = {
    // Quality
    'eslint': '^8.57.0',
    '@typescript-eslint/eslint-plugin': '^8.61.1',
    '@typescript-eslint/parser': '^8.61.1',
    'prettier': '^3.3.3',
    'eslint-config-prettier': '^9.1.0',
    
    // Testing
    'vitest': '^3.0.0',
    '@vitest/coverage-v8': '^3.0.0',
    '@testing-library/react': '^16.0.1',
    '@testing-library/jest-dom': '^6.5.0',
    '@testing-library/user-event': '^14.5.2',
    'jsdom': '^26.1.0',

    // SEO
    'react-helmet-async': '^2.0.5',

    // Security
    'zod': '^3.23.8',
  };

  return versions[dep] || 'latest';
}
