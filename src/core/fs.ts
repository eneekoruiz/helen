import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { logger } from './logger.js';
import Handlebars from 'handlebars';


/**
 * Check if a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  fs.ensureDirSync(dirPath);
}

/**
 * Write a file safely: does not overwrite unless force is true.
 * In dry-run mode, logs what would happen but does not write.
 * Supports Handlebars interpolation if variables are provided.
 *
 * Returns: 'created' | 'skipped' | 'overwritten'
 */
export function writeFileSafe(
  filePath: string,
  content: string,
  options: { dryRun?: boolean; force?: boolean; vars?: Record<string, any> } = {},
): 'created' | 'skipped' | 'overwritten' {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    
    // Safety check: Don't write outside the current working directory or temp dir (for tests)
    const isUnderCwd = absolutePath.startsWith(process.cwd());
    const isUnderTmp = absolutePath.startsWith(os.tmpdir());
    
    if (!isUnderCwd && !isUnderTmp) {
      logger.error(`Path safety violation: Attempted to write outside project root: ${filePath}`);
      return 'skipped';
    }


    const exists = fileExists(absolutePath);
    
    let finalContent = content;
    if (options.vars) {
      try {
        const template = Handlebars.compile(content);
        finalContent = template(options.vars);
      } catch (err) {
        logger.error(`Template error in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        return 'skipped';
      }
    }

    if (options.dryRun) {
      if (exists && !options.force) {
        logger.step(`[DRY-RUN] Would skip (exists): ${filePath}`);
        return 'skipped';
      }
      logger.step(`[DRY-RUN] Would ${exists ? 'overwrite' : 'create'}: ${filePath}`);
      return exists ? 'overwritten' : 'created';
    }

    if (exists && !options.force) {
      logger.warn(`File exists, skipping: ${filePath}`);
      return 'skipped';
    }

    ensureDir(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, finalContent, 'utf-8');
    logger.step(`${exists ? 'Overwritten' : 'Created'}: ${filePath}`);
    return exists ? 'overwritten' : 'created';
  } catch (err) {
    logger.error(`Failed to write file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    return 'skipped';
  }
}


/**
 * Copy a template file to a destination safely with interpolation support.
 */
export function copyTemplate(
  templatePath: string,
  destPath: string,
  options: { dryRun?: boolean; force?: boolean; vars?: Record<string, any> } = {},
): 'created' | 'skipped' | 'overwritten' {
  if (!fileExists(templatePath)) {
    logger.error(`Template not found: ${templatePath}`);
    return 'skipped';
  }


  const content = fs.readFileSync(templatePath, 'utf-8');
  return writeFileSafe(destPath, content, options);
}


/**
 * Read and parse a JSON file. Returns null if not found or invalid.
 */
export function readJson<T = Record<string, unknown>>(filePath: string): T | null {
  try {
    return fs.readJsonSync(filePath) as T;
  } catch {
    return null;
  }
}

/**
 * Patch a JSON file by merging new data. Creates the file if missing.
 * Does not overwrite existing keys unless explicitly set.
 */
export function patchJson(
  filePath: string,
  patches: Record<string, unknown>,
  options: { dryRun?: boolean } = {},
): 'created' | 'modified' | 'skipped' {
  if (options.dryRun) {
    logger.step(`[DRY-RUN] Would patch: ${filePath}`);
    return fileExists(filePath) ? 'modified' : 'created';
  }

  const existing = readJson(filePath) ?? {};
  const merged = deepMerge(existing as Record<string, unknown>, patches);
  ensureDir(path.dirname(filePath));
  fs.writeJsonSync(filePath, merged, { spaces: 2 });
  logger.step(`Patched: ${filePath}`);
  return fileExists(filePath) ? 'modified' : 'created';
}

/**
 * Convenience wrapper for patching package.json.
 */
export function patchPackageJson(
  cwd: string,
  patches: Record<string, unknown>,
  options: { dryRun?: boolean } = {},
): 'created' | 'modified' | 'skipped' {
  return patchJson(path.join(cwd, 'package.json'), patches, options);
}

/**
 * Create a backup of a file before modifying it.
 */
export function backupFile(filePath: string): string | null {
  if (!fileExists(filePath)) return null;
  const backupPath = `${filePath}.helen-backup`;
  fs.copySync(filePath, backupPath);
  logger.step(`Backup: ${backupPath}`);
  return backupPath;
}

/**
 * Append content to a file only if a marker string is not already present.
 */
export function appendOnce(
  filePath: string,
  marker: string,
  content: string,
  options: { dryRun?: boolean } = {},
): 'created' | 'modified' | 'skipped' {
  if (options.dryRun) {
    logger.step(`[DRY-RUN] Would append to: ${filePath}`);
    return fileExists(filePath) ? 'modified' : 'created';
  }

  if (!fileExists(filePath)) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
    return 'created';
  }

  const existing = fs.readFileSync(filePath, 'utf-8');
  if (existing.includes(marker)) {
    logger.warn(`Marker "${marker}" already present in ${filePath} — skipping`);
    return 'skipped';
  }

  fs.appendFileSync(filePath, `\n${content}`, 'utf-8');
  logger.step(`Appended to: ${filePath}`);
  return 'modified';
}

/**
 * Detect if a file would conflict (exists and differs from template).
 */
export function detectConflict(filePath: string, newContent: string): boolean {
  if (!fileExists(filePath)) return false;
  const existing = fs.readFileSync(filePath, 'utf-8');
  return existing !== newContent;
}

/**
 * Deep merge two objects. Arrays are replaced, not merged.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    // Security: avoid prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const sourceVal = source[key];
    const targetVal = result[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

