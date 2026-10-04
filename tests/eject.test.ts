import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ejectModule } from '../src/core/moduleRunner.js';
import { updateConfig, readConfig } from '../src/core/config.js';
import { detectProject } from '../src/core/projectDetector.js';
import type { HelenContext } from '../src/core/context.js';
import * as operations from '../src/core/operations.js';

vi.mock('../src/modules/registry.js', () => ({
  getModule: (id: string) => id === 'first' || id === 'second' ? {
    meta: { name: id, filesCreated: ['shared.txt', ...(id === 'first' ? ['own.txt'] : [])], filesModified: ['package.json'] },
  } : undefined,
}));

describe('module ejection ownership and filesystem safety', () => {
  let cwd: string;
  let ctx: HelenContext;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-eject-'));
    ctx = { cwd, project: detectProject(cwd), dryRun: false, force: false, verbose: false };
  });
  afterEach(() => fs.removeSync(cwd));

  it('keeps shared generated files until the last consuming module is ejected', async () => {
    updateConfig(cwd, {
      installedModules: ['first', 'second'], createdFiles: ['shared.txt', 'own.txt'],
      moduleFiles: {
        first: { created: ['shared.txt', 'own.txt'], modified: [] },
        second: { created: [], modified: [] },
      },
    });
    fs.writeFileSync(path.join(cwd, 'shared.txt'), 'generated shared');
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'generated own');
    expect(await ejectModule('first', ctx)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'shared.txt'), 'utf8')).toBe('generated shared');
    expect(readConfig(cwd)?.createdFiles).toEqual(['shared.txt']);
    expect(await ejectModule('second', ctx)).toBe(true);
    expect(fs.existsSync(path.join(cwd, 'shared.txt'))).toBe(false);
    expect(fs.existsSync(path.join(cwd, '.helenrc'))).toBe(false);
  });

  it('keeps backups until configuration commit so a failed ejection can be retried', async () => {
    updateConfig(cwd, { installedModules: ['first', 'second'], createdFiles: ['own.txt'] });
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'generated');
    fs.writeFileSync(path.join(cwd, 'own.txt.helen-backup'), 'original');
    const write = operations.writeAtomicFile;
    const spy = vi.spyOn(operations, 'writeAtomicFile').mockImplementation((file, content) => {
      if (file === path.join(cwd, '.helenrc')) throw new Error('config locked');
      write(file, content);
    });
    try {
      await expect(ejectModule('first', ctx)).rejects.toThrow('config locked');
      expect(fs.existsSync(path.join(cwd, 'own.txt.helen-backup'))).toBe(true);
    } finally { spy.mockRestore(); }
    expect(await ejectModule('first', ctx)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('original');
    expect(fs.existsSync(path.join(cwd, 'own.txt.helen-backup'))).toBe(false);
    expect(readConfig(cwd)?.installedModules).toEqual(['second']);
  });

  it('does not restore stale backups for files the installed module never changed', async () => {
    updateConfig(cwd, { installedModules: ['first'], moduleFiles: { first: { created: [], modified: [] } } });
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'user current');
    fs.writeFileSync(path.join(cwd, 'own.txt.helen-backup'), 'unrelated old');
    fs.writeFileSync(path.join(cwd, 'package.json'), '{"current":true}');
    fs.writeFileSync(path.join(cwd, 'package.json.helen-backup'), '{}');
    expect(await ejectModule('first', ctx)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('user current');
    expect(fs.readJsonSync(path.join(cwd, 'package.json'))).toEqual({ current: true });
    expect(fs.existsSync(path.join(cwd, 'own.txt.helen-backup'))).toBe(true);
  });

  it('does not delete files when the module is not installed', async () => {
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'user file');
    expect(await ejectModule('first', ctx)).toBe(false);
    expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('user file');
  });

  it('preserves shared files and package backups while another module uses them', async () => {
    updateConfig(cwd, { installedModules: ['first', 'second'], createdFiles: ['shared.txt', 'own.txt'] });
    fs.writeFileSync(path.join(cwd, 'shared.txt'), 'shared');
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'owned');
    fs.writeFileSync(path.join(cwd, 'package.json'), '{"changed":true}');
    fs.writeFileSync(path.join(cwd, 'package.json.helen-backup'), '{}');
    expect(await ejectModule('first', ctx)).toBe(true);
    expect(fs.existsSync(path.join(cwd, 'own.txt'))).toBe(false);
    expect(fs.readFileSync(path.join(cwd, 'shared.txt'), 'utf8')).toBe('shared');
    expect(fs.existsSync(path.join(cwd, 'package.json.helen-backup'))).toBe(true);
    expect(readConfig(cwd)?.createdFiles).toEqual(['shared.txt']);
    expect(readConfig(cwd)?.installedModules).toEqual(['second']);
  });

  it('restores user files that were force-overwritten instead of deleting them', async () => {
    updateConfig(cwd, { installedModules: ['first'], createdFiles: [] });
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'generated');
    fs.writeFileSync(path.join(cwd, 'own.txt.helen-backup'), 'original');
    expect(await ejectModule('first', ctx)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('original');
    expect(fs.existsSync(path.join(cwd, 'own.txt.helen-backup'))).toBe(false);
  });

  it('rejects symlink targets before removing other module files', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-eject-outside-'));
    try {
      updateConfig(cwd, { installedModules: ['first'], createdFiles: ['own.txt', 'shared.txt'] });
      fs.writeFileSync(path.join(cwd, 'own.txt'), 'keep');
      fs.symlinkSync(outside, path.join(cwd, 'shared.txt'), 'junction');
      expect(await ejectModule('first', ctx)).toBe(false);
      expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('keep');
      expect(readConfig(cwd)?.installedModules).toEqual(['first']);
    } finally {
      fs.removeSync(path.join(cwd, 'shared.txt'));
      fs.removeSync(outside);
    }
  });

  it('dry-run preserves files, backups and configuration', async () => {
    updateConfig(cwd, { installedModules: ['first'], createdFiles: ['own.txt'] });
    fs.writeFileSync(path.join(cwd, 'own.txt'), 'keep');
    const configBefore = fs.readFileSync(path.join(cwd, '.helenrc'), 'utf8');
    expect(await ejectModule('first', { ...ctx, dryRun: true })).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'own.txt'), 'utf8')).toBe('keep');
    expect(fs.readFileSync(path.join(cwd, '.helenrc'), 'utf8')).toBe(configBefore);
  });
});
