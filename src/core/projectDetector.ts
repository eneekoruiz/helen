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
  framework: 'vite' | 'next' | 'cra' | 'remix' | 'astro' | 'sveltekit' | 'nuxt' | 'vue' | 'unknown';
  hasTests?: boolean;
  testRunner?: 'vitest' | 'jest' | 'playwright' | 'cypress' | 'unknown' | null;
  hasSentry?: boolean;
  hasLighthouse?: boolean;
  hasLicense?: boolean;
  hasSecurity?: boolean;
  isMonorepo?: boolean;
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
    fileExists(path.join(cwd, 'vite.config.js')) ||
    fileExists(path.join(cwd, 'vite.config.mjs'));

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

  const hasAstroConfig =
    fileExists(path.join(cwd, 'astro.config.mjs')) ||
    fileExists(path.join(cwd, 'astro.config.ts')) ||
    fileExists(path.join(cwd, 'astro.config.js'));

  const hasSvelteConfig =
    fileExists(path.join(cwd, 'svelte.config.js')) ||
    fileExists(path.join(cwd, 'svelte.config.ts'));

  const hasNuxtConfig =
    fileExists(path.join(cwd, 'nuxt.config.js')) ||
    fileExists(path.join(cwd, 'nuxt.config.ts'));

  const hasReact = Boolean(deps['react']);
  const hasVue = Boolean(deps['vue']);
  const hasAstro = Boolean(deps['astro']) || hasAstroConfig;
  const hasSvelte = Boolean(deps['svelte']) || Boolean(deps['@sveltejs/kit']) || hasSvelteConfig;
  const hasNuxt = Boolean(deps['nuxt']) || hasNuxtConfig;
  const hasVite = Boolean(deps['vite']) || hasViteConfig;
  const hasNext = Boolean(deps['next']) || hasNextConfig;
  const hasRemix = Boolean(deps['@remix-run/react']) || hasRemixConfig;

  let framework: ProjectInfo['framework'] = 'unknown';
  if (hasAstro) framework = 'astro';
  else if (hasSvelte) framework = 'sveltekit';
  else if (hasNuxt) framework = 'nuxt';
  else if (hasNext) framework = 'next';
  else if (hasRemix) framework = 'remix';
  else if (hasVite) framework = 'vite';
  else if (hasVue) framework = 'vue';
  else if (deps['react-scripts']) framework = 'cra';

  let testRunner: ProjectInfo['testRunner'] = null;
  if (deps['vitest']) testRunner = 'vitest';
  else if (deps['jest']) testRunner = 'jest';
  else if (deps['@playwright/test']) testRunner = 'playwright';
  else if (deps['cypress']) testRunner = 'cypress';
  else if (pkg?.scripts && typeof pkg.scripts === 'object' && 'test' in pkg.scripts) testRunner = 'unknown';

  const hasLicense =
    fileExists(path.join(cwd, 'LICENSE')) ||
    fileExists(path.join(cwd, 'LICENSE.md')) ||
    fileExists(path.join(cwd, 'LICENSE.txt'));

  const hasSecurity =
    fileExists(path.join(cwd, 'SECURITY.md')) ||
    fileExists(path.join(cwd, '.github', 'SECURITY.md'));

  const hasSentry =
    Boolean(deps['@sentry/browser']) ||
    Boolean(deps['@sentry/node']) ||
    Boolean(deps['@sentry/react']) ||
    Boolean(deps['@sentry/nextjs']);

  const hasLighthouse =
    Boolean(deps['@lhci/cli']) ||
    fileExists(path.join(cwd, 'lighthouserc.js')) ||
    fileExists(path.join(cwd, 'lighthouserc.json'));

  const isMonorepo =
    fileExists(path.join(cwd, 'pnpm-workspace.yaml')) ||
    fileExists(path.join(cwd, 'lerna.json')) ||
    fileExists(path.join(cwd, 'turbo.json')) ||
    fileExists(path.join(cwd, 'nx.json')) ||
    Boolean((pkg as any)?.workspaces);

  return {
    name: (pkg?.name as string) ?? 'unknown-project',
    hasPackageJson: pkg !== null,
    hasGit: fileExists(path.join(cwd, '.git')),
    hasSrc: fileExists(path.join(cwd, 'src')) || fileExists(path.join(cwd, 'app')),
    hasTypeScript: hasTsConfig || Boolean(deps['typescript']),
    hasVite,
    hasReact,
    packageManager: detectPackageManager(cwd),
    framework,
    hasTests: testRunner !== null,
    testRunner,
    hasSentry,
    hasLighthouse,
    hasLicense,
    hasSecurity,
    isMonorepo,
  };
}

