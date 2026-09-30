import fs from 'node:fs';

const msgFile = process.argv[2];
if (!msgFile) process.exit(0);

const message = fs.readFileSync(msgFile, 'utf-8').trim();

// Skip automated or merge commits
if (message.startsWith('Merge ') || message.startsWith('chore(release):') || message.startsWith('Revert ')) {
  process.exit(0);
}

const CONVENTIONAL_PATTERN = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_-]+\))?!?: .+/i;

if (!CONVENTIONAL_PATTERN.test(message.split('\n')[0])) {
  console.error('\n[HELEN] Commit message must follow Conventional Commits format:');
  console.error('  e.g., feat(core): add shell completions command');
  console.error('  e.g., fix(apply): handle missing playbooks safely\n');
  process.exit(1);
}

process.exit(0);
