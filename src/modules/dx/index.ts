import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'dx',
  name: 'Developer Experience',
  category: 'DX',
  summary: 'VS Code settings + extensions + .env.example',
  description: 'Sets up VS Code workspace settings for auto-formatting on save, recommended extensions, and a documented .env.example template.',
  problemItSolves: 'New team members waste hours configuring their editor. This standardizes the DX from day one.',
  whenToUse: 'On every project. Zero cost, high value.',
  whenNotToUse: 'If the team exclusively uses a different editor (rare).',
  filesCreated: ['.vscode/settings.json', '.vscode/extensions.json', '.env.example'],
  filesModified: [],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: [],
  risks: [],
  nextSteps: ['Copy .env.example to .env.local and fill values'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  // VS Code settings
  const settings = JSON.stringify({
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'explicit',
    },
    'typescript.preferences.importModuleSpecifier': 'relative',
    'typescript.tsdk': 'node_modules/typescript/lib',
    'files.eol': '\n',
    'files.trimTrailingWhitespace': true,
    'files.insertFinalNewline': true,
  }, null, 2);
  const r1 = writeFileSafe(path.join(cwd, '.vscode/settings.json'), settings, { dryRun, force });
  if (r1 === 'created' || r1 === 'overwritten') result.created.push('.vscode/settings.json');
  else result.skipped.push('.vscode/settings.json');

  // VS Code extensions
  const extensions = JSON.stringify({
    recommendations: [
      'esbenp.prettier-vscode',
      'dbaeumer.vscode-eslint',
      'bradlc.vscode-tailwindcss',
      'formulahendry.auto-rename-tag',
      'christian-kohler.path-intellisense',
      'ms-vscode.vscode-typescript-next',
      'streetsidesoftware.code-spell-checker',
    ],
  }, null, 2);
  const r2 = writeFileSafe(path.join(cwd, '.vscode/extensions.json'), extensions, { dryRun, force });
  if (r2 === 'created' || r2 === 'overwritten') result.created.push('.vscode/extensions.json');
  else result.skipped.push('.vscode/extensions.json');

  // .env.example
  const envExample = `# ── App ──────────────────────────────────────────
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=My App

# ── Supabase (optional) ─────────────────────────
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# ── Sentry (optional) ───────────────────────────
# VITE_SENTRY_DSN=https://xxx@sentry.io/123

# ── Analytics (optional) ────────────────────────
# VITE_GA_ID=G-XXXXXXXXXX

# ── API (optional) ──────────────────────────────
# VITE_API_URL=https://api.example.com
`;
  const r3 = writeFileSafe(path.join(cwd, '.env.example'), envExample, { dryRun, force });
  if (r3 === 'created' || r3 === 'overwritten') result.created.push('.env.example');
  else result.skipped.push('.env.example');

  result.nextSteps.push('Copy .env.example to .env.local');
  result.nextSteps.push('Install recommended VS Code extensions');
  return result;
}

export const dxModule: HelenModule = { meta, execute };
