#!/usr/bin/env node
// Documentation drift control. Usage: node scripts/docs-facts.mjs check|sync
// Needs a built dist/ (npm run build). `npm run docs:check` and `npm run docs:sync` build first.
import { checkDocs, collectFacts, syncDocs } from '../dist/core/docsFacts.js';

const mode = process.argv[2] ?? 'check';
if (mode === 'sync') {
  const changed = syncDocs();
  console.log(changed.length ? `Updated fact markers in: ${changed.join(', ')}` : 'Fact markers already up to date.');
}
const issues = checkDocs();
if (mode === 'facts') console.log(JSON.stringify(collectFacts(), null, 2));
for (const issue of issues) console.error(`${issue.file}:${issue.line} [${issue.kind}] ${issue.message}`);
if (issues.length) {
  console.error(`\n${issues.length} documentation issue(s).`);
  process.exit(1);
}
console.log('Documentation matches the repository.');
