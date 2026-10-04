import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installSkills, listFlowSkills, listSkills, resolveTargetDir, validateSkills } from '../src/core/skills.js';
import { parseFrontmatter } from '../src/core/frontmatter.js';
import { EXECUTION_CONTRACT } from '../src/core/executionProtocol.js';

describe('Skills installer', () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-skills-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('lists the bundled skills with a SKILL.md', () => {
    expect(listSkills().map(skill => skill.name)).toContain('helen-audit');
  });

  it('every bundled skill has name and description frontmatter matching its folder', () => {
    for (const skill of listSkills()) {
      const content = fs.readFileSync(path.join(skill.dir!, 'SKILL.md'), 'utf-8');
      expect(content).toMatch(new RegExp(`^---\\r?\\nname: ${skill.name}\\r?\\ndescription: .+(\\r?\\nversion: .+)?\\r?\\n---`));
      expect(content.length).toBeGreaterThan(200);
      const description = /^description: (.+)$/m.exec(content)![1]!;
      expect(description.length).toBeLessThanOrEqual(1024);
      expect(content.replace(/\r\n/g, '\n').split('\n').length).toBeLessThan(500);
    }
  });

  it('bundled skills pass structural validation', () => {
    expect(validateSkills()).toEqual([]);
  });

  it('installs into the claude and codex directories', () => {
    const result = installSkills({ cwd: tmp, targets: ['claude', 'codex'] });

    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-audit/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.agents/skills/helen-audit/SKILL.md'))).toBe(true);
    expect(result.created).toContain(path.join('.claude/skills/helen-audit/SKILL.md'));
    expect(result.created).toContain(path.join('.agents/skills/helen-audit/SKILL.md'));
    expect(result.skipped).toHaveLength(0);
  });

  it('supports a generic custom directory', () => {
    installSkills({ cwd: tmp, targets: ['custom'], customDir: 'my-agent/skills' });

    expect(fs.existsSync(path.join(tmp, 'my-agent/skills/helen-audit/SKILL.md'))).toBe(true);
  });

  it('skips skill destinations reached through a directory junction', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-skills-outside-'));
    try {
      fs.mkdirSync(path.join(tmp, '.agents'));
      fs.symlinkSync(outside, path.join(tmp, '.agents', 'skills'), 'junction');
      const result = installSkills({ cwd: tmp, targets: ['codex'], skills: ['helen-audit'] });
      expect(result.created).toEqual([]);
      expect(result.skipped.length).toBeGreaterThan(0);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(path.join(tmp, '.agents', 'skills'), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('rejects custom dirs that escape the project or are missing', () => {
    expect(() => resolveTargetDir('custom')).toThrow(/requires --dir/);
    expect(() => resolveTargetDir('custom', '../outside')).toThrow(/inside the project/);
    expect(() => resolveTargetDir('custom', '/abs/path')).toThrow(/inside the project/);
  });

  it('does not write on dry-run and skips existing files without force', () => {
    installSkills({ cwd: tmp, targets: ['claude'], dryRun: true });
    expect(fs.existsSync(path.join(tmp, '.claude'))).toBe(false);

    const first = installSkills({ cwd: tmp, targets: ['claude'] });
    const second = installSkills({ cwd: tmp, targets: ['claude'] });
    expect(second.skipped).toHaveLength(first.created.length);
  });

  it('errors on an unknown skill name', () => {
    expect(() => installSkills({ cwd: tmp, targets: ['claude'], skills: ['nope'] })).toThrow(/not found/);
  });

  it('turns every executable flow into a valid, self-contained skill', () => {
    const flows = listFlowSkills();
    const names = flows.map(skill => skill.name);

    expect(flows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(names).size).toBe(names.length);
    for (const flow of flows) {
      const content = flow.files!['SKILL.md']!;
      expect(content).toMatch(new RegExp(`^---\\r?\\nname: ${flow.name}\\r?\\ndescription: ".+"\\r?\\n---`));
      expect(content).not.toMatch(/\]\([^)]*\.md\)/);
      expect(content).not.toContain('## Objetivo');
      expect(content).toContain('HELEN execution contract');
      expect(content).toContain('Improvement discovery');
    }
  });

  it('installs flow skills only when requested', () => {
    installSkills({ cwd: tmp, targets: ['claude'], skills: ['helen-audit'] });
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-flow-full-polish'))).toBe(false);

    installSkills({ cwd: tmp, targets: ['claude'], flows: true, skills: ['helen-flow-full-polish'] });
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-flow-full-polish/SKILL.md'))).toBe(true);
  });

  it('places identical shared instructions before each generated flow body', () => {
    const bodies = listFlowSkills().map(flow => parseFrontmatter(flow.files!['SKILL.md']!).body);
    const prefix = bodies[0].split('\n\n---\n')[0];
    expect(prefix).toContain(EXECUTION_CONTRACT);
    for (const body of bodies) {
      expect(body.startsWith(`${prefix}\n\n---\n`)).toBe(true);
      expect(body.match(/HELEN execution contract/g)).toHaveLength(1);
    }
  });
});
