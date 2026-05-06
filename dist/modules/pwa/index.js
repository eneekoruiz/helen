import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'pwa',
    name: 'Progressive Web App',
    category: 'Infrastructure',
    summary: 'Vite PWA plugin + manifest + offline support',
    description: 'Configures vite-plugin-pwa for offline capabilities, service worker registration, and a complete web manifest for app-like behavior.',
    problemItSolves: 'Websites without PWA support feel slower and cannot work offline or be installed on mobile devices.',
    whenToUse: 'Any web application where mobile experience and offline access are important.',
    whenNotToUse: 'Internal dashboard apps where offline access is not possible/secure.',
    filesCreated: ['public/manifest.webmanifest', 'src/pwa-register.ts'],
    filesModified: ['vite.config.ts', 'package.json'],
    runtimeDependencies: [],
    devDependencies: ['vite-plugin-pwa'],
    requirements: ['Vite project'],
    risks: ['Service workers can cache stale content if not configured correctly.'],
    nextSteps: [
        'Customize manifest.webmanifest with your app colors and icons',
        'Verify offline support in DevTools'
    ],
    riskLevel: 'medium',
    recommendedLevel: 'intermediate',
    compatibleFrameworks: ['vite'],
};
async function execute(ctx) {
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
    writeFileSafe(path.join(cwd, 'public/manifest.webmanifest'), manifest, { dryRun, force });
    result.created.push('public/manifest.webmanifest');
    patchPackageJson(cwd, {
        devDependencies: {
            'vite-plugin-pwa': '^0.20.0'
        }
    }, { dryRun });
    result.modified.push('package.json');
    return result;
}
export const pwaModule = { meta, execute };
//# sourceMappingURL=index.js.map