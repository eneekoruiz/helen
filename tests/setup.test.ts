import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_END, BLOCK_START, helenBlock, setupProject, upsertBlock } from '../src/core/setup.js';
import { SKILL_TARGETS } from '../src/core/skills.js';

describe('helen setup', () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-setup-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('antigravity shares the codex folder (documented .agents/skills)', () => {
    expect(SKILL_TARGETS.antigravity).toBe('.agents/skills');
  });

  it('installs skills for all agents and writes AGENTS.md and CLAUDE.md', () => {
    const result = setupProject({ cwd: tmp, agents: ['claude', 'codex', 'antigravity'] });

    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-apply/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.agents/skills/helen-apply/SKILL.md'))).toBe(true);
    expect(result.instructionFiles).toEqual(['AGENTS.md', 'CLAUDE.md']);
    expect(fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf-8')).toContain('helen apply');
    expect(result.skills.skipped).toHaveLength(0);
  });

  it('codex and antigravity together write the shared folder once', () => {
    const result = setupProject({ cwd: tmp, agents: ['codex', 'antigravity'] });

    expect(result.skills.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp, 'CLAUDE.md'))).toBe(false);
  });

  it('keeps existing instructions and is idempotent', () => {
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# My rules\n\nBe kind.\n');
    setupProject({ cwd: tmp, agents: ['codex'] });
    setupProject({ cwd: tmp, agents: ['codex'] });

    const content = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('Be kind.');
    expect(content.split(BLOCK_START)).toHaveLength(2);
  });

  it('replaces only the managed block', () => {
    const old = `before\n${BLOCK_START}\nOLD\n${BLOCK_END}\nafter\n`;
    const updated = upsertBlock(old, helenBlock());

    expect(updated).not.toContain('OLD');
    expect(updated.startsWith('before')).toBe(true);
    expect(updated.trimEnd().endsWith('after')).toBe(true);
  });

  it('writes nothing on dry-run', () => {
    setupProject({ cwd: tmp, agents: ['claude'], dryRun: true });

    expect(fs.existsSync(path.join(tmp, 'AGENTS.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, '.claude'))).toBe(false);
  });
});
