import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOOK_FILES, activateHooks, ensureHooks, hooksStatus, isGitRoot } from '../src/core/gitHooks.js';
import { repairDoctorIssues } from '../src/core/doctorFix.js';
import { runDoctor } from '../src/core/doctor.js';
import { PACKAGE_ROOT } from '../src/core/version.js';

const posix = process.platform !== 'win32';
const hasGit = spawnSync('git', ['--version'], { stdio: 'ignore' }).status === 0;

describe('git hooks', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-hooks-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('installs missing hooks as executable and never replaces existing content', () => {
    fs.mkdirSync(path.join(tmp, '.githooks'));
    fs.writeFileSync(path.join(tmp, '.githooks', 'pre-commit'), '#!/bin/sh\necho mine\n', { mode: 0o755 });
    const result = ensureHooks(tmp);
    expect(result.created).toEqual(['pre-push']);
    expect(fs.readFileSync(path.join(tmp, '.githooks', 'pre-commit'), 'utf8')).toContain('echo mine');
    expect(fs.readFileSync(path.join(tmp, '.githooks', 'pre-push'), 'utf8')).toBe(HOOK_FILES['pre-push']);
  });

  it('dry-run reports without writing', () => {
    expect(ensureHooks(tmp, { dryRun: true }).created).toEqual(['pre-commit', 'pre-push']);
    expect(fs.existsSync(path.join(tmp, '.githooks'))).toBe(false);
  });

  it.runIf(posix)('finds and fixes hooks git would silently ignore', () => {
    fs.mkdirSync(path.join(tmp, '.githooks'));
    fs.writeFileSync(path.join(tmp, '.githooks', 'commit-msg'), '#!/bin/sh\nexit 0\n', { mode: 0o644 });
    expect(hooksStatus(tmp).notExecutable).toEqual(['commit-msg']);
    expect(runDoctor(tmp).find(check => check.label === 'Git hooks')).toMatchObject({ status: 'warn' });
    expect(ensureHooks(tmp).madeExecutable).toEqual(['commit-msg']);
    expect(hooksStatus(tmp).notExecutable).toEqual([]);
  });

  it.runIf(hasGit)('activates hooks only at a repository root', () => {
    spawnSync('git', ['-C', tmp, 'init', '-q']);
    fs.mkdirSync(path.join(tmp, 'sub'));
    expect(isGitRoot(tmp)).toBe(true);
    expect(isGitRoot(path.join(tmp, 'sub'))).toBe(false);
    expect(activateHooks(path.join(tmp, 'sub')).active).toBe(false);
    expect(activateHooks(tmp, { dryRun: true })).toMatchObject({ active: false, changed: true });
    expect(activateHooks(tmp)).toMatchObject({ active: true, changed: true });
    expect(activateHooks(tmp)).toMatchObject({ active: true, changed: false });
  });

  it.runIf(hasGit && posix)('doctor --fix repairs hooks end to end', () => {
    spawnSync('git', ['-C', tmp, 'init', '-q']);
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x' }));
    fs.mkdirSync(path.join(tmp, '.githooks'));
    fs.writeFileSync(path.join(tmp, '.githooks', 'commit-msg'), '#!/bin/sh\nexit 0\n', { mode: 0o644 });
    const report = repairDoctorIssues(tmp);
    expect(report.errors).toEqual([]);
    expect(report.fixed.join('\n')).toContain('Installed .githooks/pre-commit');
    expect(report.fixed.join('\n')).toContain('commit-msg executable');
    expect(report.fixed.join('\n')).toContain('core.hooksPath');
    const status = hooksStatus(tmp);
    expect(status.notExecutable).toEqual([]);
    expect(status.hooksPathActive).toBe(true);
    expect(runDoctor(tmp).find(check => check.label === 'Git hooks')).toMatchObject({ status: 'ok' });
  });

  it('keeps this repository hooks identical to the ones HELEN installs in other projects', () => {
    for (const [name, content] of Object.entries(HOOK_FILES)) {
      expect(fs.readFileSync(path.join(PACKAGE_ROOT, '.githooks', name), 'utf8')).toBe(content);
    }
  });

  it.runIf(posix)('every hook committed to this repository is executable', () => {
    const dir = path.join(PACKAGE_ROOT, '.githooks');
    if (!fs.existsSync(dir)) return;
    expect(hooksStatus(PACKAGE_ROOT).notExecutable).toEqual([]);
  });
});
