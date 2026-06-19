import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'dx',
  name: 'Developer Experience',
  category: 'DX',
  summary: 'VS Code settings + extensions + .env.example + cinematic HELEN terminal art',
  description: 'Sets up VS Code workspace settings, recommended extensions, a documented .env.example template, and a self-contained cinematic HELEN terminal art sequence.',
  problemItSolves: 'New team members waste time configuring editors and projects often ship generic terminal branding. This standardizes the DX and provides a restrained, accessible HELEN identity.',
  whenToUse: 'On every project. Zero cost, high value.',
  whenNotToUse: 'If the team exclusively uses a different editor (rare).',
  filesCreated: ['.vscode/settings.json', '.vscode/extensions.json', '.env.example', 'scripts/easter-egg.ts'],
  filesModified: [],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: [],
  risks: [],
  nextSteps: ['Copy .env.example to .env.local', 'Install recommended VS Code extensions', 'Run npx tsx scripts/easter-egg.ts to view the animated brand banner'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
  status: 'stable',
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

  // scripts/easter-egg.ts (self-contained HELEN terminal art)
  const easterEggTs = `/**
 * HELEN cinematic terminal identity.
 *
 * Usage:
 *   npx tsx scripts/easter-egg.ts
 */

const ESC = '\\x1b[';
const RESET = ESC + '0m';
const LARGE = [
  '██╗  ██╗███████╗██╗     ███████╗███╗   ██╗',
  '██║  ██║██╔════╝██║     ██╔════╝████╗  ██║',
  '███████║█████╗  ██║     █████╗  ██╔██╗ ██║',
  '██╔══██║██╔══╝  ██║     ██╔══╝  ██║╚██╗██║',
  '██║  ██║███████╗███████╗███████╗██║ ╚████║',
  '╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝'
];
const COMPACT = [
  '█  █  ███  █     ███  █▄ █',
  '████  ██   █     ██   ████',
  '█  █  ███  ████  ███  █ ▀█'
];
const POINTS = [[-0.4,-0.3],[-0.3,0.2],[-0.18,-0.1],[-0.1,0.35],[0.05,-0.3],[0.16,0.22],[0.28,-0.12],[0.4,0.28]];
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const ease = (n: number) => n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;
const tone = (text: string, r: number, g: number, b: number, color: boolean) =>
  color ? ESC + '38;2;' + r + ';' + g + ';' + b + 'm' + text + RESET : text;

function render(progress: number, width: number, height: number, color: boolean): string {
  const logo = width >= LARGE[0].length + 4 ? LARGE : COMPACT;
  const logoWidth = Math.max(...logo.map(line => line.length));
  const canvas = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));
  const put = (x: number, y: number, glyph: string) => {
    if (y >= 0 && y < height && x >= 0 && x < width) canvas[y][x] = glyph;
  };

  if (progress < 0.56) {
    const pull = ease(clamp(progress / 0.5, 0, 1));
    POINTS.forEach(([dx, dy], index) => {
      const x = Math.round(width / 2 + dx * width * (1 - pull) + Math.sin(progress * 8 + index) * 2 * (1 - pull));
      const y = Math.round(height / 2 + dy * height * (1 - pull));
      put(x, y, progress < 0.3 ? '·' : '•');
    });
  }

  if (progress >= 0.22) {
    const reveal = ease(clamp((progress - 0.22) / 0.65, 0, 1)) * (logoWidth + 8) - 4;
    const left = Math.max(0, Math.floor((width - logoWidth) / 2));
    const top = Math.max(1, Math.floor((height - logo.length) / 2));
    logo.forEach((line, y) => Array.from(line).forEach((glyph, x) => {
      if (glyph === ' ') return;
      const distance = reveal - x - Math.sin(y * 1.4 + x * 0.24) * 1.7;
      if (distance < -1.5) return;
      put(left + x, top + y, distance < 0 ? '·' : distance < 1.4 ? '░' : distance < 2.7 ? '▒' : glyph);
    }));
  }

  const sweep = ease(clamp((progress - 0.2) / 0.68, 0, 1)) * width;
  return canvas.map(row => row.map((glyph, x) => {
    if (glyph === ' ') return glyph;
    if (glyph === '·' || glyph === '•') return tone(glyph, 82, 86, 96, color);
    if (progress >= 0.9) return tone(glyph, 245, 245, 247, color);
    const distance = Math.abs(x - sweep);
    if (distance < 3) return tone(glyph, 118, 166, 255, color);
    if (distance < 9) return tone(glyph, 245, 245, 247, color);
    return tone(glyph, 166, 171, 184, color);
  }).join('').replace(/\\s+$/, '')).join('\\n');
}

async function main(): Promise<void> {
  const width = clamp(process.stdout.columns || 80, 32, 120);
  const height = clamp((process.stdout.rows || 20) - 1, 9, 24);
  const color = process.env.NO_COLOR === undefined;
  const reduced = ['reduce', 'off'].includes((process.env.HELEN_MOTION || '').toLowerCase());
  const animate = Boolean(process.stdout.isTTY) && !process.env.CI && process.env.TERM !== 'dumb' && !reduced;

  if (!animate) {
    console.log(render(1, width, Math.min(height, 14), color));
    return;
  }

  process.stdout.write(ESC + '?25l' + ESC + '2J' + ESC + 'H');
  try {
    for (let frame = 0; frame < 78; frame++) {
      process.stdout.write(ESC + 'H' + render(frame / 77, width, height, color) + RESET);
      await sleep(32);
    }
    await sleep(700);
    process.stdout.write('\\n');
  } finally {
    process.stdout.write(ESC + '?25h');
  }
}

main().catch(error => {
  process.stdout.write(ESC + '?25h');
  console.error(error);
  process.exitCode = 1;
});
`;
  const r4 = writeFileSafe(path.join(cwd, 'scripts/easter-egg.ts'), easterEggTs, { dryRun, force });
  if (r4 === 'created' || r4 === 'overwritten') result.created.push('scripts/easter-egg.ts');
  else result.skipped.push('scripts/easter-egg.ts');

  result.nextSteps.push('Copy .env.example to .env.local');
  result.nextSteps.push('Install recommended VS Code extensions');
  result.nextSteps.push('Run npx tsx scripts/easter-egg.ts to view the animated brand banner');
  return result;
}

export const dxModule: HelenModule = { meta, execute };
