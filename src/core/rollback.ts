import fs from 'fs-extra';
import path from 'node:path';
import { readConfig } from './config.js';
import { logger } from './logger.js';
import { isSafeProjectPath } from './fs.js';
import { writeAtomicFile, removeTrackedFile } from './operations.js';

export interface RollbackResult {
  restored: string[];
  removed: string[];
  skipped: string[];
}

/**
 * Recursively find all .helen-backup files in the project, ignoring common folders.
 */
export function getBackupFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') {
      continue;
    }
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) continue;
      if (stat && stat.isDirectory()) {
        results.push(...getBackupFiles(fullPath));
      } else if (stat.isFile() && file.endsWith('.helen-backup')) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`Cannot inspect rollback backups at ${fullPath}`, { cause: error });
    }
  }
  return results;
}

/**
 * Execute rollback on a project.
 */
export async function runRollback(
  cwd: string,
  options: { dryRun?: boolean } = {},
): Promise<RollbackResult> {
  const result: RollbackResult = {
    restored: [],
    removed: [],
    skipped: [],
  };

  const config = readConfig(cwd, { recoverCorrupt: !options.dryRun });
  const backupFiles = getBackupFiles(cwd);

  // 1. Restore backup files
  for (const backupPath of backupFiles) {
    // e.g. path/to/file.ext.helen-backup -> path/to/file.ext
    const originalPath = backupPath.slice(0, -13);
    const relOriginal = path.relative(cwd, originalPath).replace(/\\/g, '/');

    if (!isSafeProjectPath(cwd, originalPath) ||
      (fs.existsSync(originalPath) && !fs.lstatSync(originalPath).isFile())) {
      result.skipped.push(relOriginal);
      continue;
    }

    if (options.dryRun) {
      result.restored.push(relOriginal);
      logger.step(`[DRY-RUN] Would restore backup for: ${relOriginal}`);
    } else {
      try {
        writeAtomicFile(originalPath, fs.readFileSync(backupPath));
        result.restored.push(relOriginal);
        logger.step(`Restored backup: ${relOriginal}`);
      } catch (err) {
        logger.error(`Failed to restore ${relOriginal}: ${err instanceof Error ? err.message : String(err)}`);
        result.skipped.push(relOriginal);
      }
    }
  }

  // 2. Remove files created by Helen (according to .helenrc)
  if (config && config.createdFiles && config.createdFiles.length > 0) {
    for (const file of config.createdFiles) {
      const absolutePath = path.isAbsolute(file) ? file : path.resolve(cwd, file);
      const relFile = path.relative(cwd, absolutePath).replace(/\\/g, '/');

      // Configuration is user-editable: never remove directories or paths outside this project.
      if (absolutePath === path.resolve(cwd) || !isSafeProjectPath(cwd, absolutePath)) {
        result.skipped.push(relFile);
        continue;
      }

      // Avoid deleting original files that had backups, since those were restored
      if (result.restored.includes(relFile) || result.skipped.includes(relFile)) {
        continue;
      }

      if (fs.existsSync(absolutePath)) {
        if (!fs.lstatSync(absolutePath).isFile()) {
          result.skipped.push(relFile);
          continue;
        }
        if (options.dryRun) {
          result.removed.push(relFile);
          logger.step(`[DRY-RUN] Would remove created file: ${relFile}`);
        } else {
          try {
            removeTrackedFile(absolutePath);
            result.removed.push(relFile);
            logger.step(`Removed: ${relFile}`);
          } catch (err) {
            logger.error(`Failed to remove ${relFile}: ${err instanceof Error ? err.message : String(err)}`);
            result.skipped.push(relFile);
          }
        }
      }
    }
  }

  // 3. Remove the .helenrc config file itself
  const configPath = path.join(cwd, '.helenrc');
  if (fs.existsSync(configPath) && (!config || !isSafeProjectPath(cwd, configPath) || !fs.lstatSync(configPath).isFile())) {
    if (!result.skipped.includes('.helenrc')) result.skipped.push('.helenrc');
  }
  if (fs.existsSync(configPath) && !result.restored.includes('.helenrc') && result.skipped.length === 0) {
    const relConfig = '.helenrc';
    if (options.dryRun) {
      result.removed.push(relConfig);
      logger.step(`[DRY-RUN] Would remove configuration file: ${relConfig}`);
    } else {
      try {
        removeTrackedFile(configPath);
        result.removed.push(relConfig);
        logger.step(`Removed configuration file: ${relConfig}`);
      } catch (err) {
        logger.error(`Failed to remove ${relConfig}: ${err instanceof Error ? err.message : String(err)}`);
        result.skipped.push(relConfig);
      }
    }
  }

  // Keep recovery copies until all mutations and configuration cleanup succeed.
  // Otherwise a retry could mistake an already-restored tracked file for a new file.
  if (!options.dryRun && result.skipped.length === 0) {
    for (const backupPath of backupFiles) {
      try {
        removeTrackedFile(backupPath);
      } catch (err) {
        const relative = path.relative(cwd, backupPath).replace(/\\/g, '/');
        logger.error(`Failed to remove backup ${relative}: ${err instanceof Error ? err.message : String(err)}`);
        result.skipped.push(relative);
      }
    }
  }
  return result;
}
