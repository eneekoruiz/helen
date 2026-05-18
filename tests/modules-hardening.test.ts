import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStableModules, getModule } from '../src/modules/registry.js';
import { detectProject } from '../src/core/projectDetector.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import type { HelenContext } from '../src/core/context.js';

describe('Module Hardening - Idempotency & Dry-Run', () => {
  let tmpDir: string;
  let ctx: HelenContext;

  beforeEach(() => {
    // Create a clean temp project directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-hardening-'));
    
    // Create minimal vite project structure
    fs.ensureDirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' }
    }, null, 2));

    // Create HelenContext for testing
    const projectInfo = detectProject(tmpDir);
    ctx = {
      cwd: tmpDir,
      project: projectInfo,
      dryRun: false,
      force: false,
    };
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.removeSync(tmpDir);
    }
  });

  describe('Dry-run mode', () => {
    it('should preview changes without writing files', async () => {
      const dryRunCtx = { ...ctx, dryRun: true };
      const mod = getModule('quality');
      
      if (!mod) {
        throw new Error('quality module not found');
      }

      const result = await mod.execute(dryRunCtx);
      
      // Verify no files were actually created
      const eslintPath = path.join(tmpDir, '.eslintrc.json');
      const prettierPath = path.join(tmpDir, '.prettierrc');
      
      expect(fs.existsSync(eslintPath)).toBe(false);
      expect(fs.existsSync(prettierPath)).toBe(false);
      expect(result.created.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency', () => {
    it('should handle re-running quality module without errors', async () => {
      const mod = getModule('quality');
      
      if (!mod) {
        throw new Error('quality module not found');
      }

      // First run
      const result1 = await mod.execute(ctx);
      expect(result1.created.length).toBeGreaterThan(0);

      // Second run (should detect conflicts and skip without error)
      const result2 = await mod.execute(ctx);
      expect(result2).toBeDefined();
      
      // Verify package.json is valid after second run
      const pkgJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkgJson.scripts).toBeDefined();
    });

    it('should handle re-running docker module without conflicts', async () => {
      const mod = getModule('docker');
      
      if (!mod) {
        throw new Error('docker module not found');
      }

      // First run
      const result1 = await mod.execute(ctx);
      expect(result1.created.length).toBeGreaterThan(0);

      // Second run
      const result2 = await mod.execute(ctx);
      expect(result2).toBeDefined();
      
      // Verify files exist and are valid
      const dockerfilePath = path.join(tmpDir, 'Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(dockerfile).toContain('FROM');
    });
  });

  describe('Package.json merging', () => {
    it('should merge scripts without overwriting existing entries', async () => {
      // Add pre-existing script
      const pkgPath = path.join(tmpDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.scripts = { 'dev:vite': 'vite' };
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      const mod = getModule('quality');
      
      if (!mod) {
        throw new Error('quality module not found');
      }

      await mod.execute(ctx);

      // Verify both old and new scripts exist
      const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(updatedPkg.scripts['dev:vite']).toBe('vite');
      expect(updatedPkg.scripts['lint']).toBeDefined();
    });
  });

  describe('All stable modules dry-run', () => {
    it('should support dry-run for all stable modules', async () => {
      const stableModules = getStableModules();
      const dryRunCtx = { ...ctx, dryRun: true };

      for (const mod of stableModules) {
        try {
          const result = await mod.execute(dryRunCtx);
          expect(result).toBeDefined();
          expect(result.created.length).toBeGreaterThanOrEqual(0);
        } catch (err) {
          throw new Error(`Module ${mod.meta.id} failed dry-run: ${err}`);
        }
      }
    });
  });

  describe('Security levels (Simple vs Strict)', () => {
    it('should scaffold simple security files by default', async () => {
      const mod = getModule('security');
      if (!mod) throw new Error('security module not found');

      const simpleCtx = { ...ctx, settings: { securityLevel: 'simple' } };
      const result = await mod.execute(simpleCtx);
      
      expect(result.created).toContain('src/lib/env.ts');
      expect(result.created).toContain('src/lib/sanitize.ts');
      expect(result.created).not.toContain('src/lib/security.ts');

      const envContent = fs.readFileSync(path.join(tmpDir, 'src/lib/env.ts'), 'utf-8');
      expect(envContent).toContain('VITE_APP_URL');
      expect(envContent).not.toContain('NODE_ENV');
    });

    it('should scaffold strict security files, including cryptography and strict CSP guidelines', async () => {
      const mod = getModule('security');
      if (!mod) throw new Error('security module not found');

      const strictCtx = { ...ctx, settings: { securityLevel: 'strict' } };
      const result = await mod.execute(strictCtx);
      
      expect(result.created).toContain('src/lib/env.ts');
      expect(result.created).toContain('src/lib/sanitize.ts');
      expect(result.created).toContain('src/lib/security.ts');

      const envContent = fs.readFileSync(path.join(tmpDir, 'src/lib/env.ts'), 'utf-8');
      expect(envContent).toContain('NODE_ENV');
      expect(envContent).toContain('Security Violation: VITE_APP_URL must resolve');

      const cryptoContent = fs.readFileSync(path.join(tmpDir, 'src/lib/security.ts'), 'utf-8');
      expect(cryptoContent).toContain('encryptAES');
      expect(cryptoContent).toContain('decryptAES');
      expect(cryptoContent).toContain('hashData');
      expect(cryptoContent).toContain('generateSecureToken');
    });
  });
});
