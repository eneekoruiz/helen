import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { patchPackageJson, readJson, writeFileSafe } from '../../core/fs.js';
import fs from 'node:fs';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'guardrails',
  name: 'Git Hooks & Dependabot',
  category: 'Infrastructure',
  summary: 'Dependency-free pre-commit / pre-push hooks and a grouped Dependabot config',
  description:
    'Adds .githooks/pre-commit (blocks .env files, conflict markers, likely secrets and huge files), .githooks/pre-push (runs the typecheck, lint, test and build scripts that exist) and .github/dependabot.yml (weekly, grouped minor/patch updates for npm and GitHub Actions). Hooks are activated through the prepare script.',
  problemItSolves: 'Secrets, broken builds and stale dependencies reach the remote before CI or a reviewer catches them.',
  whenToUse: 'On every project hosted on GitHub that is worked on locally.',
  whenNotToUse: 'If the project already uses husky, lefthook or another hook manager (keep one).',
  filesCreated: ['.githooks/pre-commit', '.githooks/pre-push', '.github/dependabot.yml'],
  filesModified: ['package.json'],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: ['git', 'GitHub repository for Dependabot'],
  risks: ['Hooks can be skipped with --no-verify; CI stays the real gate.'],
  nextSteps: ['Run npm install (or git config core.hooksPath .githooks) to activate the hooks'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
  status: 'stable',
};

const preCommit = `#!/bin/sh
# HELEN pre-commit: fast checks on staged files only, no dependencies.
# Skip once with: git commit --no-verify
fail=0
files=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$files" ] && exit 0

for f in $files; do
  case "$f" in
    *.env|.env|.env.*|*/.env|*/.env.*)
      case "$f" in *.example|*.sample|*.template) ;; *) echo "✖ $f: environment files must not be committed"; fail=1 ;; esac ;;
  esac
  [ -f "$f" ] || continue
  size=$(wc -c < "$f")
  if [ "$size" -gt 5242880 ]; then echo "✖ $f: larger than 5 MB (use Git LFS or external storage)"; fail=1; fi
  if git diff --cached -U0 -- "$f" | grep -qE '^\\+(<<<<<<<|>>>>>>>) '; then echo "✖ $f: merge conflict markers"; fail=1; fi
  if git diff --cached -U0 -- "$f" | grep -qE '^\\+.*(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|sk-(live|proj)-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{10,})'; then
    echo "✖ $f: looks like it contains a secret (value not shown)"; fail=1
  fi
done

[ "$fail" -eq 0 ] || { echo "Commit blocked by .githooks/pre-commit"; exit 1; }
`;

const prePush = `#!/bin/sh
# HELEN pre-push: run the project's own quality scripts that exist.
# Skip once with: git push --no-verify
if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; elif [ -f bun.lockb ] || [ -f bun.lock ]; then pm=bun; else pm=npm; fi
[ -f package.json ] || exit 0

for script in typecheck lint test build; do
  if node -e "process.exit(require('./package.json').scripts?.['$script'] ? 0 : 1)" 2>/dev/null; then
    echo "▸ $pm run $script"
    CI=1 $pm run "$script" || { echo "✖ $script failed: push blocked by .githooks/pre-push"; exit 1; }
  fi
done
`;

const dependabot = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    # Major updates arrive as separate PRs so breaking changes are reviewed one by one.
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ['*']
`;

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  const files: Array<[string, string]> = [
    ['.githooks/pre-commit', preCommit],
    ['.githooks/pre-push', prePush],
    ['.github/dependabot.yml', dependabot],
  ];
  for (const [rel, content] of files) {
    const status = writeFileSafe(path.join(cwd, rel), content, { dryRun, force });
    if (status === 'created' || status === 'overwritten') {
      result.created.push(rel);
      if (!dryRun && rel.startsWith('.githooks/')) fs.chmodSync(path.join(cwd, rel), 0o755);
    } else {
      result.skipped.push(rel);
    }
  }

  const pkg = readJson<{ scripts?: Record<string, string> }>(path.join(cwd, 'package.json'));
  if (pkg && !pkg.scripts?.prepare) {
    const status = patchPackageJson(cwd, { scripts: { prepare: 'git config core.hooksPath .githooks || true' } }, { dryRun });
    if (status === 'modified') result.modified.push('package.json');
    result.nextSteps.push('Run your package manager install once to activate the hooks');
  } else {
    result.nextSteps.push('Activate the hooks: git config core.hooksPath .githooks (a prepare script already exists)');
  }
  result.nextSteps.push('Enable Dependabot security updates in the GitHub repository settings');
  return result;
}

export const guardrailsModule: HelenModule = { meta, execute };
