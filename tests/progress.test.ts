import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlan } from '../src/core/apply.js';
import { currentIndex, formatNext, formatStatus, markDone, readProgress, runChecks, skipStep, startProgress } from '../src/core/progress.js';

describe('progress tracking', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-progress-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('starts a plan, advances step by step and finishes', () => {
    const progress = startProgress(tmp, buildPlan(tmp, 'safe-install'));
    expect(progress.steps.length).toBeGreaterThan(1);
    expect(currentIndex(progress)).toBe(0);

    markDone(tmp, 'read it');
    for (let i = 1; i < progress.steps.length; i++) skipStep(tmp, 'not needed here');
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

  it('preserves the previous progress and removes temporary files when a save fails', () => {
    startProgress(tmp, buildPlan(tmp, 'strategy'));
    const file = path.join(tmp, '.helen', 'progress.json');
    const before = fs.readFileSync(file, 'utf-8');
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('filesystem unavailable'); });
    expect(() => markDone(tmp)).toThrow('filesystem unavailable');
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(fs.readdirSync(path.dirname(file)).some(name => name.endsWith('.tmp'))).toBe(false);
  });

  it('refuses to save through a .helen junction outside the project', () => {
    const project = path.join(tmp, 'project');
    const outside = path.join(tmp, 'outside');
    fs.mkdirSync(project);
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(project, '.helen'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => startProgress(project, buildPlan(project, 'strategy'))).toThrow(/inside the project/);
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('rejects malformed progress rather than treating corrupt data as completed', () => {
    fs.mkdirSync(path.join(tmp, '.helen'));
    fs.writeFileSync(path.join(tmp, '.helen', 'progress.json'), JSON.stringify({ steps: [] }));
    expect(() => readProgress(tmp)).toThrow(/Invalid progress file/);
  });

  it('requires a fresh check after advancing to another checkpoint', () => {
    const plan = buildPlan(tmp, 'quality');
    plan.goal = { ...plan.goal, steps: [plan.goal.steps[0]!, plan.goal.steps[0]!] };
    startProgress(tmp, plan);
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { test: 'x' } }));
    runChecks(tmp, () => true);
    markDone(tmp);
    expect(() => markDone(tmp)).toThrow(/helen check/);
    runChecks(tmp, () => true);
    expect(currentIndex(markDone(tmp))).toBe(-1);
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

  it('invalidates a passing gate when a later runner or package parsing throws', () => {
    startProgress(tmp, buildPlan(tmp, 'quality'));
    const pkgFile = path.join(tmp, 'package.json');
    fs.writeFileSync(pkgFile, JSON.stringify({ scripts: { test: 'x' } }));
    runChecks(tmp, () => true);
    expect(() => runChecks(tmp, () => { throw new Error('runner failed'); })).toThrow('runner failed');
    expect(() => markDone(tmp)).toThrow(/helen check/);
    runChecks(tmp, () => true);
    fs.writeFileSync(pkgFile, '{broken');
    expect(() => runChecks(tmp, () => true)).toThrow();
    expect(() => markDone(tmp)).toThrow(/helen check/);
  });

  it('rejects a recorded passing gate with failed or missing script results', () => {
    startProgress(tmp, buildPlan(tmp, 'quality'));
    const file = path.join(tmp, '.helen', 'progress.json');
    const progress = readProgress(tmp)!;
    progress.lastCheck = { ok: true, at: new Date().toISOString(), results: [{ script: 'test', ok: false }] };
    fs.writeFileSync(file, JSON.stringify(progress));
    expect(() => markDone(tmp)).toThrow(/Check status must agree/);
    progress.lastCheck.results = [];
    fs.writeFileSync(file, JSON.stringify(progress));
    expect(() => markDone(tmp)).toThrow(/Check status must agree/);
  });

  it('shows everything needed for the current step', () => {
    startProgress(tmp, buildPlan(tmp, 'safe-install'));
    const first = formatNext(readProgress(tmp)!);
    expect(first).toContain('[prompt] audit-third-party-tools-and-mcp');
    expect(first).toContain('helen done');
    expect(first).not.toContain('modifies_code:');

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
