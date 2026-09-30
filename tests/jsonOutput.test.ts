import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatJsonEnvelope, setJsonMode } from '../src/core/jsonOutput.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli.js');

function runCli(args: string[], cwd: string = root): { status: number; stdout: string; stderr: string; json: any } {
  let execArgs: string[];
  if (fs.existsSync(cli)) {
    execArgs = [cli, ...args];
  } else {
    const tsxBin = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const srcCli = path.join(root, 'src', 'cli.ts');
    execArgs = [tsxBin, srcCli, ...args];
  }

  const res = spawnSync(process.execPath, execArgs, {
    cwd,
    encoding: 'utf-8',
  });

  let json = null;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    // not valid json
  }

  return {
    status: res.status ?? 1,
    stdout: res.stdout,
    stderr: res.stderr,
    json,
  };
}

describe('JSON Output Envelope & Mode', () => {
  beforeEach(() => {
    setJsonMode(false);
  });

  it('formats envelope correctly with ok, command, data, warnings and errors', () => {
    const envelope = formatJsonEnvelope('test-cmd', { foo: 'bar' });
    expect(envelope).toEqual({
      ok: true,
      command: 'test-cmd',
      data: { foo: 'bar' },
      warnings: [],
      errors: [],
    });
  });

  it('sets ok to false when errors are present', () => {
    const envelope = formatJsonEnvelope('test-cmd', {}, { errors: ['Something failed'] });
    expect(envelope.ok).toBe(false);
    expect(envelope.errors).toContain('Something failed');
  });
});

describe('CLI Global --json Commands & Shapes', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-cli-json-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('fails with exit code 1 when attempting interactive menu in --json mode', () => {
    const res = runCli(['--json'], tmp);
    expect(res.status).toBe(1);
    expect(res.json).not.toBeNull();
    expect(res.json.ok).toBe(false);
    expect(res.json.command).toBe('root');
    expect(res.json.errors[0]).toMatch(/Interactive menu cannot be run in --json mode/);
  });

  it('outputs valid JSON shape for helen apply design --json (snapshot)', () => {
    const res = runCli(['apply', 'design', '--json'], root);
    expect(res.status).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.ok).toBe(true);
    expect(res.json.command).toBe('apply');
    expect(res.json.data.plan.goalId).toBe('design');
    expect(res.json.data.plan.goal.title).toBe('Premium design');
    expect(Array.isArray(res.json.data.plan.goal.steps)).toBe(true);
    expect(res.json.warnings).toEqual([]);
    expect(res.json.errors).toEqual([]);
  });

  it('outputs valid JSON shape for helen doctor --json', () => {
    const res = runCli(['doctor', '--json'], root);
    expect([0, 2]).toContain(res.status); // 0 or 2 if warnings only
    expect(res.json).not.toBeNull();
    expect(res.json.command).toBe('doctor');
    expect(res.json.data.project.name).toBe('helen-cli');
    expect(Array.isArray(res.json.data.issues)).toBe(true);
  });

  it('outputs valid JSON shape for helen status --json when nothing tracked', () => {
    const res = runCli(['status', '--json'], tmp);
    expect(res.status).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.command).toBe('status');
    expect(res.json.data.tracking).toBe(false);
    expect(res.json.data.progress).toBeNull();
  });

  it('tracks a plan, runs next and done with proper JSON responses', () => {
    // 1. apply --track
    const applyRes = runCli(['apply', 'strategy', '--track', '--json'], tmp);
    expect(applyRes.status).toBe(0);
    expect(applyRes.json.ok).toBe(true);

    // 2. status --json
    const statusRes = runCli(['status', '--json'], tmp);
    expect(statusRes.status).toBe(0);
    expect(statusRes.json.data.tracking).toBe(true);
    expect(statusRes.json.data.progress.goal).toBe('strategy');

    // 3. next --json
    const nextRes = runCli(['next', '--json'], tmp);
    expect(nextRes.status).toBe(0);
    expect(nextRes.json.command).toBe('next');
    expect(nextRes.json.data.goal).toBe('strategy');
    expect(nextRes.json.data.currentIndex).toBe(0);
    expect(nextRes.json.data.step).not.toBeNull();

    // 4. done --json
    const doneRes = runCli(['done', 'Initial step completed', '--json'], tmp);
    expect(doneRes.status).toBe(0);
    expect(doneRes.json.command).toBe('done');
    expect(doneRes.json.data.progress.steps[0].status).toBe('done');
  });

  it('fails with exit code 3 when checkpoint requirement is not met', () => {
    // Create progress with a checkpoint step
    fs.mkdirSync(path.join(tmp, '.helen'), { recursive: true });
    const progress = {
      goal: 'test-checkpoint',
      title: 'Test Checkpoint',
      phase: '04-before-production',
      startedAt: new Date().toISOString(),
      steps: [
        { kind: 'checkpoint', ref: 'test-check', why: 'Ensure checks pass', status: 'pending' },
      ],
    };
    fs.writeFileSync(path.join(tmp, '.helen', 'progress.json'), JSON.stringify(progress, null, 2), 'utf-8');

    const res = runCli(['done', '--json'], tmp);
    expect(res.status).toBe(3); // Checkpoint failure exit code 3
    expect(res.json.ok).toBe(false);
    expect(res.json.errors[0]).toMatch(/checkpoint/i);
  });

  it('outputs valid JSON for prompts list --json', () => {
    const promptsList = runCli(['prompts', 'list', '--json'], root);
    expect(promptsList.status).toBe(0);
    expect(promptsList.json.command).toBe('prompts:list');
    expect(promptsList.json.data.prompts.length).toBeGreaterThan(50);
  });

  it('outputs valid JSON for skills list --json', () => {
    const skillsList = runCli(['skills', 'list', '--json'], root);
    expect(skillsList.status).toBe(0);
    expect(skillsList.json.command).toBe('skills:list');
    expect(skillsList.json.data.skills.some((s: any) => s.name === 'helen-release')).toBe(true);
  });

  it('outputs valid JSON for skills catalog --json', () => {
    const catalogRes = runCli(['skills', 'catalog', '--json'], root);
    expect(catalogRes.status).toBe(0);
    expect(catalogRes.json.command).toBe('skills:catalog');
    expect(catalogRes.json.data.items.length).toBeGreaterThan(10);
  });
});
