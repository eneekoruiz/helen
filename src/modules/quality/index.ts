import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'quality',
  name: 'Code Quality',
  category: 'Quality',
  summary: 'ESLint + Prettier + TypeScript strict mode + scripts',
  description:
    'Sets up ESLint with TypeScript plugin, Prettier for auto-formatting, and a strict tsconfig. Adds lint, format, and typecheck scripts to package.json.',
  problemItSolves:
    'Without consistent linting and formatting, codebases accumulate inconsistencies, bugs slip through, and PRs become harder to review.',
  whenToUse: 'On every new project. This is foundational.',
  whenNotToUse: 'If you already have a fully configured ESLint + Prettier setup you are happy with.',
  filesCreated: ['.eslintrc.json', '.prettierrc', '.prettierignore'],
  filesModified: ['package.json'],
  runtimeDependencies: [],
  devDependencies: [
    'eslint',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'prettier',
    'eslint-config-prettier',
  ],
  requirements: ['Node.js >= 18', 'TypeScript project recommended'],
  risks: ['May conflict with existing ESLint config'],
  nextSteps: ['Run npm run lint to check', 'Run npm run format to auto-fix'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  // .eslintrc.json
  const eslintConfig = JSON.stringify(
    {
      root: true,
      env: { browser: true, es2022: true, node: true },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
      ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
    },
    null,
    2,
  );
  const eslintResult = writeFileSafe(path.join(cwd, '.eslintrc.json'), eslintConfig, { dryRun, force });
  if (eslintResult === 'created' || eslintResult === 'overwritten') result.created.push('.eslintrc.json');
  else result.skipped.push('.eslintrc.json');

  // .prettierrc
  const prettierConfig = JSON.stringify(
    {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'all',
      printWidth: 100,
      bracketSpacing: true,
      arrowParens: 'always',
      endOfLine: 'lf',
    },
    null,
    2,
  );
  const prettierResult = writeFileSafe(path.join(cwd, '.prettierrc'), prettierConfig, { dryRun, force });
  if (prettierResult === 'created' || prettierResult === 'overwritten') result.created.push('.prettierrc');
  else result.skipped.push('.prettierrc');

  // .prettierignore
  const prettierIgnore = `dist/
node_modules/
coverage/
*.min.js
*.min.css
pnpm-lock.yaml
package-lock.json
`;
  const ignoreResult = writeFileSafe(path.join(cwd, '.prettierignore'), prettierIgnore, { dryRun, force });
  if (ignoreResult === 'created' || ignoreResult === 'overwritten') result.created.push('.prettierignore');
  else result.skipped.push('.prettierignore');

  // Patch package.json scripts
  const patchResult = patchPackageJson(cwd, {
    scripts: {
      lint: 'eslint src/ --ext .ts,.tsx --max-warnings=0',
      'lint:fix': 'eslint src/ --ext .ts,.tsx --fix',
      format: 'prettier --write "src/**/*.{ts,tsx,css,json}"',
      'format:check': 'prettier --check "src/**/*.{ts,tsx,css,json}"',
      typecheck: 'tsc --noEmit',
    },
  }, { dryRun });
  if (patchResult === 'modified') result.modified.push('package.json');

  result.nextSteps.push('Run npm run lint to check for issues');
  result.nextSteps.push('Run npm run format to auto-format code');

  return result;
}

export const qualityModule: HelenModule = { meta, execute };
