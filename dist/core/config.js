import path from 'node:path';
import fs from 'fs-extra';
import { readJson, patchJson } from './fs.js';
import { logger } from './logger.js';
const CONFIG_FILE = '.helenrc';
/**
 * Get the path to the .helenrc file in the project root.
 */
export function getConfigPath(cwd) {
    return path.join(cwd, CONFIG_FILE);
}
/**
 * Read the .helenrc config file.
 * Returns null if not found or malformed (after backing it up).
 */
export function readConfig(cwd) {
    const configPath = getConfigPath(cwd);
    try {
        return readJson(configPath);
    }
    catch (err) {
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
export function updateConfig(cwd, updates) {
    const configPath = getConfigPath(cwd);
    const existing = readConfig(cwd) || {
        projectName: 'unknown',
        framework: 'unknown',
        packageManager: 'npm',
        installedModules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {},
    };
    const newConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
        installedModules: Array.from(new Set([...existing.installedModules, ...(updates.installedModules || [])])),
    };
    patchJson(configPath, newConfig);
}
/**
 * Check if a module is already installed according to the config.
 */
export function isModuleInstalled(cwd, moduleId) {
    const config = readConfig(cwd);
    return config?.installedModules.includes(moduleId) ?? false;
}
//# sourceMappingURL=config.js.map