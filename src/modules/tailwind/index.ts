import { recordFileResult, addMissingDependencies } from '../results.js';
import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'tailwind',
  name: 'Tailwind CSS',
  category: 'Infrastructure',
  summary: 'Auto-setup for Tailwind CSS + PostCSS + Autoprefixer',
  description: 'Installs and configures Tailwind CSS, creates tailwind.config.js and postcss.config.js, and adds the @tailwind directives to your CSS.',
  problemItSolves: 'Manual Tailwind setup is repetitive and error-prone.',
  whenToUse: 'When you want a modern, utility-first CSS framework.',
  whenNotToUse: 'If you prefer CSS Modules, Sass, or a different UI library.',
  filesCreated: ['tailwind.config.js', 'postcss.config.js', 'src/index.css'],
  filesModified: ['package.json'],
  runtimeDependencies: [],
  devDependencies: ['tailwindcss', 'postcss', 'autoprefixer'],
  requirements: ['Any project'],
  risks: ['Will overwrite src/index.css if it already exists'],
  nextSteps: ['Start using utility classes in your components'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
  status: 'planned',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  // tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
  const r1 = writeFileSafe(path.join(cwd, 'tailwind.config.js'), tailwindConfig, { dryRun, force, root: cwd });
  recordFileResult(result, 'tailwind.config.js', r1);

  // postcss.config.js
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
  const r2 = writeFileSafe(path.join(cwd, 'postcss.config.js'), postcssConfig, { dryRun, force, root: cwd });
  recordFileResult(result, 'postcss.config.js', r2);

  // index.css
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  const r3 = writeFileSafe(path.join(cwd, 'src/index.css'), indexCss, { dryRun, force, root: cwd });
  recordFileResult(result, 'src/index.css', r3);

  // package.json
  const r4 = addMissingDependencies(cwd, {
    devDependencies: {
      tailwindcss: '^3.4.1',
      postcss: '^8.4.35',
      autoprefixer: '^10.4.18',
    }
  }, { dryRun });
  recordFileResult(result, 'package.json', r4);

  return result;
}

export const tailwindModule: HelenModule = { meta, execute };
