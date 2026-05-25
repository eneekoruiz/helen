import path from 'node:path';
import fs from 'fs-extra';
import { readJson, patchJson } from './fs.js';
import { logger } from './logger.js';

export interface HelenConfig {
  projectName: string;
  framework: string;
  packageManager: string;
  installedModules: string[];
  createdFiles?: string[];
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any>;
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
export function readConfig(cwd: string): HelenConfig | null {
  const configPath = getConfigPath(cwd);
  try {
    return readJson<HelenConfig>(configPath);
  } catch (err) {
    logger.error(`Failed to read .helenrc: ${err instanceof Error ? err.message : String(err)}`);
    // Backup corrupt config
    const backup = path.join(cwd, '.helenrc.corrupt');
    if (fs.existsSync(configPath)) {
      fs.moveSync(configPath, backup, { overwrite: true });
      logger.warn(`Corrupt .helenrc backed up to ${backup}. A new one will be created.`);
    }
    return null;
  }
}


/**
 * Initialize or update the .helenrc config file.
 */
export function updateConfig(cwd: string, updates: Partial<HelenConfig>): void {
  const configPath = getConfigPath(cwd);
  const existing = readConfig(cwd) || {
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
  };

  patchJson(configPath, newConfig as any);
}

/**
 * Check if a module is already installed according to the config.
 */
export function isModuleInstalled(cwd: string, moduleId: string): boolean {
  const config = readConfig(cwd);
  return config?.installedModules.includes(moduleId) ?? false;
}
