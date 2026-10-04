import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCK_END, BLOCK_START, helenBlock, setupProject, upsertBlock, uninstallProject } from '../src/core/setup.js';
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
    vi.unstubAllEnvs();
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reports global installed files and includes requested flows', () => {
    const home = path.join(tmp, 'home');
    vi.stubEnv('HOME', home);
    const result = setupProject({ cwd: tmp, agents: ['claude'], global: true, flows: true });
    const globalFlow = path.join(home, '.claude', 'skills', 'helen-flow-full-polish', 'SKILL.md');
    expect(fs.existsSync(globalFlow)).toBe(true);
    expect(result.skills.created).toContain(globalFlow);
  });

  it('uninstall leaves unrelated instructions untouched and unreported', () => {
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), 'User instructions\n');
    expect(uninstallProject({ cwd: tmp }).cleanedInstructions).toEqual([]);
    expect(fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8')).toBe('User instructions\n');
  });

  it('uninstall never follows a skill directory junction outside the project', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-uninstall-outside-'));
    try {
      fs.mkdirSync(path.join(outside, 'helen-custom'));
      fs.writeFileSync(path.join(outside, 'helen-custom', 'SKILL.md'), 'keep');
      fs.mkdirSync(path.join(tmp, '.agents'));
      fs.symlinkSync(outside, path.join(tmp, '.agents', 'skills'), 'junction');
      expect(uninstallProject({ cwd: tmp }).removedSkills).toEqual([]);
      expect(fs.readFileSync(path.join(outside, 'helen-custom', 'SKILL.md'), 'utf8')).toBe('keep');
    } finally {
      fs.rmSync(path.join(tmp, '.agents', 'skills'), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
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

  it('updates managed quality rules while preserving user text and unrelated rules', () => {
    setupProject({ cwd: tmp, agents: ['codex'] });
    const quality = path.join(tmp, '.agents', 'rules', 'quality.md');
    fs.writeFileSync(quality, `Before\n${BLOCK_START}\nobsolete\n${BLOCK_END}\nAfter\n`);
    const custom = path.join(tmp, '.agents', 'rules', 'security.md');
    fs.writeFileSync(custom, '# Custom security rules\nPreserve this\n');
    setupProject({ cwd: tmp, agents: ['codex'] });
    const content = fs.readFileSync(quality, 'utf8');
    expect(content).toContain('HELEN execution contract');
    expect(content).not.toContain('obsolete');
    expect(content).toContain('Before');
    expect(content).toContain('After');
    expect(fs.readFileSync(custom, 'utf8')).toBe('# Custom security rules\nPreserve this\n');
  });

  it('migrates the exact legacy quality rules without replacing edited legacy files', () => {
    const legacy = fs.readFileSync(new URL('./fixtures/legacy-quality.md', import.meta.url), 'utf8');
    const rules = path.join(tmp, '.agents', 'rules');
    fs.mkdirSync(rules, { recursive: true });
    const file = path.join(rules, 'quality.md');
    fs.writeFileSync(file, legacy + '\nUser addition\n');
    setupProject({ cwd: tmp, agents: ['codex'] });
    expect(fs.readFileSync(file, 'utf8')).toContain('User addition');
    fs.writeFileSync(file, legacy);
    setupProject({ cwd: tmp, agents: ['codex'] });
    expect(fs.readFileSync(file, 'utf8')).toContain('HELEN execution contract');
    expect(fs.readFileSync(file, 'utf8')).not.toContain('Level 100');
  });

  it('writes nothing on dry-run', () => {
    setupProject({ cwd: tmp, agents: ['claude'], dryRun: true });

    expect(fs.existsSync(path.join(tmp, 'AGENTS.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, '.claude'))).toBe(false);
  });
  it('uninstall cleans up managed rules in .agents/rules', () => {
    const rulesDir = path.join(tmp, '.agents', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), `${BLOCK_START}\nmanaged\n${BLOCK_END}\n`);
    fs.writeFileSync(path.join(rulesDir, 'quality.md'), `custom\n${BLOCK_START}\nmanaged\n${BLOCK_END}\n`);
    const uninst = uninstallProject({ cwd: tmp });
    expect(uninst.cleanedRules).toContain('.agents/rules/security.md');
    expect(uninst.cleanedRules).toContain('.agents/rules/quality.md');
    expect(fs.existsSync(path.join(rulesDir, 'security.md'))).toBe(false);
    expect(fs.readFileSync(path.join(rulesDir, 'quality.md'), 'utf8')).toContain('custom');
  });
});
