import path from 'node:path';
import { fileExists, readJson } from './fs.js';
import { detectPackageManager, type PackageManager } from './packageManager.js';

export interface ProjectInfo {
  name: string;
  hasPackageJson: boolean;
  hasGit: boolean;
  hasSrc: boolean;
  hasTypeScript: boolean;
  hasVite: boolean;
  hasReact: boolean;
  packageManager: PackageManager;
  framework: 'vite' | 'next' | 'cra' | 'unknown';
}

/**
 * Detect project characteristics from the filesystem.
 */
export function detectProject(cwd: string): ProjectInfo {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = readJson<Record<string, unknown>>(pkgPath);

  const deps = {
    ...(pkg?.dependencies as Record<string, string> | undefined),
    ...(pkg?.devDependencies as Record<string, string> | undefined),
  };

  const hasViteConfig =
    fileExists(path.join(cwd, 'vite.config.ts')) ||
    fileExists(path.join(cwd, 'vite.config.js'));

  const hasTsConfig =
    fileExists(path.join(cwd, 'tsconfig.json')) ||
    fileExists(path.join(cwd, 'tsconfig.app.json'));

  const hasNextConfig =
    fileExists(path.join(cwd, 'next.config.js')) ||
    fileExists(path.join(cwd, 'next.config.mjs')) ||
    fileExists(path.join(cwd, 'next.config.ts'));

  const hasRemixConfig =
    fileExists(path.join(cwd, 'remix.config.js')) ||
    fileExists(path.join(cwd, 'remix.config.ts'));

  const hasReact = Boolean(deps['react']);
  const hasVite = Boolean(deps['vite']) || hasViteConfig;
  const hasNext = Boolean(deps['next']) || hasNextConfig;
  const hasRemix = Boolean(deps['@remix-run/react']) || hasRemixConfig;

  let framework: ProjectInfo['framework'] = 'unknown';
  if (hasVite) framework = 'vite';
  else if (hasNext) framework = 'next';
  else if (hasRemix) framework = 'remix' as any;
  else if (deps['react-scripts']) framework = 'cra';

  return {
    name: (pkg?.name as string) ?? 'unknown-project',
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

