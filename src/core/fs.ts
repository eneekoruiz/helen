import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { logger } from './logger.js';
import Handlebars from 'handlebars';
import { isDeepStrictEqual } from 'node:util';
import { writeAtomicFile } from './operations.js';
import { recordPlannedWrite, getPlannedContent } from './preview.js';

/** Check directory boundaries and existing links before touching a project path. */
export function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export function isSafeProjectPath(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (!isPathInside(resolvedRoot, resolvedCandidate)) return false;
  let current = resolvedCandidate;
  while (current !== resolvedRoot) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return false;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') return false;
    }
    current = path.dirname(current);
  }
  return true;
}

function isSafeFileDestination(filePath: string, root?: string): boolean {
  const absolute = path.resolve(filePath);
  const allowed = (candidate: string): boolean => isSafeProjectPath(root ?? process.cwd(), candidate) ||
    (root === undefined && isSafeProjectPath(os.tmpdir(), candidate));
  return allowed(absolute) && allowed(`${absolute}.helen-backup`) &&
    (!fs.existsSync(absolute) || fs.lstatSync(absolute).isFile()) &&
    (!fs.existsSync(`${absolute}.helen-backup`) || fs.lstatSync(`${absolute}.helen-backup`).isFile());
}


/**
 * Check if a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  return getPlannedContent(filePath) !== undefined || fs.existsSync(filePath);
}

function readText(file: string): string {
  return getPlannedContent(file) ?? fs.readFileSync(file, 'utf8');
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
  options: { dryRun?: boolean; force?: boolean; vars?: Record<string, any>; root?: string } = {},
): 'created' | 'skipped' | 'overwritten' {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    
    // Safety check: Don't write outside the current working directory or temp dir (for tests)
    if (!isSafeFileDestination(absolutePath, options.root)) {
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
      recordPlannedWrite(absolutePath, exists ? readText(absolutePath) : null, finalContent, { backup: exists });
      return exists ? 'overwritten' : 'created';
    }

    if (exists) {
      if (!options.force) {
        logger.warn(`File exists, skipping: ${filePath}`);
        return 'skipped';
      }
      backupFile(absolutePath, { root: options.root });
    }

    ensureDir(path.dirname(absolutePath));
    writeAtomicFile(absolutePath, finalContent);
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
  options: { dryRun?: boolean; force?: boolean; vars?: Record<string, any>; root?: string } = {},
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
    return JSON.parse(readText(filePath)) as T;
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
  options: { dryRun?: boolean; root?: string } = {},
): 'created' | 'modified' | 'skipped' {
  try {
    if (!isSafeFileDestination(filePath, options.root)) {
      logger.error(`Unsafe JSON destination: ${filePath}`);
      return 'skipped';
    }
    const exists = fileExists(filePath);
    const existing = exists ? JSON.parse(readText(filePath)) as unknown : {};
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      logger.error(`JSON destination must contain an object: ${filePath}`);
      return 'skipped';
    }
    const merged = deepMerge(existing as Record<string, unknown>, patches);
    if (exists && isDeepStrictEqual(existing, merged)) return 'skipped';
    if (options.dryRun) {
      logger.step(`[DRY-RUN] Would patch: ${filePath}`);
      recordPlannedWrite(filePath, exists ? readText(filePath) : null, `${JSON.stringify(merged, null, 2)}\n`, { backup: exists });
      return exists ? 'modified' : 'created';
    }
    if (exists) backupFile(filePath, { root: options.root });
    ensureDir(path.dirname(filePath));
    writeAtomicFile(filePath, `${JSON.stringify(merged, null, 2)}\n`);
    logger.step(`Patched: ${filePath}`);
    return exists ? 'modified' : 'created';
  } catch (err) {
    logger.error(`Failed to patch ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    return 'skipped';
  }
}

/**
 * Convenience wrapper for patching package.json.
 */
export function patchPackageJson(
  cwd: string,
  patches: Record<string, unknown>,
  options: { dryRun?: boolean } = {},
): 'created' | 'modified' | 'skipped' {
  return patchJson(path.join(cwd, 'package.json'), patches, { ...options, root: cwd });
}

/**
 * Create a backup of a file before modifying it.
 * Preserves the initial file state by avoiding overwrites if a backup already exists.
 */
export function backupFile(filePath: string, options: { root?: string } = {}): string | null {
  if (!isSafeFileDestination(filePath, options.root)) return null;
  if (!fileExists(filePath)) return null;
  const backupPath = `${filePath}.helen-backup`;
  if (fileExists(backupPath)) return backupPath;
  writeAtomicFile(backupPath, fs.readFileSync(filePath), { mode: fs.statSync(filePath).mode & 0o777 });
  logger.step(`Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Append content to a file only if a marker string is not already present.
 */
export function appendOnce(
  filePath: string,
  marker: string,
  content: string,
  options: { dryRun?: boolean; root?: string } = {},
): 'created' | 'modified' | 'skipped' {
  if (!isSafeFileDestination(filePath, options.root)) {
    logger.error(`Unsafe append destination: ${filePath}`);
    return 'skipped';
  }
  const exists = fileExists(filePath);
  if (exists && readText(filePath).includes(marker)) return 'skipped';
  if (options.dryRun) {
    logger.step(`[DRY-RUN] Would append to: ${filePath}`);
    const before = exists ? readText(filePath) : null;
    recordPlannedWrite(filePath, before, before === null ? content : `${before}\n${content}`, { backup: exists });
    return fileExists(filePath) ? 'modified' : 'created';
  }

  if (!fileExists(filePath)) {
    ensureDir(path.dirname(filePath));
    writeAtomicFile(filePath, content);
    return 'created';
  }

  const existing = fs.readFileSync(filePath, 'utf-8');
  if (existing.includes(marker)) {
    logger.warn(`Marker "${marker}" already present in ${filePath} — skipping`);
    return 'skipped';
  }

  backupFile(filePath, { root: options.root });
  writeAtomicFile(filePath, `${existing}\n${content}`);
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

