import { describe, it, expect } from 'vitest';
import { getAllModules, getModule, getAllModuleIds, getModulesByCategory, register, unregisterForTesting } from '../src/modules/registry.js';
import { runModule } from '../src/core/moduleRunner.js';
import { getTemplatePath } from '../src/core/templateResolver.js';
import fs from 'node:fs';

describe('Module Registry', () => {
  it('should have 12 registered modules', () => {
    const modules = getAllModules();
    expect(modules.length).toBe(12);
  });

  it('should return all module ids', () => {
    const ids = getAllModuleIds();
    expect(ids).toContain('quality');
    expect(ids).toContain('testing');
    expect(ids).toContain('docker');
    expect(ids).toContain('ci');
    expect(ids).toContain('seo');
    expect(ids).toContain('security');
    expect(ids).toContain('dx');
    expect(ids).toContain('theme');
    expect(ids).toContain('gdpr');
    expect(ids).toContain('pwa');
    expect(ids).toContain('i18n');
    expect(ids).toContain('sentry');
  });


  it('should get a module by id', () => {
    const mod = getModule('docker');
    expect(mod).toBeDefined();
    expect(mod!.meta.id).toBe('docker');
    expect(mod!.meta.name).toBe('Docker Setup');
  });

  it('should return undefined for unknown module', () => {
    const mod = getModule('nonexistent');
    expect(mod).toBeUndefined();
  });

  it('should group modules by category', () => {
    const categories = getModulesByCategory();
    expect(categories.size).toBeGreaterThan(0);

    // Infrastructure should have docker and ci
    const infra = categories.get('Infrastructure');
    expect(infra).toBeDefined();
    expect(infra!.map((m) => m.meta.id)).toContain('docker');
    expect(infra!.map((m) => m.meta.id)).toContain('ci');
  });

  it('every module should have complete metadata', () => {
    const modules = getAllModules();
    for (const mod of modules) {
      const { meta } = mod;
      expect(meta.id).toBeTruthy();
      expect(meta.name).toBeTruthy();
      expect(meta.category).toBeTruthy();
      expect(meta.summary).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.problemItSolves).toBeTruthy();
      expect(meta.whenToUse).toBeTruthy();
      expect(meta.whenNotToUse).toBeTruthy();
      expect(meta.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(meta.recommendedLevel).toMatch(/^(beginner|intermediate|advanced)$/);
      expect(meta.status).toMatch(/^(stable|experimental|planned|deprecated)$/);
      expect(typeof mod.execute).toBe('function');
    }
  });

  it('should have unique module ids in registry', () => {
    const ids = getAllModuleIds();
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should throw an error on duplicate module registration', () => {
    const dummyMod = {
      meta: {
        id: 'docker', // already exists
        name: 'Duplicate Docker',
        category: 'Infrastructure',
        summary: '...',
        description: '...',
        problemItSolves: '...',
        whenToUse: '...',
        whenNotToUse: '...',
        filesCreated: [],
        filesModified: [],
        runtimeDependencies: [],
        devDependencies: [],
        requirements: [],
        risks: [],
        nextSteps: [],
        riskLevel: 'low',
        recommendedLevel: 'beginner',
        status: 'stable',
      },
      execute: async () => ({
        moduleId: 'docker',
        moduleName: 'Duplicate Docker',
        created: [],
        modified: [],
        skipped: [],
        warnings: [],
        nextSteps: [],
      }),
    };

    expect(() => register(dummyMod)).toThrow();
  });

  it('planned modules should not be executable', async () => {
    const dummyPlannedMod = {
      meta: {
        id: 'test-planned',
        name: 'Test Planned Module',
        category: 'Testing',
        summary: '...',
        description: '...',
        problemItSolves: '...',
        whenToUse: '...',
        whenNotToUse: '...',
        filesCreated: [],
        filesModified: [],
        runtimeDependencies: [],
        devDependencies: [],
        requirements: [],
        risks: [],
        nextSteps: [],
        riskLevel: 'low',
        recommendedLevel: 'beginner',
        status: 'planned',
      },
      execute: async () => ({
        moduleId: 'test-planned',
        moduleName: 'Test Planned Module',
        created: ['test-planned.txt'],
        modified: [],
        skipped: [],
        warnings: [],
        nextSteps: [],
      }),
    };

    register(dummyPlannedMod);
    try {
      const dummyCtx = {
        cwd: '',
        project: { name: 'test', framework: 'vite', packageManager: 'npm', hasPackageJson: true, hasGit: false, hasTypeScript: false, hasVite: false },
        dryRun: true,
        force: false,
        verbose: false,
      };
      const result = await runModule('test-planned', dummyCtx);
      expect(result).toBeNull();
    } finally {
      unregisterForTesting('test-planned');
    }
  });

  it('every referenced external template file should exist in templates folder', () => {
    const expectedTemplates = [
      'docker/Dockerfile',
      'docker/docker-compose.yml',
      'testing/vitest.config.ts',
    ];

    for (const tpl of expectedTemplates) {
      const fullPath = getTemplatePath(tpl);
      expect(fs.existsSync(fullPath), `Template ${tpl} at ${fullPath} not found`).toBe(true);
    }
  });
});
