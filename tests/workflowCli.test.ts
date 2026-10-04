import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli.js');
function run(cwd: string, args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args, '--json'], {
    cwd, encoding: 'utf8', timeout: 45000,
    env: { ...process.env, HELEN_WELCOME: 'signature' },
  });
  expect(result.error).toBeUndefined();
  return { status: result.status, body: JSON.parse(result.stdout) };
}

describe('Workflow CLI acceptance', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-workflow-cli-'));
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
  });
  afterEach(() => { fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('resumes durable decisions and exposes stale evidence after source changes', () => {
    const apply = run(cwd, ['apply', 'quality', '--track', '--brief', '--profile', 'quick']);
    expect(apply.status).toBe(0);
    expect(apply.body.data.brief).toContain('Explicit profile: quick');
    expect(run(cwd, ['check']).status).toBe(0);
    const resume = run(cwd, ['resume', '--decision', 'Preserve the public API']);
    expect(resume.body.data.verification).toBe('current');
    expect(resume.body.data.instructions).toContain('Preserve the public API');
    fs.writeFileSync(path.join(cwd, 'source.ts'), 'export const changed = true;');
    expect(run(cwd, ['status']).body.data.verification).toBe('stale');
  }, 120000);

  it('reports invalid profiles and missing sessions as failures', () => {
    expect(run(cwd, ['apply', 'quality', '--profile', 'auto']).status).toBe(1);
    const resume = run(cwd, ['resume']);
    expect(resume.status).toBe(1);
    expect(resume.body.errors.join(' ')).toContain('Nothing is being tracked');
  });

  it('omits already-loaded rules only on explicit request and labels budget estimates', () => {
    const full = run(cwd, ['prompts', 'show', 'audit-code-quality']);
    const compact = run(cwd, ['prompts', 'show', 'audit-code-quality', '--no-protocol']);
    expect(full.body.data.content).toContain('HELEN execution contract');
    expect(compact.body.data.content).not.toContain('HELEN execution contract');
    expect(compact.body.data.content).toContain('## Goal');
    const budget = run(cwd, ['token-budget', 'quality']);
    expect(budget.body.data.measurement.kind).toBe('estimate');
    expect(budget.body.data.measurement.includes).toBe('input-only');
  });

  it('keeps welcome configuration outside JSON commands and rejects invalid identity', () => {
    expect(run(cwd, ['status', '--welcome', 'signature']).status).toBe(0);
    const invalid = run(cwd, ['status', '--welcome', 'unknown']);
    expect(invalid.status).toBe(1);
    expect(invalid.body.errors.join(' ')).toContain('Choose helen, signature, or off');
  });
});
