import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt } from '../src/core/prompts.js';

describe('Execution protocol footer', () => {
  const executable = listPromptEntries().filter((e) => e.kind === 'prompt' || e.kind === 'flow' || e.kind === 'checkpoint');

  it('is appended to every prompt and flow', () => {
    expect(executable.length).toBeGreaterThan(0);
    for (const entry of executable) {
      const text = readPrompt(entry.id);
      expect(text, entry.id).toContain('Model cascade');
      expect(text, entry.id).toContain('Playwright');
      expect(text, entry.id).toContain('Parallelism');
      expect(text, entry.id).toContain('HELEN execution contract');
      expect(text, entry.id).toContain('Acceptance');
      expect(text, entry.id).toContain('Improvement discovery');
      expect(text, entry.id).not.toMatch(/Level 100|100\/100|30% to 50%|saving up to 90%/);
    }
  });

  it('is not appended to library guides', () => {
    expect(readPrompt('rules')).not.toContain('Execution protocol (applies to every prompt');
  });

  it('can be disabled explicitly', () => {
    const first = executable[0];
    expect(readPrompt(first.id, undefined, { level100: false })).not.toContain('Model cascade');
  });

  it('supports the current protocol option without removing legacy opt-out', () => {
    const first = executable[0];
    expect(readPrompt(first.id, undefined, { protocol: false })).not.toContain('HELEN execution contract');
    expect(readPrompt(first.id, undefined, { protocol: true, level100: false })).toContain('HELEN execution contract');
  });

  it('bundled skills preserve scope and replace unsupported guarantees with evidence', () => {
    const root = path.resolve('skills');
    for (const folder of fs.readdirSync(root)) {
      const file = path.join(root, folder, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf-8');
      expect(text, folder).toMatch(/acceptance/i);
      expect(text, folder).toMatch(/authoriz/i);
      expect(text, folder).toMatch(/cheapest/i);
      expect(text, folder).toMatch(/speciali[sz]/i);
      expect(text, folder).toMatch(/discover/i);
      expect(text, folder).not.toMatch(/Level 100|100\/100|pristine 10\/10|saving up to 90%|30[-–]%?50%|30% to 50%/);
    }
  });
});
