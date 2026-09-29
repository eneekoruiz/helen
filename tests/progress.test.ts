import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPlan } from '../src/core/apply.js';
import { currentIndex, formatNext, formatStatus, markDone, readProgress, runChecks, skipStep, startProgress } from '../src/core/progress.js';

describe('progress tracking', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-progress-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('starts a plan, advances step by step and finishes', () => {
    const progress = startProgress(tmp, buildPlan(tmp, 'safe-install'));
    expect(progress.steps.length).toBeGreaterThan(1);
    expect(currentIndex(progress)).toBe(0);

    markDone(tmp, 'read it');
    skipStep(tmp, 'not needed here');
    const finished = readProgress(tmp)!;
    expect(currentIndex(finished)).toBe(-1);
    expect(finished.steps[0]!.note).toBe('read it');
    expect(formatStatus(finished)).toContain('Finished');
  });

  it('does not overwrite a plan in progress unless forced', () => {
    startProgress(tmp, buildPlan(tmp, 'release'));
    expect(() => startProgress(tmp, buildPlan(tmp, 'design'))).toThrow(/still in progress/);
    expect(startProgress(tmp, buildPlan(tmp, 'design'), true).goal).toBe('design');
  });

  it('requires a reason to skip', () => {
    startProgress(tmp, buildPlan(tmp, 'security'));
    expect(() => skipStep(tmp, '  ')).toThrow(/why/);
  });

  it('gates a checkpoint on a passing check', () => {
    startProgress(tmp, buildPlan(tmp, 'quality'));
    // step 1 of quality is the build checkpoint
    expect(() => markDone(tmp)).toThrow(/helen check/);

    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { lint: 'x', test: 'x' } }));
    const failing = runChecks(tmp, (_cwd, _pm, script) => script !== 'test');
    expect(failing.ok).toBe(false);
    expect(() => markDone(tmp)).toThrow(/helen check/);

    const passing = runChecks(tmp, () => true);
    expect(passing.ok).toBe(true);
    expect(currentIndex(markDone(tmp))).toBe(1);
  });

  it('falls back to npm when no lockfile identifies the package manager', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { test: 'x' } }));
    const managers: string[] = [];

    runChecks(tmp, (_cwd, pm) => {
      managers.push(pm);
      return true;
    });

    expect(managers).toEqual(['npm']);
  });

  it('a project with no check scripts never passes the gate silently', () => {
    expect(runChecks(tmp, () => true).ok).toBe(false);
  });

  it('shows everything needed for the current step', () => {
    startProgress(tmp, buildPlan(tmp, 'safe-install'));
    const first = formatNext(readProgress(tmp)!);
    expect(first).toContain('[prompt] audit-third-party-skills-supply-chain');
    expect(first).toContain('helen done');

    markDone(tmp);
    expect(formatNext(readProgress(tmp)!)).toContain('helen-security');
  });

  it('external steps ask for approval and show the commands', () => {
    startProgress(tmp, buildPlan(tmp, 'copy'));
    for (let i = 0; i < 4; i++) skipStep(tmp, 'test');
    const next = formatNext(readProgress(tmp)!);
    expect(next).toContain('External tool');
    expect(next).toContain('explicit approval');
  });
});
