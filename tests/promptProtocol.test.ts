import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt } from '../src/core/prompts.js';

describe('Execution protocol footer', () => {
  const executable = listPromptEntries().filter((e) => e.kind === 'prompt' || e.kind === 'flow');

  it('is appended to every prompt and flow', () => {
    expect(executable.length).toBeGreaterThan(0);
    for (const entry of executable) {
      const text = readPrompt(entry.id);
      expect(text, entry.id).toContain('Model cascade');
      expect(text, entry.id).toContain('Playwright');
      expect(text, entry.id).toContain('Parallelism');
      expect(text, entry.id).toContain('No false 10/10');
    }
  });

  it('is not appended to library guides', () => {
    expect(readPrompt('rules')).not.toContain('Execution protocol (applies to every prompt');
  });

  it('can be disabled explicitly', () => {
    const first = executable[0];
    expect(readPrompt(first.id, undefined, { level100: false })).not.toContain('Model cascade');
  });
});
