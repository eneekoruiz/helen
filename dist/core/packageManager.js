import { fileExists } from './fs.js';
import path from 'node:path';
/**
 * Detect which package manager is being used in the project.
 */
export function detectPackageManager(cwd) {
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
export function getInstallCommand(pm) {
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
export function getRunCommand(pm, script) {
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
//# sourceMappingURL=packageManager.js.map