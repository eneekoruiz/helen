import { describe, it, expect } from 'vitest';
import { detectProject } from '../src/core/projectDetector.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('Project Detector', () => {
  it('should detect a basic project with package.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-test-'));
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), { name: 'test-app' });

    const info = detectProject(tmpDir);
    expect(info.hasPackageJson).toBe(true);
    expect(info.name).toBe('test-app');

    fs.removeSync(tmpDir);
  });

  it('should detect Git repository', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-test-'));
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), { name: 'test' });
    fs.mkdirSync(path.join(tmpDir, '.git'));

    const info = detectProject(tmpDir);
    expect(info.hasGit).toBe(true);

    fs.removeSync(tmpDir);
  });

  it('should detect Vite framework', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-test-'));
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test',
      devDependencies: { vite: '^5.0.0' },
    });
    fs.writeFileSync(path.join(tmpDir, 'vite.config.ts'), 'export default {}');

    const info = detectProject(tmpDir);
    expect(info.hasVite).toBe(true);
    expect(info.framework).toBe('vite');

    fs.removeSync(tmpDir);
  });

  it('should detect TypeScript', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-test-'));
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test',
      devDependencies: { typescript: '^5.0.0' },
    });
    fs.writeJsonSync(path.join(tmpDir, 'tsconfig.json'), {});

    const info = detectProject(tmpDir);
    expect(info.hasTypeScript).toBe(true);

    fs.removeSync(tmpDir);
  });

  it('should return unknown for empty directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-test-'));

    const info = detectProject(tmpDir);
    expect(info.hasPackageJson).toBe(false);
    expect(info.framework).toBe('unknown');

    fs.removeSync(tmpDir);
  });
});
