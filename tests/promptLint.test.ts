import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintPrompts, looksSpanish } from '../src/core/promptLint.js';

const GOOD = (action: string, phase: string) =>
  `---\naction: ${action}\nphase: ${phase}\nsummary: A short summary.\nmodifies_code: false\n---\n\n# Title\n\n## Goal\n\nThe goal.\n\n## Use when\n\n- Always.\n\n## Requirements\n\n1. Check the thing.\n\n## Limits\n\n- None.\n\n## Output\n\nA list.\n`;

function library(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-lint-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

describe('Prompt lint', () => {
  it('the bundled prompt library has no issues', () => {
    expect(lintPrompts()).toEqual([]);
  });

  it('accepts a prompt that follows the contract', () => {
    const root = library({ '02-building/x/AUDIT-a.md': GOOD('AUDIT', '02-building'), '02-building/README.md': '# B\n' });
    const messages = lintPrompts(root).map(issue => issue.message);
    expect(messages.filter(message => !message.includes('index'))).toEqual([]);
  });

  it('reports frontmatter, prefix, phase, sections, links and legacy text', () => {
    const root = library({
      '02-building/x/AUDIT-a.md': '# no frontmatter\n[b](./missing.md)\n',
      '02-building/x/APPLY-b.md': GOOD('AUDIT', '03-finish-features').replace('## Output\n\nA list.\n', ''),
      '02-building/x/APPLY-c-flow.md': GOOD('APPLY', '02-building'),
      '02-building/x/ENHANCE-d.md': GOOD('ENHANCE', '02-building') + '\n## Nivel 0 y Mente Abierta\n',
    });
    const messages = lintPrompts(root).map(issue => `${issue.file}: ${issue.message}`);

    expect(messages).toContain('02-building/x/AUDIT-a.md: missing YAML frontmatter');
    expect(messages).toContain('02-building/x/AUDIT-a.md: broken link: ./missing.md');
    expect(messages).toContain('02-building/x/APPLY-b.md: action "AUDIT" does not match file prefix "APPLY"');
    expect(messages).toContain('02-building/x/APPLY-b.md: phase "03-finish-features" does not match directory "02-building"');
    expect(messages).toContain('02-building/x/APPLY-b.md: missing section "## Output"');
    expect(messages).toContain('02-building/x/APPLY-c-flow.md: flows need "repeatable" and "stage"');
    expect(messages).toContain('02-building/x/ENHANCE-d.md: contains legacy text "Nivel 0"');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reports duplicate aliases', () => {
    const withAlias = GOOD('AUDIT', '02-building').replace('modifies_code: false\n', 'modifies_code: false\naliases:\n  - old-id\n');
    const root = library({ '02-building/x/AUDIT-a.md': withAlias, '02-building/x/AUDIT-b.md': withAlias });
    expect(lintPrompts(root).some(issue => issue.message.includes('alias "old-id" also used by'))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('detects Spanish prose but ignores code and English', () => {
    expect(looksSpanish('Revisa que los textos de la web sean claros para el usuario, con una jerarquía que funcione cuando se comparte y sin errores por todas las páginas.')).toBe(true);
    expect(looksSpanish('Check that the site copy is clear for the user, with a hierarchy that works when shared and without errors.')).toBe(false);
    expect(looksSpanish('Use `para que los con una del` in code only.')).toBe(false);
  });
});
