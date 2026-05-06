import { describe, it, expect } from 'vitest';
import { writeFileSafe, fileExists, patchPackageJson, readJson, detectConflict } from '../src/core/fs.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('File System Helpers', () => {
  describe('writeFileSafe', () => {
    it('should create a new file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');

      const result = writeFileSafe(filePath, 'hello');
      expect(result).toBe('created');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello');

      fs.removeSync(tmpDir);
    });

    it('should not overwrite existing file without force', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'original');

      const result = writeFileSafe(filePath, 'new content');
      expect(result).toBe('skipped');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');

      fs.removeSync(tmpDir);
    });

    it('should overwrite with force option', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'original');

      const result = writeFileSafe(filePath, 'new content', { force: true });
      expect(result).toBe('overwritten');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');

      fs.removeSync(tmpDir);
    });

    it('should not write in dry-run mode', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');

      const result = writeFileSafe(filePath, 'hello', { dryRun: true });
      expect(result).toBe('created');
      expect(fs.existsSync(filePath)).toBe(false);

      fs.removeSync(tmpDir);
    });

    it('should interpolate variables with Handlebars', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');
      const content = 'Hello {{name}}!';

      writeFileSafe(filePath, content, { vars: { name: 'World' } });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Hello World!');

      fs.removeSync(tmpDir);
    });
  });

  describe('patchPackageJson', () => {
    it('should merge scripts into package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
        name: 'test',
        scripts: { build: 'tsc' },
      });

      patchPackageJson(tmpDir, {
        scripts: { lint: 'eslint .' },
      });

      const pkg = readJson<Record<string, unknown>>(path.join(tmpDir, 'package.json'));
      const scripts = pkg?.scripts as Record<string, string>;
      expect(scripts.build).toBe('tsc');
      expect(scripts.lint).toBe('eslint .');

      fs.removeSync(tmpDir);
    });

    it('should not write in dry-run mode', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const pkgPath = path.join(tmpDir, 'package.json');
      fs.writeJsonSync(pkgPath, { name: 'test' });
      const before = fs.readFileSync(pkgPath, 'utf-8');

      patchPackageJson(tmpDir, { scripts: { lint: 'eslint .' } }, { dryRun: true });

      const after = fs.readFileSync(pkgPath, 'utf-8');
      expect(after).toBe(before);

      fs.removeSync(tmpDir);
    });
  });

  describe('detectConflict', () => {
    it('should return false for non-existent file', () => {
      expect(detectConflict('/nonexistent/path', 'content')).toBe(false);
    });

    it('should return true when content differs', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'original');

      expect(detectConflict(filePath, 'different')).toBe(true);

      fs.removeSync(tmpDir);
    });

    it('should return false when content matches', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-fs-'));
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'same');

      expect(detectConflict(filePath, 'same')).toBe(false);

      fs.removeSync(tmpDir);
    });
  });
});
