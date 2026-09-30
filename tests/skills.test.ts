import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installSkills, listFlowSkills, listSkills, resolveTargetDir, validateSkills } from '../src/core/skills.js';

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
    expect(listSkills().map(skill => skill.name)).toContain('helen-clean-code');
  });

  it('every bundled skill has name and description frontmatter matching its folder', () => {
    for (const skill of listSkills()) {
      const content = fs.readFileSync(path.join(skill.dir!, 'SKILL.md'), 'utf-8');
      expect(content).toMatch(new RegExp(`^---\\nname: ${skill.name}\\ndescription: .+\\n---`));
      expect(content.length).toBeGreaterThan(200);
      const description = /^description: (.+)$/m.exec(content)![1]!;
      expect(description.length).toBeLessThanOrEqual(1024);
      expect(content.split('\n').length).toBeLessThan(500);
    }
  });

  it('bundled skills pass structural validation', () => {
    expect(validateSkills()).toEqual([]);
  });

  it('installs into the claude and codex directories', () => {
    const result = installSkills({ cwd: tmp, targets: ['claude', 'codex'] });

    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-clean-code/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.agents/skills/helen-clean-code/SKILL.md'))).toBe(true);
    expect(result.created).toContain(path.join('.claude/skills/helen-clean-code/SKILL.md'));
    expect(result.created).toContain(path.join('.agents/skills/helen-clean-code/SKILL.md'));
    expect(result.skipped).toHaveLength(0);
  });

  it('supports a generic custom directory', () => {
    installSkills({ cwd: tmp, targets: ['custom'], customDir: 'my-agent/skills' });

    expect(fs.existsSync(path.join(tmp, 'my-agent/skills/helen-clean-code/SKILL.md'))).toBe(true);
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
      expect(content).toMatch(new RegExp(`^---\\nname: ${flow.name}\\ndescription: ".+"\\n---`));
      expect(content).not.toMatch(/\]\([^)]*\.md\)/);
      expect(content).not.toContain('## Objetivo');
    }
  });

  it('installs flow skills only when requested', () => {
    installSkills({ cwd: tmp, targets: ['claude'], skills: ['helen-clean-code'] });
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-flow-full-polish'))).toBe(false);

    installSkills({ cwd: tmp, targets: ['claude'], flows: true, skills: ['helen-flow-full-polish'] });
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-flow-full-polish/SKILL.md'))).toBe(true);
  });
});
