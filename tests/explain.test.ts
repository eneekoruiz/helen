import { describe, it, expect } from 'vitest';
import { getModule } from '../src/modules/registry.js';

describe('Module Explain', () => {
  it('explain docker should return complete documentation', () => {
    const mod = getModule('docker');
    expect(mod).toBeDefined();

    const { meta } = mod!;
    expect(meta.id).toBe('docker');
    expect(meta.name).toBeTruthy();
    expect(meta.description.length).toBeGreaterThan(20);
    expect(meta.problemItSolves.length).toBeGreaterThan(10);
    expect(meta.whenToUse.length).toBeGreaterThan(5);
    expect(meta.whenNotToUse.length).toBeGreaterThan(5);
    expect(meta.filesCreated.length).toBeGreaterThan(0);
    expect(meta.riskLevel).toBe('low');
  });

  it('explain quality should return complete documentation', () => {
    const mod = getModule('quality');
    expect(mod).toBeDefined();
    expect(mod!.meta.devDependencies.length).toBeGreaterThan(0);
  });

  it('explain security should return complete documentation', () => {
    const mod = getModule('security');
    expect(mod).toBeDefined();
    expect(mod!.meta.filesCreated).toContain('src/lib/env.ts');
    expect(mod!.meta.riskLevel).toBe('medium');
  });

  it('all modules should have at least one nextStep', () => {
    const moduleIds = ['quality', 'testing', 'docker', 'ci', 'seo', 'security', 'dx', 'theme'];
    for (const id of moduleIds) {
      const mod = getModule(id);
      expect(mod, `Module ${id} not found`).toBeDefined();
      expect(mod!.meta.nextSteps.length, `Module ${id} has no nextSteps`).toBeGreaterThan(0);
    }
  });
});
