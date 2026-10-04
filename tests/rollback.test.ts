import { describe, it, expect, vi } from 'vitest';
import { runRollback, getBackupFiles } from '../src/core/rollback.js';
import { updateConfig } from '../src/core/config.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import * as operations from '../src/core/operations.js';

describe('Rollback System', () => {
  it('preserves successfully restored originals when a partial rollback is retried', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-retry-'));
    try {
      updateConfig(tmpDir, { createdFiles: ['a.txt', 'b.txt'] });
      for (const name of ['a.txt', 'b.txt']) {
        fs.writeFileSync(path.join(tmpDir, name), 'modified');
        fs.writeFileSync(path.join(tmpDir, `${name}.helen-backup`), `original ${name}`);
      }
      const write = operations.writeAtomicFile;
      const spy = vi.spyOn(operations, 'writeAtomicFile').mockImplementation((destination, content) => {
        if (destination.endsWith('b.txt')) throw new Error('temporary failure');
        return write(destination, content);
      });
      try {
        const first = await runRollback(tmpDir);
        expect(first.restored).toContain('a.txt');
        expect(first.skipped).toContain('b.txt');
      } finally { spy.mockRestore(); }
      const retried = await runRollback(tmpDir);
      expect(retried.skipped).toEqual([]);
      expect(fs.readFileSync(path.join(tmpDir, 'a.txt'), 'utf8')).toBe('original a.txt');
      expect(fs.readFileSync(path.join(tmpDir, 'b.txt'), 'utf8')).toBe('original b.txt');
      expect(fs.existsSync(path.join(tmpDir, 'a.txt.helen-backup'))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, '.helenrc'))).toBe(false);
    } finally { fs.removeSync(tmpDir); }
  });

  it('preserves the original, backup and retry metadata after a restore failure', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    const file = path.join(tmpDir, 'keep.txt');
    try {
      updateConfig(tmpDir, { createdFiles: ['keep.txt'] });
      fs.writeFileSync(file, 'modified');
      fs.writeFileSync(`${file}.helen-backup`, 'original');
      const spy = vi.spyOn(operations, 'writeAtomicFile').mockImplementation(() => { throw new Error('copy failed'); });
      try {
        const result = await runRollback(tmpDir);
        expect(result.skipped).toContain('keep.txt');
        expect(result.removed).not.toContain('keep.txt');
        expect(fs.readFileSync(file, 'utf8')).toBe('modified');
        expect(fs.existsSync(`${file}.helen-backup`)).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, '.helenrc'))).toBe(true);
      } finally { spy.mockRestore(); }
    } finally { fs.removeSync(tmpDir); }
  });

  it('never removes a directory used as the configuration path', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    try {
      fs.ensureDirSync(path.join(tmpDir, '.helenrc'));
      fs.writeFileSync(path.join(tmpDir, '.helenrc', 'keep.txt'), 'keep');
      expect((await runRollback(tmpDir)).skipped).toContain('.helenrc');
      expect(fs.readFileSync(path.join(tmpDir, '.helenrc', 'keep.txt'), 'utf8')).toBe('keep');
    } finally { fs.removeSync(tmpDir); }
  });
  it('preserves paths outside the project and directories listed as created files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    const project = path.join(tmpDir, 'project');
    fs.ensureDirSync(path.join(project, 'important'));
    fs.writeFileSync(path.join(tmpDir, 'outside.txt'), 'keep');
    fs.writeFileSync(path.join(project, 'important', 'user.txt'), 'keep');
    updateConfig(project, { createdFiles: ['../outside.txt', 'important', '.'] });
    const result = await runRollback(project);
    expect(result.skipped).toEqual(['../outside.txt', 'important', '']);
    expect(fs.readFileSync(path.join(tmpDir, 'outside.txt'), 'utf8')).toBe('keep');
    expect(fs.existsSync(path.join(project, 'important', 'user.txt'))).toBe(true);
    expect(fs.existsSync(path.join(project, '.helenrc'))).toBe(true);
    fs.removeSync(tmpDir);
  });

  it('keeps a pre-existing config restored from its backup', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    updateConfig(tmpDir, { projectName: 'original' });
    const before = fs.readFileSync(path.join(tmpDir, '.helenrc'), 'utf8');
    updateConfig(tmpDir, { projectName: 'changed' });
    await runRollback(tmpDir);
    expect(fs.readFileSync(path.join(tmpDir, '.helenrc'), 'utf8')).toBe(before);
    fs.removeSync(tmpDir);
  });

  it('does not move corrupt configuration during a dry run', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    fs.writeFileSync(path.join(tmpDir, '.helenrc'), '{broken');
    await runRollback(tmpDir, { dryRun: true });
    expect(fs.readFileSync(path.join(tmpDir, '.helenrc'), 'utf8')).toBe('{broken');
    expect(fs.existsSync(path.join(tmpDir, '.helenrc.corrupt'))).toBe(false);
    fs.removeSync(tmpDir);
  });
  it('should find all .helen-backup files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));
    
    // Create folders
    fs.ensureDirSync(path.join(tmpDir, 'node_modules'));
    fs.ensureDirSync(path.join(tmpDir, 'src'));
    fs.ensureDirSync(path.join(tmpDir, 'dist'));

    // Create files
    fs.writeFileSync(path.join(tmpDir, 'src/test.txt.helen-backup'), 'backup');
    fs.writeFileSync(path.join(tmpDir, 'node_modules/bad.txt.helen-backup'), 'ignore');
    fs.writeFileSync(path.join(tmpDir, 'dist/bad.txt.helen-backup'), 'ignore');

    const backups = getBackupFiles(tmpDir);
    expect(backups.length).toBe(1);
    expect(backups[0]).toContain('src/test.txt.helen-backup');

    fs.removeSync(tmpDir);
  });

  it('should restore modified files and remove backups', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));

    const originalFile = path.join(tmpDir, 'config.json');
    const backupFile = `${originalFile}.helen-backup`;

    fs.writeFileSync(originalFile, 'modified content');
    fs.writeFileSync(backupFile, 'pristine content');

    const result = await runRollback(tmpDir);

    expect(result.restored.length).toBe(1);
    expect(result.restored[0]).toBe('config.json');
    expect(fs.readFileSync(originalFile, 'utf-8')).toBe('pristine content');
    expect(fs.existsSync(backupFile)).toBe(false);

    fs.removeSync(tmpDir);
  });

  it('should remove created files listed in .helenrc and remove .helenrc', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));

    // Setup .helenrc
    updateConfig(tmpDir, {
      projectName: 'test',
      createdFiles: ['src/newfile.ts', 'docs/readme.md']
    });

    const file1 = path.join(tmpDir, 'src/newfile.ts');
    const file2 = path.join(tmpDir, 'docs/readme.md');

    fs.ensureDirSync(path.dirname(file1));
    fs.ensureDirSync(path.dirname(file2));

    fs.writeFileSync(file1, 'hello');
    fs.writeFileSync(file2, 'world');

    expect(fs.existsSync(file1)).toBe(true);
    expect(fs.existsSync(file2)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.helenrc'))).toBe(true);

    const result = await runRollback(tmpDir);

    expect(result.removed).toContain('src/newfile.ts');
    expect(result.removed).toContain('docs/readme.md');
    expect(result.removed).toContain('.helenrc');

    expect(fs.existsSync(file1)).toBe(false);
    expect(fs.existsSync(file2)).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.helenrc'))).toBe(false);

    fs.removeSync(tmpDir);
  });

  it('should do nothing in dry-run mode', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-rollback-'));

    updateConfig(tmpDir, {
      projectName: 'test',
      createdFiles: ['src/newfile.ts']
    });

    const file1 = path.join(tmpDir, 'src/newfile.ts');
    fs.ensureDirSync(path.dirname(file1));
    fs.writeFileSync(file1, 'hello');

    const originalFile = path.join(tmpDir, 'config.json');
    const backupFile = `${originalFile}.helen-backup`;
    fs.writeFileSync(originalFile, 'modified');
    fs.writeFileSync(backupFile, 'pristine');

    const result = await runRollback(tmpDir, { dryRun: true });

    expect(result.restored).toContain('config.json');
    expect(result.removed).toContain('src/newfile.ts');
    expect(result.removed).toContain('.helenrc');

    // Files should NOT be touched
    expect(fs.existsSync(file1)).toBe(true);
    expect(fs.readFileSync(originalFile, 'utf-8')).toBe('modified');
    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.helenrc'))).toBe(true);

    fs.removeSync(tmpDir);
  });
});
