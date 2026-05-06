import path from 'node:path';
import { fileExists, readJson } from './fs.js';
import { detectPackageManager } from './packageManager.js';
/**
 * Detect project characteristics from the filesystem.
 */
export function detectProject(cwd) {
    const pkgPath = path.join(cwd, 'package.json');
    const pkg = readJson(pkgPath);
    const deps = {
        ...pkg?.dependencies,
        ...pkg?.devDependencies,
    };
    const hasViteConfig = fileExists(path.join(cwd, 'vite.config.ts')) ||
        fileExists(path.join(cwd, 'vite.config.js'));
    const hasTsConfig = fileExists(path.join(cwd, 'tsconfig.json')) ||
        fileExists(path.join(cwd, 'tsconfig.app.json'));
    const hasNextConfig = fileExists(path.join(cwd, 'next.config.js')) ||
        fileExists(path.join(cwd, 'next.config.mjs')) ||
        fileExists(path.join(cwd, 'next.config.ts'));
    const hasRemixConfig = fileExists(path.join(cwd, 'remix.config.js')) ||
        fileExists(path.join(cwd, 'remix.config.ts'));
    const hasReact = Boolean(deps['react']);
    const hasVite = Boolean(deps['vite']) || hasViteConfig;
    const hasNext = Boolean(deps['next']) || hasNextConfig;
    const hasRemix = Boolean(deps['@remix-run/react']) || hasRemixConfig;
    let framework = 'unknown';
    if (hasVite)
        framework = 'vite';
    else if (hasNext)
        framework = 'next';
    else if (hasRemix)
        framework = 'remix';
    else if (deps['react-scripts'])
        framework = 'cra';
    return {
        name: pkg?.name ?? 'unknown-project',
        hasPackageJson: pkg !== null,
        hasGit: fileExists(path.join(cwd, '.git')),
        hasSrc: fileExists(path.join(cwd, 'src')),
        hasTypeScript: hasTsConfig || Boolean(deps['typescript']),
        hasVite,
        hasReact,
        packageManager: detectPackageManager(cwd),
        framework,
    };
}
//# sourceMappingURL=projectDetector.js.map