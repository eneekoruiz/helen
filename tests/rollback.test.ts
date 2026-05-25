import { describe, it, expect } from 'vitest';
import { runRollback, getBackupFiles } from '../src/core/rollback.js';
import { updateConfig } from '../src/core/config.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('Rollback System', () => {
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
