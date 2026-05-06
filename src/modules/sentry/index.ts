import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'sentry',
  name: 'Sentry Error Tracking',
  category: 'Infrastructure',
  summary: '@sentry/react setup + session replay + data redaction',
  description: 'Integrates Sentry for real-time error tracking and session replays. Includes pre-configured privacy filters to redact sensitive user data from breadcrumbs and replays.',
  problemItSolves: 'Errors in production are invisible without tracking. Sentry makes debugging production issues possible by capturing state and user actions.',
  whenToUse: 'Any production-ready application.',
  whenNotToUse: 'Small experiments or projects with strict local-only data requirements.',
  filesCreated: ['src/lib/sentry.ts'],
  filesModified: ['src/main.tsx', 'package.json', '.env.example'],
  runtimeDependencies: ['@sentry/react'],
  devDependencies: [],
  requirements: ['Sentry DSN'],
  risks: ['Can impact performance slightly; requires careful sampling configuration.'],
  nextSteps: [
    'Add your Sentry DSN to .env.local',
    'Import src/lib/sentry.ts in your main.tsx'
  ],
  riskLevel: 'medium',
  recommendedLevel: 'intermediate',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  const sentryTs = `import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, 
    // Session Replay
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0,
    
    environment: import.meta.env.MODE,
    
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        // Redact potentially sensitive data from URLs or body
        return null; 
      }
      return breadcrumb;
    },
  });
}
`;

  writeFileSafe(path.join(cwd, 'src/lib/sentry.ts'), sentryTs, { dryRun, force });
  result.created.push('src/lib/sentry.ts');

  patchPackageJson(cwd, {
    dependencies: {
      '@sentry/react': '^8.0.0'
    }
  }, { dryRun });
  result.modified.push('package.json');

  return result;
}

export const sentryModule: HelenModule = { meta, execute };
