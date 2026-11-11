#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const res = path.resolve(dir, e.name);
    if (e.isDirectory()) walk(res, cb);
    else cb(res);
  }
}

console.log('Running prebuild checks...');

const repoRoot = path.resolve(__dirname, '..');

// 1) run TypeScript typecheck
console.log('> TypeScript check (tsc --noEmit)');
try {
  const tscPath = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
  const tsc = spawnSync(process.execPath, [tscPath, '--noEmit'], { stdio: 'inherit' });
  if (tsc.status !== 0) {
    console.error('\nTypeScript check failed. Fix type errors before building.');
    process.exit(tsc.status || 1);
  }
} catch (err) {
  console.error('Failed to run local tsc:', err);
  process.exit(1);
}

// 2) disallow client-only imports in server components that can crash Turbopack
// e.g., `react-hot-toast` must only be used in client components.
console.log('> Scanning for forbidden server imports (react-hot-toast)');
const matches = [];
walk(path.join(repoRoot, 'src'), (file) => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx')) return;
  const content = fs.readFileSync(file, 'utf8');
  if (/react-hot-toast/.test(content) && !/"use client"|use client/.test(content)) {
    matches.push(file);
  }
});

if (matches.length > 0) {
  console.error('\nFound imports of `react-hot-toast` inside server components (missing `use client`).\nFiles:');
  matches.forEach((m) => console.error('  -', path.relative(repoRoot, m)));
  console.error('\nPlease move Toaster usage into a client component (e.g., src/components/ToasterClient.tsx).');
  process.exit(2);
}

console.log('Prebuild checks passed.');
process.exit(0);
