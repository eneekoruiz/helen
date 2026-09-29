import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintPrompts } from '../src/core/promptLint.js';

describe('Prompt lint', () => {
  it('the bundled prompt library has no issues', () => {
    expect(lintPrompts()).toEqual([]);
  });

  it('reports missing frontmatter, bad prefix, and broken links', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-lint-'));
    const dir = path.join(root, '02-building', 'x');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'AUDIT-a.md'), '# no frontmatter\n[b](./missing.md)\n');
    fs.writeFileSync(
      path.join(dir, 'APPLY-b.md'),
      '---\naction: AUDIT\nlabel: AUDIT-\nphase: 02-building\nmodifies_code: false\nstop_conditions:\n  - x\n---\n',
    );

    const messages = lintPrompts(root).map(issue => `${issue.file}: ${issue.message}`);

    expect(messages).toContain('02-building/x/AUDIT-a.md: missing YAML frontmatter');
    expect(messages).toContain('02-building/x/AUDIT-a.md: broken link: ./missing.md');
    expect(messages.some(m => m.includes('does not match file prefix "APPLY"'))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
