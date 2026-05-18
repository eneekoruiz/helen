import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'dx',
  name: 'Developer Experience',
  category: 'DX',
  summary: 'VS Code settings + extensions + .env.example + pluggable console Easter Egg script',
  description: 'Sets up VS Code workspace settings for auto-formatting on save, recommended extensions, a documented .env.example template, and a pluggable 24-bit Truecolor animated Easter Egg console script.',
  problemItSolves: 'New team members waste hours configuring their editor or creating dynamic easter eggs. This standardizes the DX and adds interactive, vibrant console branding from day one.',
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

  // scripts/easter-egg.ts (Pluggable terminal easter egg)
  const easterEggTs = `/**
 * Eneko Ruiz Ultimate DX System Easter Egg
 * Fully self-contained animated console display with 24-bit Truecolor gradients.
 * Works out-of-the-box in any modern Terminal environment.
 * 
 * Usage:
 *   npx tsx scripts/easter-egg.ts
 */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h % 360;
  s = s / 100;
  l = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
}

function rgbColor(r: number, g: number, b: number): string {
  return \`\\x1b[38;2;\${r};\${g};\${b}m\`;
}

const RESET = '\\x1b[0m';
const BOLD = '\\x1b[1m';
const DIM = '\\x1b[2m';
const CYAN = '\\x1b[36m';
const YELLOW = '\\x1b[33m';
const GREEN = '\\x1b[32m';
const HIDE_CURSOR = '\\x1b[?25l';
const SHOW_CURSOR = '\\x1b[?25h';

const ART_LINES = [
  '  ███████╗███╗   ██╗███████╗██╗  ██╗ ██████╗     ██████╗ ██╗   ██╗██╗███████╗',
  '  ██╔════╝████╗  ██║██╔════╝██║ ██╔╝██╔═══██╗    ██╔══██╗██║   ██║██║╚══███╔╝',
  '  █████╗  ██╔██╗ ██║█████╗  █████╔╝ ██║   ██║    ██████╔╝██║   ██║██║  ███╔╝ ',
  '  ██╔══╝  ██║╚██╗██║██╔══╝  ██╔═██╗ ██║   ██║    ██╔══██╗██║   ██║██║ ███╔╝  ',
  '  ███████╗██║ ╚████║███████╗██║  ██╗╚██████╔╝    ██║  ██║╚██████╔╝██║███████╗',
  '  ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝'
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const isTTY = process.stdout.isTTY;

  console.clear();
  console.log(\`\${BOLD}\${CYAN}⚡ ENEKO RUIZ SYSTEM INTERRUPT SEED ⚡\${RESET}\`);
  console.log(\`\${DIM}─── Initializing external boilerplate runtime ────────────────\${RESET}\`);
  await sleep(350);

  const steps = [
    'Verifying sandbox dependencies...',
    'Loading custom 24-bit Truecolor palette matrices...',
    'Rendering high-fidelity Eneko Ruiz ASCII layout...'
  ];

  for (const s of steps) {
    process.stdout.write(\`  \${YELLOW}◷\${RESET} \${s}\`);
    await sleep(200);
    process.stdout.write('\\r');
    process.stdout.write(\`  \${GREEN}✔\${RESET} \${s}\\n\`);
    await sleep(80);
  }

  await sleep(300);
  console.clear();

  if (isTTY) {
    process.stdout.write(HIDE_CURSOR);
  }

  let baseHue = 0;
  const frames = 70;

  for (let f = 0; f < frames; f++) {
    if (isTTY && f > 0) {
      process.stdout.write('\\x1b[H');
    } else if (!isTTY) {
      printFrame(baseHue);
      break;
    }
    printFrame(baseHue);
    baseHue = (baseHue + 6) % 360;
    await sleep(50);
  }

  if (isTTY) {
    process.stdout.write(SHOW_CURSOR);
  }

  console.log('');
  console.log(\`\${BOLD}\${CYAN}  🛰️  Eneko Ruiz TS Boilerplate Easter Egg Online.\${RESET}\`);
  console.log(\`\${DIM}  ──────────────────────────────────────────────────────────────────────────\${RESET}\`);
  console.log(\`  \${BOLD}Status:\${RESET} \${GREEN}● ACTIVE\${RESET}  |  \${BOLD}DX Engine:\${RESET} HELEN Seed\`);
  console.log(\`\${DIM}  ──────────────────────────────────────────────────────────────────────────\${RESET}\`);
  console.log('');
}

function printFrame(baseHue: number) {
  console.log('');
  console.log(\`\${BOLD}\${DIM}   ─── 🌌 ENEKO RUIZ TS GRADIENT CONSOLE ANIMATION 🌌 ────────────────────\${RESET}\`);
  console.log('');

  for (let y = 0; y < ART_LINES.length; y++) {
    const line = ART_LINES[y];
    let coloredLine = '';
    for (let x = 0; x < line.length; x++) {
      const hue = (baseHue + x * 4.5 + y * 18) % 360;
      const [r, g, b] = hslToRgb(hue, 100, 50);
      coloredLine += \`\${rgbColor(r, g, b)}\${line[x]}\`;
    }
    console.log(coloredLine + RESET);
  }

  console.log('');
  const progress = Math.min(100, Math.round((baseHue / 360) * 100 + 40) % 101);
  const barWidth = 40;
  const filled = Math.round((progress / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = \`\${CYAN}\${'█'.repeat(filled)}\${RESET}\${DIM}\${'░'.repeat(empty)}\${RESET}\`;
  console.log(\`   [\${bar}] \${BOLD}\${progress}%\${RESET} | \${YELLOW}⚡ ANIMATING\${RESET} | CPU: \${GREEN}OK\${RESET}\`);
  console.log(\`\${BOLD}\${DIM}   ──────────────────────────────────────────────────────────────────────\${RESET}\`);
}

main().catch(console.error);
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
