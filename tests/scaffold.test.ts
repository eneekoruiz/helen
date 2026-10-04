import { describe, it, expect, vi } from 'vitest';
import { scaffoldProject } from '../src/core/scaffold.js';
import { execSync } from 'node:child_process';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

describe('scaffoldProject input boundaries', () => {
  it.each(['../outside', '/absolute', '.', '..', '-option', 'app; echo injected', 'app&whoami', 'app name', '$(whoami)'])('rejects unsafe name %s before starting a command', async name => {
    expect(await scaffoldProject({ name, type: 'vite-react-ts', cwd: process.cwd() })).toBe(false);
    expect(execSync).not.toHaveBeenCalled();
  });
});
