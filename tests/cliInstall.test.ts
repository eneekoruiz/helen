import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgram } from '../src/index.js';
import { setJsonMode } from '../src/core/jsonOutput.js';

vi.mock('node:child_process', async importOriginal => ({
  ...await importOriginal<typeof import('node:child_process')>(),
  execSync: vi.fn(),
}));
vi.mock('../src/core/moduleRunner.js', () => ({
  runModules: vi.fn(async () => [{ moduleId: 'quality', name: 'Quality', created: [], modified: ['package.json'], skipped: [] }]),
  printSummary: vi.fn(),
  ejectModule: vi.fn(),
}));

describe('explicit dependency installation', () => {
  let tmp: string;
  let previousCwd: string;
  beforeEach(() => {
    previousCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-cli-install-'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'fixture' }));
    process.chdir(tmp);
    vi.mocked(execSync).mockReset();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    process.chdir(previousCwd);
    setJsonMode(false);
    process.exitCode = 0;
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('installs changed dependencies with --install, including in JSON mode', async () => {
    await createProgram().parseAsync(['add', 'quality', '--install', '--json'], { from: 'user' });
    expect(execSync).toHaveBeenCalledWith('npm install', { cwd: tmp, stdio: 'ignore' });
    await createProgram().parseAsync(['update', '--install', '--json'], { from: 'user' });
    await createProgram().parseAsync(['init', '--install', '--json'], { from: 'user' });
    expect(execSync).toHaveBeenCalledTimes(3);
  });

  it('does not install during a dry run or without the explicit flag', async () => {
    await createProgram().parseAsync(['add', 'quality', '--install', '--dry-run', '--json'], { from: 'user' });
    await createProgram().parseAsync(['add', 'quality', '--json'], { from: 'user' });
    expect(execSync).not.toHaveBeenCalled();
  });

  it('propagates installer failures instead of claiming success', async () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('Dependency install failed'); });
    await expect(createProgram().parseAsync(['add', 'quality', '--install', '--json'], { from: 'user' })).rejects.toThrow('Dependency install failed');
  });
});
