import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPlan, detectPhase, formatBrief, formatPlan, readPlaybooks, resolveGoal, suggestedGoals, validatePlaybooks } from '../src/core/apply.js';
import { installSkills } from '../src/core/skills.js';

describe('helen apply', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-apply-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('playbooks point only at things that exist', () => {
    expect(validatePlaybooks()).toEqual([]);
  });

  it('every phase suggests goals that exist', () => {
    const playbooks = readPlaybooks();
    for (const phase of Object.keys(playbooks.phaseGoals)) {
      expect(suggestedGoals(phase, playbooks).length).toBeGreaterThan(0);
    }
  });

  it('resolves goal ids and free text in Spanish and English', () => {
    expect(resolveGoal('design')).toBe('design');
    expect(resolveGoal('aplica todas las mejoras de diseño')).toBe('design');
    expect(resolveGoal('quiero publicar la web en vercel')).toBe('deploy');
    expect(resolveGoal('review security vulnerabilities')).toBe('security');
    expect(resolveGoal('zzz')).toBeUndefined();
  });

  it('detects the phase from the file system with evidence', () => {
    expect(detectPhase(tmp).phase).toBe('01-start-project');

    fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'src'));
    expect(detectPhase(tmp).phase).toBe('02-building');

    fs.mkdirSync(path.join(tmp, 'tests'));
    fs.mkdirSync(path.join(tmp, '.github/workflows'), { recursive: true });
    const finishing = detectPhase(tmp);
    expect(finishing.phase).toBe('03-finish-features');
    expect(finishing.evidence).toContain('tests present');

    fs.writeFileSync(path.join(tmp, 'CHANGELOG.md'), '# Changelog');
    expect(detectPhase(tmp).phase).toBe('06-release');
  });

  it('reports bundled skills that are missing until installed', () => {
    const before = buildPlan(tmp, 'design');
    expect(before.missingSkills).toContain('helen-design');

    installSkills({ cwd: tmp, targets: ['claude'], skills: before.missingSkills });
    const after = buildPlan(tmp, 'design');
    expect(after.missingSkills).toEqual([]);
  });

  it('formats a readable plan and a paste-ready brief', () => {
    const plan = buildPlan(tmp, 'release');

    expect(formatPlan(plan)).toContain('Detected phase');
    expect(formatPlan(plan)).toContain('helen prompts show');
    const brief = formatBrief(plan);
    expect(brief).toContain('Use the HELEN repository');
    expect(brief).toContain('Do not install any external tool');
    expect(brief.startsWith('**HELEN execution contract**')).toBe(true);
    expect(brief).toContain('--no-protocol');
    expect(brief).toContain('new specialist the shared contract');
    expect(formatPlan(plan)).not.toContain('--no-protocol');
  });

  it('rejects an unknown goal with the list of valid ones', () => {
    expect(() => buildPlan(tmp, 'qwerty')).toThrow(/Goals:/);
  });

  it('does not resolve inherited Object properties as goal ids', () => {
    expect(resolveGoal('constructor')).toBeUndefined();
    expect(resolveGoal('__proto__')).toBeUndefined();
  });

  it('loads custom playbooks from the requested project directory', () => {
    fs.mkdirSync(path.join(tmp, '.helen'));
    fs.writeFileSync(path.join(tmp, '.helen', 'playbooks.json'), JSON.stringify({
      goals: { custom: { title: 'Custom workflow', description: 'Local', keywords: ['LOCALWORKFLOW'], steps: [] } },
    }));
    expect(buildPlan(tmp, 'localworkflow').goalId).toBe('custom');
  });
});
