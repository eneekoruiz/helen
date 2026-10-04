import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getCatalogItem, listCatalog, readCatalog, validateCatalog } from '../src/core/catalog.js';

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
    for (const id of ['taste-skill', 'image-to-code', 'impeccable', 'web-design-guidelines', 'humanizer', 'cro-optimization', 'seo', 'scroll-craft', '21st-dev', 'playwright-cli', 'awesome-design-md', 'google-design-md', 'godly', 'transitions-dev', 'animos-app', 'deck-gallery', 'gsd-core', 'ralph-loop', 'coderabbit', 'roo-code', 'playwright-mcp', 'chrome-devtools-mcp', 'context7', 'github-mcp', 'supabase-mcp', 'vercel-mcp']) {
      expect(getCatalogItem(id).id).toBe(id);
    }
  });

  it('flags discontinued and cautionary tools', () => {
    expect(getCatalogItem('roo-code').status).toBe('discontinued');
    expect(getCatalogItem('coderabbit').status).toBe('caution');
    expect(getCatalogItem('godly').status).toBe('caution');
    for (const item of items) expect(['active', 'caution', 'discontinued']).toContain(item.status);
  });

  it('lists MCP servers separately and warns about permissions', () => {
    const mcp = listCatalog(undefined, undefined, 'mcp');
    expect(mcp.length).toBeGreaterThanOrEqual(6);
    for (const item of mcp) expect(item.notes ?? '').not.toBe('');
  });

  it('filters by category and rejects unknown ids', () => {
    expect(listCatalog('design').every(item => item.category === 'design')).toBe(true);
    expect(() => getCatalogItem('nope')).toThrow(/not in the catalog/);
  });

  it('validates structure and warns about stale entries', () => {
    expect(validateCatalog().filter(issue => issue.level === 'error')).toEqual([]);
    const later = new Date(Date.parse('2026-09-29') + 200 * 86_400_000);
    const stale = validateCatalog(undefined, later);
    expect(stale.length).toBe(items.length);
    expect(stale.every(issue => issue.level === 'warn')).toBe(true);
  });

  it.each([null, {}, { items: [null] }, { items: [{ ...items[0], install: null }] }])('reports malformed catalog structure without crashing its validator', value => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-catalog-'));
    try {
      fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify(value));
      expect(() => readCatalog(root)).toThrow('Invalid catalog');
      expect(validateCatalog(root)).toEqual([expect.objectContaining({ level: 'error', message: expect.stringContaining('Invalid catalog') })]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
