import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { getConfigValue, readConfig, setConfigValue, updateConfig } from '../src/core/config.js';
import { validateModuleResult } from '../src/core/context.js';

describe('typed runtime contracts', () => {
  it('rejects invalid updates before creating a configuration file', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-contract-'));
    try {
      expect(() => updateConfig(cwd, { settings: { securityLevel: ['simple'] } })).toThrow();
      expect(fs.existsSync(path.join(cwd, '.helenrc'))).toBe(false);
    } finally { fs.removeSync(cwd); }
  });
  it('loads legacy configs with missing optional collections and defaults', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-contract-'));
    try {
      fs.writeJsonSync(path.join(cwd, '.helenrc'), { projectName: 'legacy', installedModules: [] });
      expect(readConfig(cwd)).toMatchObject({ projectName: 'legacy', settings: {}, createdFiles: [], moduleFiles: {} });
    } finally { fs.removeSync(cwd); }
  });

  it('rejects unsafe setting names and invalid typed root values', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-contract-'));
    try {
      expect(getConfigValue(cwd, 'constructor')).toBeUndefined();
      expect(() => setConfigValue(cwd, '__proto__', { polluted: true })).toThrow('Unsafe');
      expect(() => setConfigValue(cwd, 'packageManager', 'corepack')).toThrow('packageManager');
      expect(() => setConfigValue(cwd, 'projectName', 42)).toThrow('string');
      expect(() => setConfigValue(cwd, 'securityLevel', 'unsafe')).toThrow('securityLevel');
    } finally { fs.removeSync(cwd); }
  });

  it('validates module result output and optional diagnostics', () => {
    const result = {
      moduleId: 'security', moduleName: 'Security', created: [], modified: [], skipped: [], warnings: [], nextSteps: [],
      diagnostics: [{ code: 'WRITE_FAILED', stage: 'write', message: 'Could not write', path: 'a.ts' }],
      operationId: 'op-1',
    };
    expect(validateModuleResult(result)).toEqual(result);
    expect(() => validateModuleResult({ ...result, created: 'a.ts' })).toThrow();
  });
});
