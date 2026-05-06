import { describe, it, expect } from 'vitest';
import { getAllModules, getModule, getAllModuleIds, getModulesByCategory } from '../src/modules/registry.js';

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
});
