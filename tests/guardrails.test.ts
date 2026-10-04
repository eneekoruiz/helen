import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectProject } from '../src/core/projectDetector.js';
import { guardrailsModule } from '../src/modules/guardrails/index.js';

describe('guardrails module', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-guardrails-'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }, null, 2));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const run = () => guardrailsModule.execute({ cwd: tmp, project: detectProject(tmp), dryRun: false, force: false });

  it('creates executable hooks, dependabot config and the prepare script', async () => {
    const result = await run();
    expect(result.created).toEqual(['.githooks/pre-commit', '.githooks/pre-push', '.github/dependabot.yml']);
    if (process.platform !== 'win32') {
      expect(fs.statSync(path.join(tmp, '.githooks/pre-commit')).mode & 0o111).not.toBe(0);
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf-8'));
    expect(pkg.scripts.prepare).toContain('core.hooksPath .githooks');
  });

  it('pre-commit blocks secrets and .env files but allows normal commits', async () => {
    if (process.platform === 'win32') return; // Random hangs on windows due to hook execution
    await run();
    const git = (...args: string[]) => execFileSync('git', args, { cwd: tmp });
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('config', 'core.hooksPath', '.githooks');
    const commit = () => spawnSync('git', ['commit', '-qm', 'test'], { cwd: tmp, encoding: 'utf-8' });

    fs.writeFileSync(path.join(tmp, 'ok.ts'), 'export const a = 1;\n');
    git('add', 'ok.ts');
    expect(commit().status).toBe(0);

    fs.writeFileSync(path.join(tmp, 'leak.ts'), `export const key = 'sk-live-${'a'.repeat(24)}';\n`);
    git('add', 'leak.ts');
    const leak = commit();
    expect(leak.status).not.toBe(0);
    expect(leak.stdout + leak.stderr).not.toContain('a'.repeat(24));
    git('reset', '-q', 'leak.ts');

    fs.writeFileSync(path.join(tmp, '.env'), 'TOKEN=x\n');
    git('add', '-f', '.env');
    expect(commit().status).not.toBe(0);
  });

  it('inspects staged blobs for filenames with spaces even after working files are deleted', async () => {
    await run();
    const git = (...args: string[]) => execFileSync('git', args, { cwd: tmp });
    git('init', '-q');
    const name = 'file with spaces.ts';
    const secret = `sk-live-${'b'.repeat(24)}`;
    fs.writeFileSync(path.join(tmp, name), `export const token = '${secret}';\n`);
    git('add', name);
    fs.unlinkSync(path.join(tmp, name));
    const hook = fs.readFileSync(path.join(tmp, '.githooks/pre-commit'), 'utf-8');
    const source = hook.split("<<'HELEN_NODE'\n")[1].split('\nHELEN_NODE')[0];
    const result = spawnSync(process.execPath, ['--input-type=commonjs', '-e', source], { cwd: tmp, encoding: 'utf-8', timeout: 10000 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('file with spaces.ts');
    expect(result.stderr).not.toContain(secret);
  });
});
