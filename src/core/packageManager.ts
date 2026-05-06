import { fileExists } from './fs.js';
import path from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';

/**
 * Detect which package manager is being used in the project.
 */
export function detectPackageManager(cwd: string): PackageManager {
  if (fileExists(path.join(cwd, 'bun.lockb')) || fileExists(path.join(cwd, 'bun.lock'))) {
    return 'bun';
  }
  if (fileExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fileExists(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fileExists(path.join(cwd, 'package-lock.json'))) {
    return 'npm';
  }
  return 'unknown';
}

/**
 * Get the install command for a package manager.
 */
export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
  }
}

/**
 * Get the run command for a package manager.
 */
export function getRunCommand(pm: PackageManager, script: string): string {
  switch (pm) {
    case 'pnpm':
      return `pnpm ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'bun':
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
}
