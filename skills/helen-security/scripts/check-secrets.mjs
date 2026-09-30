#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g, // Google API Key
  /sk-[a-zA-Z0-9]{48}/g,    // OpenAI API Key
  /ghp_[a-zA-Z0-9]{36}/g,   // GitHub Personal Access Token
  /github_pat_[a-zA-Z0-9_]{82}/g, // GitHub Fine-grained PAT
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g, // Slack token
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, // Private Key
];

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '.helen', 'coverage']);

function scan(dir) {
  let issues = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      issues += scan(full);
    } else if (entry.isFile()) {
      if (entry.name === '.env' || entry.name === '.env.local') {
        console.error(`[CRITICAL] Uncommitted environment file found: ${full}`);
        issues++;
        continue;
      }
      try {
        const content = fs.readFileSync(full, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            console.error(`[HIGH] Potential hardcoded secret in ${full} matching ${pattern}`);
            issues++;
          }
        }
      } catch {
        // skip non-text or unreadable files
      }
    }
  }
  return issues;
}

const root = process.argv[2] || process.cwd();
const count = scan(root);
if (count > 0) {
  console.error(`Found ${count} secret risk(s).`);
  process.exit(1);
} else {
  console.log('Zero secret leaks detected.');
  process.exit(0);
}
