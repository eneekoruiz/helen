import { recordFileResult, addMissingDependencies } from '../results.js';
import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'pwa',
  name: 'Progressive Web App',
  category: 'Infrastructure',
  summary: 'Vite PWA plugin dependency + manifest + registration scaffold',
  description: 'Creates a manifest and service-worker registration scaffold. Add VitePWA to your Vite configuration to enable offline support.',
  problemItSolves: 'Websites without PWA support feel slower and cannot work offline or be installed on mobile devices.',
  whenToUse: 'Any web application where mobile experience and offline access are important.',
  whenNotToUse: 'Internal dashboard apps where offline access is not possible/secure.',
  filesCreated: ['public/manifest.webmanifest', 'src/pwa-register.ts'],
  filesModified: ['vite.config.ts', 'package.json'],
  runtimeDependencies: [],
  devDependencies: ['vite-plugin-pwa'],
  requirements: ['Vite project', 'Node.js >= 20.19 or >= 22.12'],
  risks: ['Service workers can cache stale content if not configured correctly.'],
  nextSteps: [
    'Customize manifest.webmanifest with your app colors and icons',
    'Add VitePWA({ registerType: "autoUpdate", manifest: false }) to vite.config.ts plugins',
    'Import src/pwa-register.ts in src/main.tsx',
    'Verify offline support in DevTools'
  ],
  riskLevel: 'medium',
  recommendedLevel: 'intermediate',
  status: 'experimental',
  compatibleFrameworks: ['vite'],
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  const manifest = JSON.stringify({
    name: 'My HELEN App',
    short_name: 'HelenApp',
    description: 'A production-ready PWA powered by HELEN CLI',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }, null, 2);

  const files: Array<[string, string]> = [
    ['public/manifest.webmanifest', manifest],
    ['src/pwa-register.ts', `/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisterError(error: unknown) {
    console.error('[PWA] Service worker registration failed:', error);
  },
});
`],
  ];
  for (const [file, content] of files) {
    const status = writeFileSafe(path.join(cwd, file), content, { dryRun, force, root: cwd });
    recordFileResult(result, file, status);
  }

  const status = addMissingDependencies(cwd, {
    devDependencies: {
      'vite-plugin-pwa': '^2.0.0'
    }
  }, { dryRun });
  recordFileResult(result, 'package.json', status);
  result.nextSteps.push(...meta.nextSteps);

  return result;
}

export const pwaModule: HelenModule = { meta, execute };
