import { describe, it, expect } from 'vitest';
import { readConfig, updateConfig, isModuleInstalled } from '../src/core/config.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('Config System (.helenrc)', () => {
  it('retains module file ownership across unchanged reinstallations and additions', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    try {
      updateConfig(tmpDir, { installedModules: ['theme'], moduleFiles: { theme: { created: ['theme.ts'], modified: ['package.json'] } } });
      updateConfig(tmpDir, { moduleFiles: { theme: { created: [], modified: [] }, cms: { created: ['cms.ts'], modified: [] } } });
      expect(readConfig(tmpDir)?.moduleFiles).toEqual({
        theme: { created: ['theme.ts'], modified: ['package.json'] },
        cms: { created: ['cms.ts'], modified: [] },
      });
    } finally { fs.removeSync(tmpDir); }
  });
  it('keeps directories in place when the configuration path is not a file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    try {
      fs.ensureDirSync(path.join(tmpDir, '.helenrc'));
      fs.writeFileSync(path.join(tmpDir, '.helenrc', 'keep.txt'), 'keep');
      expect(readConfig(tmpDir)).toBeNull();
      expect(() => updateConfig(tmpDir, {})).toThrow('recovered');
      expect(fs.readFileSync(path.join(tmpDir, '.helenrc', 'keep.txt'), 'utf8')).toBe('keep');
    } finally { fs.removeSync(tmpDir); }
  });
  it('preserves earlier corrupt config backups during repeated recovery', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    fs.writeFileSync(path.join(tmpDir, '.helenrc.corrupt'), 'first');
    fs.writeFileSync(path.join(tmpDir, '.helenrc'), '{second');
    readConfig(tmpDir);
    expect(fs.readFileSync(path.join(tmpDir, '.helenrc.corrupt'), 'utf8')).toBe('first');
    expect(fs.readFileSync(path.join(tmpDir, '.helenrc.corrupt.1'), 'utf8')).toBe('{second');
    fs.removeSync(tmpDir);
  });
  it.each(['{broken', 'null', '{"installedModules":"docker"}', '{"installedModules":[],"createdFiles":[1]}', '{"installedModules":[],"moduleFiles":{"quality":{"created":[1],"modified":[]}}}'])('recovers invalid configuration without crashing: %s', raw => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    fs.writeFileSync(path.join(tmpDir, '.helenrc'), raw);
    expect(readConfig(tmpDir)).toBeNull();
    expect(fs.readFileSync(path.join(tmpDir, '.helenrc.corrupt'), 'utf8')).toBe(raw);
    updateConfig(tmpDir, { projectName: 'recovered' });
    expect(isModuleInstalled(tmpDir, 'docker')).toBe(false);
    fs.removeSync(tmpDir);
  });
  it('should initialize config if not exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    
    updateConfig(tmpDir, { projectName: 'test-app' });
    
    const config = readConfig(tmpDir);
    expect(config).toBeDefined();
    expect(config!.projectName).toBe('test-app');
    expect(config!.installedModules).toEqual([]);
    
    fs.removeSync(tmpDir);
  });

  it('should update installed modules and avoid duplicates', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    
    updateConfig(tmpDir, { installedModules: ['docker'] });
    updateConfig(tmpDir, { installedModules: ['docker', 'ci'] });
    
    const config = readConfig(tmpDir);
    expect(config!.installedModules).toEqual(['docker', 'ci']);
    
    expect(isModuleInstalled(tmpDir, 'docker')).toBe(true);
    expect(isModuleInstalled(tmpDir, 'seo')).toBe(false);
    
    fs.removeSync(tmpDir);
  });

  it('should deep merge settings and accumulate createdFiles', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    
    updateConfig(tmpDir, { settings: { theme: 'dark' }, createdFiles: ['file1.ts'] });
    updateConfig(tmpDir, { settings: { language: 'en' }, createdFiles: ['file1.ts', 'file2.ts'] });
    
    const config = readConfig(tmpDir);
    expect(config!.settings.theme).toBe('dark');
    expect(config!.settings.language).toBe('en');
    expect(config!.createdFiles).toEqual(['file1.ts', 'file2.ts']);
    
    fs.removeSync(tmpDir);
  });
});
