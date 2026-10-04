import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt, readPromptEntry } from '../src/core/prompts.js';
import { EXECUTION_CONTRACT } from '../src/core/executionProtocol.js';

describe('Execution protocol footer', () => {
  const executable = listPromptEntries().filter((e) => e.kind === 'prompt' || e.kind === 'flow' || e.kind === 'checkpoint');

  it('is appended to every prompt and flow', () => {
    expect(executable.length).toBeGreaterThan(0);
    for (const entry of executable) {
      const text = readPromptEntry(entry);
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

  it('exports an identical stable prefix across different cache-ready tasks', () => {
    for (const entry of executable.slice(0, 3)) {
      const text = readPrompt(entry.id, undefined, { cacheReady: true });
      expect(text.startsWith(`${EXECUTION_CONTRACT}\n\n---\n`)).toBe(true);
      expect(text.match(/HELEN execution contract/g)).toHaveLength(1);
      expect(readPrompt(entry.id, undefined, { cacheReady: true, protocol: false })).not.toContain('HELEN execution contract');
    }
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

  it('reprompt uses native task-specific questions without a separate editor', () => {
    const text = fs.readFileSync('skills/helen-reprompt/SKILL.md', 'utf8');
    expect(text).toContain('native structured question form');
    expect(text).toContain('request_user_input_async');
    expect(text).toContain('never impose a fixed questionnaire');
    expect(text).toContain('silence is not an answer or authorization');
  });

  it('allows single-agent execution and makes delegation depend on total overhead', () => {
    expect(EXECUTION_CONTRACT).toContain('use one agent for small cohesive tasks');
    expect(EXECUTION_CONTRACT).toContain('Delegate only when');
    expect(EXECUTION_CONTRACT).toContain('context transfer, coordination, integration, verification and retries');
    expect(EXECUTION_CONTRACT).toContain('If the primary model cannot be changed');
    for (const folder of fs.readdirSync('skills')) {
      const file = path.join('skills', folder, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      expect(fs.readFileSync(file, 'utf8'), folder).toContain('Use one agent for small cohesive tasks');
    }
  });
});
