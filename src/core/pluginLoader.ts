import fs from 'fs-extra';
import path from 'node:path';
import { logger } from './logger.js';
import type { HelenModule } from '../modules/types.js';

/**
 * Dynamically load modules from a local directory (e.g., .helen/modules).
 */
export async function loadPlugins(cwd: string): Promise<HelenModule[]> {
  const pluginsDir = path.join(cwd, '.helen', 'modules');
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  const plugins: HelenModule[] = [];

  for (const file of files) {
    try {
      // const pluginPath = path.join(pluginsDir, file);
      // In a real ESM Node environment, we'd use dynamic import().
      // For this CLI context, we'll log that we found them.
      // Note: Loading raw .ts files requires ts-node/register or similar at runtime if not using tsx.
      logger.info(`Found plugin: ${file}`);
      
      // Implementation detail: actual loading would happen here.
      // For now, we'll support a registry-like approach or skip if not compatible.
    } catch (err) {
      logger.error(`Failed to load plugin ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }

  }

  return plugins;
}
