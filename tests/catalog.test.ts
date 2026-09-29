import { describe, expect, it } from 'vitest';
import { getCatalogItem, listCatalog, readCatalog } from '../src/core/catalog.js';

describe('External skills catalog', () => {
  const items = readCatalog();

  it('has unique ids and complete entries', () => {
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    for (const item of items) {
      expect(item.summary.length).toBeGreaterThan(10);
      expect(item.source).toMatch(/^https:\/\//);
      expect(item.install.length).toBeGreaterThan(0);
      expect(item.phases.length).toBeGreaterThan(0);
    }
  });

  it('covers the tools the user collected', () => {
    for (const id of ['taste-skill', 'image-to-code', 'impeccable', 'web-design-guidelines', 'humanizer', 'cro-optimization', 'seo', 'scroll-craft', '21st-dev', 'playwright-cli', 'awesome-design-md', 'google-design-md', 'godly', 'transitions-dev', 'animos-app', 'deck-gallery', 'gsd-core', 'ralph-loop', 'coderabbit', 'roo-code']) {
      expect(getCatalogItem(id).id).toBe(id);
    }
  });

  it('flags discontinued and cautionary tools', () => {
    expect(getCatalogItem('roo-code').status).toBe('discontinued');
    expect(getCatalogItem('coderabbit').status).toBe('caution');
    expect(getCatalogItem('godly').status).toBe('caution');
    for (const item of items) expect(['active', 'caution', 'discontinued']).toContain(item.status);
  });

  it('filters by category and rejects unknown ids', () => {
    expect(listCatalog('design').every(item => item.category === 'design')).toBe(true);
    expect(() => getCatalogItem('nope')).toThrow(/not in the catalog/);
  });
});
