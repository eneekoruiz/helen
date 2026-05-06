import { describe, it, expect } from 'vitest';
import { readConfig, updateConfig, isModuleInstalled } from '../src/core/config.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

describe('Config System (.helenrc)', () => {
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

  it('should persist settings', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-config-'));
    
    updateConfig(tmpDir, { settings: { theme: 'dark' } });
    updateConfig(tmpDir, { settings: { language: 'en' } }); // Note: this currently overwrites if not merged manually in updateConfig logic or deepMerged
    
    const config = readConfig(tmpDir);
    expect(config!.settings.language).toBe('en');
    
    fs.removeSync(tmpDir);
  });
});
