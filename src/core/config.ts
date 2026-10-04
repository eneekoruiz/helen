import path from 'node:path';
import fs from 'fs-extra';
import { patchJson, isSafeProjectPath } from './fs.js';
import { logger } from './logger.js';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { getPlannedContent } from './preview.js';
import { writeAtomicFile, removeTrackedFile } from './operations.js';

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));
const SafeKey = (key: string) => !['__proto__', 'prototype', 'constructor'].includes(key);
const StringArray = z.array(z.string());
const ModuleFilesSchema = z.record(z.string().refine(SafeKey), z.object({
  created: StringArray.default([]), modified: StringArray.default([]),
}).passthrough());
const SettingsSchema = z.record(z.string().refine(SafeKey), JsonValueSchema).superRefine((settings, ctx) => {
  if (Object.hasOwn(settings, 'securityLevel') && settings.securityLevel !== 'simple' && settings.securityLevel !== 'strict') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['securityLevel'], message: 'Expected simple or strict' });
  }
});
const ConfigSchema = z.object({
  projectName: z.string().default('unknown'), framework: z.string().default('unknown'),
  packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun', 'unknown']).default('npm'),
  installedModules: StringArray.default([]), createdFiles: StringArray.default([]),
  moduleFiles: ModuleFilesSchema.default({}),
  createdAt: z.string().default(''), updatedAt: z.string().default(''),
  settings: SettingsSchema.default({}),
}).catchall(JsonValueSchema);

export const HelenConfigSchema = ConfigSchema;

export interface HelenConfig {
  [key: string]: unknown;
  projectName: string;
  framework: string;
  packageManager: string;
  installedModules: string[];
  createdFiles?: string[];
  moduleFiles?: Record<string, { created: string[]; modified: string[] }>;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, unknown>;
}

const CONFIG_FILE = '.helenrc';

/**
 * Get the path to the .helenrc file in the project root.
 */
export function getConfigPath(cwd: string): string {
  return path.join(cwd, CONFIG_FILE);
}

/**
 * Read the .helenrc config file.
 * Returns null if not found or malformed (after backing it up).
 */
export function readConfig(cwd: string, options: { recoverCorrupt?: boolean } = {}): HelenConfig | null {
  const configPath = getConfigPath(cwd);
  if (!isSafeProjectPath(cwd, configPath)) {
    logger.error('Unsafe configuration path: .helenrc');
    return null;
  }
  const planned = getPlannedContent(configPath);
  if (!fs.existsSync(configPath) && planned === undefined) return null;
  if (fs.existsSync(configPath) && !fs.lstatSync(configPath).isFile()) {
    logger.error('Configuration path must be a regular file: .helenrc');
    return null;
  }
  try {
    const parsed = ConfigSchema.safeParse(JSON.parse(planned ?? fs.readFileSync(configPath, 'utf8')));
    if (!parsed.success) throw new Error('Invalid configuration structure');
    return parsed.data;
  } catch (err) {
    logger.error(`Failed to read .helenrc: ${err instanceof Error ? err.message : String(err)}`);
    // Backup corrupt config
    let backup = path.join(cwd, '.helenrc.corrupt');
    if (options.recoverCorrupt !== false && fs.existsSync(configPath)) {
      let suffix = 1;
      while (fs.existsSync(backup)) backup = path.join(cwd, `.helenrc.corrupt.${suffix++}`);
      try {
        if (!isSafeProjectPath(cwd, backup)) throw new Error('Unsafe corrupt configuration backup');
        writeAtomicFile(backup, fs.readFileSync(configPath), { mode: fs.statSync(configPath).mode & 0o777 });
        removeTrackedFile(configPath);
        logger.warn(`Corrupt .helenrc backed up to ${backup}. A new one will be created.`);
      } catch (backupError) {
        logger.error(`Could not preserve corrupt configuration: ${backupError instanceof Error ? backupError.message : String(backupError)}`);
      }
    }
    return null;
  }
}


/**
 * Initialize or update the .helenrc config file.
 */
export function updateConfig(cwd: string, updates: Partial<HelenConfig>, options: { dryRun?: boolean } = {}): void {
  const configPath = getConfigPath(cwd);
  if (!isSafeProjectPath(cwd, configPath) || !isSafeProjectPath(cwd, `${configPath}.helen-backup`)) {
    throw new Error('Unsafe configuration path: .helenrc');
  }
  const current = readConfig(cwd, { recoverCorrupt: !options.dryRun });
  if (!current && fs.existsSync(configPath)) {
    throw new Error('Cannot update configuration until the existing .helenrc is recovered.');
  }
  const existing = current || {
    projectName: 'unknown',
    framework: 'unknown',
    packageManager: 'npm',
    installedModules: [],
    createdFiles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {},
  };

  const newConfig = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    installedModules: Array.from(new Set([...existing.installedModules, ...(updates.installedModules || [])])),
    createdFiles: Array.from(new Set([...(existing.createdFiles || []), ...(updates.createdFiles || [])])),
    settings: {
      ...(existing.settings || {}),
      ...(updates.settings || {}),
    },
    moduleFiles: Object.fromEntries(
      Object.entries({ ...existing.moduleFiles, ...updates.moduleFiles })
        .filter(([, files]) => Boolean(files))
        .map(([id, files]) => [id, {
          created: [...new Set([...(existing.moduleFiles?.[id]?.created ?? []), ...(files?.created ?? [])])],
          modified: [...new Set([...(existing.moduleFiles?.[id]?.modified ?? []), ...(files?.modified ?? [])])],
        }])
    ),
  };

  ConfigSchema.parse(newConfig);

  if (current && isDeepStrictEqual({ ...current, updatedAt: newConfig.updatedAt }, newConfig)) return;
  if (patchJson(configPath, newConfig, { root: cwd, dryRun: options.dryRun }) === 'skipped') {
    throw new Error('Failed to update .helenrc.');
  }
}

/**
 * Check if a module is already installed according to the config.
 */
export function isModuleInstalled(cwd: string, moduleId: string): boolean {
  const config = readConfig(cwd);
  return config?.installedModules.includes(moduleId) ?? false;
}

export function getConfigValue(cwd: string, key: string): unknown {
  const config = readConfig(cwd);
  if (!config || !SafeKey(key)) return undefined;
  if (Object.hasOwn(config, key)) return config[key];
  if (config.settings && Object.hasOwn(config.settings, key)) return config.settings[key];
  return undefined;
}

export function setConfigValue(cwd: string, key: string, value: unknown): void {
  if (!SafeKey(key)) throw new Error(`Unsafe configuration key: ${key}`);
  const rootKeys = ['projectName', 'framework', 'packageManager'];
  if (rootKeys.includes(key)) {
    if (typeof value !== 'string') throw new Error(`${key} must be a string`);
    if (key === 'packageManager' && !['npm', 'pnpm', 'yarn', 'bun', 'unknown'].includes(value)) {
      throw new Error('packageManager must be npm, pnpm, yarn, bun, or unknown');
    }
    updateConfig(cwd, { [key]: value });
  } else {
    if (key === 'securityLevel' && value !== 'simple' && value !== 'strict') {
      throw new Error('securityLevel must be simple or strict');
    }
    if (!JsonValueSchema.safeParse(value).success) throw new Error('Configuration settings must be JSON values');
    updateConfig(cwd, { settings: { [key]: value } });
  }
}

