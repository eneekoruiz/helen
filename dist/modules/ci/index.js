import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'ci',
    name: 'CI/CD Pipeline',
    category: 'Infrastructure',
    summary: 'GitHub Actions CI workflow (typecheck, lint, test, build)',
    description: 'Creates a GitHub Actions workflow that runs type-checking, linting, testing, and building on every push and PR.',
    problemItSolves: 'Without CI, broken code gets merged. This ensures every PR passes quality gates.',
    whenToUse: 'On every project hosted on GitHub.',
    whenNotToUse: 'If using GitLab CI or another CI provider.',
    filesCreated: ['.github/workflows/ci.yml'],
    filesModified: [],
    runtimeDependencies: [],
    devDependencies: [],
    requirements: ['GitHub repository'],
    risks: [],
    nextSteps: ['Push to GitHub to trigger the workflow'],
    riskLevel: 'low',
    recommendedLevel: 'beginner',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    const ciYml = [
        'name: CI',
        '',
        'on:',
        '  push:',
        '    branches: [main, develop]',
        '  pull_request:',
        '    branches: [main]',
        '',
        'concurrency:',
        '  group: ci-${{ github.ref }}',
        '  cancel-in-progress: true',
        '',
        'jobs:',
        '  quality:',
        '    name: Quality Gates',
        '    runs-on: ubuntu-latest',
        '    timeout-minutes: 10',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-node@v4',
        '        with:',
        '          node-version: 20',
        '          cache: npm',
        '      - run: npm ci',
        '      - run: npm run typecheck',
        '      - run: npm run lint',
        '      - run: npm run test',
        '      - run: npm run build',
        '',
    ].join('\n');
    const r1 = writeFileSafe(path.join(cwd, '.github/workflows/ci.yml'), ciYml, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('.github/workflows/ci.yml');
    else
        result.skipped.push('.github/workflows/ci.yml');
    result.nextSteps.push('Push to GitHub to trigger CI');
    return result;
}
export const ciModule = { meta, execute };
//# sourceMappingURL=index.js.map