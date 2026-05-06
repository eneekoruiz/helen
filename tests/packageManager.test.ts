import { describe, it, expect } from 'vitest';
import { detectPackageManager } from '../src/core/packageManager.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('Package Manager Detector', () => {
  it('should detect npm from package-lock.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-pm-'));
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');

    expect(detectPackageManager(tmpDir)).toBe('npm');
    fs.removeSync(tmpDir);
  });

  it('should detect pnpm from pnpm-lock.yaml', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-pm-'));
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    expect(detectPackageManager(tmpDir)).toBe('pnpm');
    fs.removeSync(tmpDir);
  });

  it('should detect yarn from yarn.lock', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-pm-'));
    fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');

    expect(detectPackageManager(tmpDir)).toBe('yarn');
    fs.removeSync(tmpDir);
  });

  it('should detect bun from bun.lockb', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-pm-'));
    fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');

    expect(detectPackageManager(tmpDir)).toBe('bun');
    fs.removeSync(tmpDir);
  });

  it('should return unknown when no lock file present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-pm-'));

    expect(detectPackageManager(tmpDir)).toBe('unknown');
    fs.removeSync(tmpDir);
  });
});
