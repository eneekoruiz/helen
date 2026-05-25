import fs from 'fs-extra';
import path from 'node:path';
import { readConfig } from './config.js';
import { logger } from './logger.js';

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
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...getBackupFiles(fullPath));
      } else if (file.endsWith('.helen-backup')) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    } catch {
      // Ignore errors reading files
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

  const config = readConfig(cwd);
  const backupFiles = getBackupFiles(cwd);

  // 1. Restore backup files
  for (const backupPath of backupFiles) {
    // e.g. path/to/file.ext.helen-backup -> path/to/file.ext
    const originalPath = backupPath.slice(0, -13);
    const relOriginal = path.relative(cwd, originalPath).replace(/\\/g, '/');

    if (options.dryRun) {
      result.restored.push(relOriginal);
      logger.step(`[DRY-RUN] Would restore backup for: ${relOriginal}`);
    } else {
      try {
        fs.copySync(backupPath, originalPath, { overwrite: true });
        fs.removeSync(backupPath);
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

      // Avoid deleting original files that had backups, since those were restored
      if (result.restored.includes(relFile)) {
        continue;
      }

      if (fs.existsSync(absolutePath)) {
        if (options.dryRun) {
          result.removed.push(relFile);
          logger.step(`[DRY-RUN] Would remove created file: ${relFile}`);
        } else {
          try {
            fs.removeSync(absolutePath);
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
  if (fs.existsSync(configPath)) {
    const relConfig = '.helenrc';
    if (options.dryRun) {
      result.removed.push(relConfig);
      logger.step(`[DRY-RUN] Would remove configuration file: ${relConfig}`);
    } else {
      try {
        fs.removeSync(configPath);
        result.removed.push(relConfig);
        logger.step(`Removed configuration file: ${relConfig}`);
      } catch (err) {
        logger.error(`Failed to remove ${relConfig}: ${err instanceof Error ? err.message : String(err)}`);
        result.skipped.push(relConfig);
      }
    }
  }

  return result;
}
