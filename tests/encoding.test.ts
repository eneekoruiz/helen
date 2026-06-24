import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', '.npm-cache', 'dist', 'node_modules']);
const TEXT_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.rc',
  '.sh',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

function isTextFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return basename.startsWith('.') || TEXT_EXTENSIONS.has(path.extname(filePath));
}

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile() && isTextFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('encoding hygiene', () => {
  it('does not contain mojibake or replacement characters in repository text files', () => {
    const offenders: string[] = [];

    for (const file of walkFiles(ROOT)) {
      const content = fs.readFileSync(file, 'utf8');
      const withoutUrls = content.replace(/https?:\/\/\S+/g, '');
      const hasMojibake = /[\u00C2\u00C3]|\u00E2[\u0080-\u00BF]|\uFFFD/.test(content);
      const hasQuestionMarkAccentLoss = /\p{L}\?\p{L}/u.test(withoutUrls);

      if (hasMojibake || hasQuestionMarkAccentLoss) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
