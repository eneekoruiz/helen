import { describe, it, expect, vi } from 'vitest';
import { scaffoldProject } from '../src/core/scaffold.js';
import { execSync } from 'node:child_process';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

describe('scaffoldProject input boundaries', () => {
  it.each(['../outside', '/absolute', '.', '..', '-option', 'app; echo injected', 'app&whoami', 'app name', '$(whoami)'])('rejects unsafe name %s before starting a command', async name => {
    expect(await scaffoldProject({ name, type: 'vite-react-ts', cwd: process.cwd() })).toBe(false);
    expect(execSync).not.toHaveBeenCalled();
  });
  it('calls npm create vite with --yes for vite-react-ts', async () => {
    vi.mocked(execSync).mockClear();
    const result = await scaffoldProject({ name: 'my-unique-app-1', type: 'vite-react-ts', cwd: process.cwd() });
    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('npm create vite@latest my-unique-app-1 --yes -- --template react-ts'),
      expect.objectContaining({ stdio: 'ignore' }),
    );
  });

  it('calls npx create-next-app with --yes for next-ts', async () => {
    vi.mocked(execSync).mockClear();
    const result = await scaffoldProject({ name: 'my-unique-app-2', type: 'next-ts', cwd: process.cwd() });
    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('npx --yes create-next-app@latest my-unique-app-2'),
      expect.objectContaining({ stdio: 'ignore' }),
    );
  });
});
