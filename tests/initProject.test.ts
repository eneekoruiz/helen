import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInitProject } from '../src/core/initProject.js';
import { readProgress } from '../src/core/progress.js';

describe('helen init-project', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-init-project-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('rejects invalid goals and agents before creating a project', async () => {
    await expect(runInitProject({ cwd: tmp, name: 'invalid-goal', goal: 'not-a-goal' })).rejects.toThrow(/No goal matches/);
    await expect(runInitProject({ cwd: tmp, name: 'invalid-agent', agents: ['unknown'] })).rejects.toThrow(/Unknown agent/);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it('rejects names that escape the project root before writing', async () => {
    await expect(runInitProject({ cwd: tmp, name: '../outside-project' })).rejects.toThrow(/inside/);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it('rejects a file used as the project directory', async () => {
    fs.writeFileSync(path.join(tmp, 'file'), 'keep');
    await expect(runInitProject({ cwd: tmp, name: 'file' })).rejects.toThrow(/not a directory/);
    expect(fs.readFileSync(path.join(tmp, 'file'), 'utf8')).toBe('keep');
  });

  it('uses the current folder name rather than a dot as the package name', async () => {
    await runInitProject({ cwd: tmp, name: '.', agents: ['codex'] });
    const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'));
    expect(pkg.name).toBe(path.basename(tmp));
  });

  it('initializes an empty directory with setup, guardrails and plan', async () => {
    const result = await runInitProject({ cwd: tmp });

    expect(result.projectDir).toBe(tmp);
    expect(result.chosenGoal).toBe('strategy');
    expect(fs.existsSync(path.join(tmp, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-apply/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.githooks/pre-commit'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.github/dependabot.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.helen/progress.json'))).toBe(true);

    const progress = readProgress(tmp);
    expect(progress?.goal).toBe('strategy');
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it('creates and initializes a named subdirectory when name is provided', async () => {
    const targetSubdir = 'new-sample-app';
    const result = await runInitProject({ cwd: tmp, name: targetSubdir });

    const expectedDir = path.join(tmp, targetSubdir);
    expect(result.projectDir).toBe(expectedDir);
    expect(result.isNewFolder).toBe(true);
    expect(fs.existsSync(expectedDir)).toBe(true);
    expect(fs.existsSync(path.join(expectedDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(expectedDir, '.helen/progress.json'))).toBe(true);
  });

  it('is strictly idempotent on a second run without altering or corrupting state', async () => {
    // First run
    const firstRun = await runInitProject({ cwd: tmp, goal: 'strategy' });
    expect(firstRun.setupResult.skillsCreated.length).toBeGreaterThan(0);

    // Read initial progress timestamp
    const firstProgress = readProgress(tmp);
    expect(firstProgress).not.toBeNull();

    // Second run
    const secondRun = await runInitProject({ cwd: tmp, goal: 'strategy' });
    expect(secondRun.setupResult.skillsCreated.length).toBe(0);
    expect(secondRun.setupResult.skillsSkipped.length).toBeGreaterThan(0);
    expect(secondRun.guardrailsResult.created.length).toBe(0);

    const secondProgress = readProgress(tmp);
    expect(secondProgress?.goal).toBe('strategy');
  });

  it('respects dry-run mode and writes nothing to disk', async () => {
    const dryRunName = 'dry-run-project';
    const result = await runInitProject({ cwd: tmp, name: dryRunName, dryRun: true });

    const target = path.join(tmp, dryRunName);
    expect(fs.existsSync(target)).toBe(false);
    expect(result.actionsTaken.some(a => a.includes('DRY-RUN'))).toBe(true);
  });

  it('adopts an existing project and respects custom goal', async () => {
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'existing-app', scripts: { test: 'vitest' } }, null, 2),
      'utf-8'
    );
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), 'console.log("hello");\n', 'utf-8');

    const result = await runInitProject({ cwd: tmp, goal: 'qa' });
    expect(result.chosenGoal).toBe('qa');
    const progress = readProgress(tmp);
    expect(progress?.goal).toBe('qa');
  });
});
