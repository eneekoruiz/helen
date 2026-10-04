import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { getPlannedContent, previewToJSON, recordPlannedWrite, renderPreview, withPreview } from '../src/core/preview.js';

describe('write previews', () => {
  it('collects creates, modifications, and aggregates repeated writes from original to final', async () => {
    const cwd = path.join(os.tmpdir(), 'preview-root');
    const created = path.join(cwd, 'new.txt');
    const edited = path.join(cwd, 'settings.json');
    const { result, changes } = await withPreview(async () => {
      recordPlannedWrite(created, null, 'first\n');
      recordPlannedWrite(edited, '{"a":1}', '{"a":2}', { backup: true });
      recordPlannedWrite(edited, '{"a":2}', '{"a":3}', { backup: true });
      recordPlannedWrite(path.join(cwd, 'same.txt'), 'same', 'same');
      return 'done';
    });

    expect(result).toBe('done');
    expect(changes).toEqual([
      { path: created, before: null, after: 'first\n' },
      { path: edited, before: '{"a":1}', after: '{"a":3}', backup: true },
    ]);
    expect(renderPreview(changes, cwd)).toContain('backup: .helen-backup');
    expect(previewToJSON(changes, cwd)[0]).toMatchObject({ path: 'new.txt', operation: 'create' });
  });

  it('exposes the latest planned contents only inside the active preview context', async () => {
    const file = path.join(os.tmpdir(), 'virtual-package.json');
    expect(getPlannedContent(file)).toBeUndefined();
    await withPreview(async () => {
      expect(getPlannedContent(file)).toBeUndefined();
      recordPlannedWrite(file, null, '{"first":true}');
      expect(getPlannedContent(file)).toBe('{"first":true}');
      recordPlannedWrite(file, '{"first":true}', '{"first":true,"second":true}');
      expect(getPlannedContent(file)).toBe('{"first":true,"second":true}');
    });
    expect(getPlannedContent(file)).toBeUndefined();
  });

  it('isolates overlapping async preview contexts', async () => {
    const one = path.join(os.tmpdir(), 'one.txt');
    const two = path.join(os.tmpdir(), 'two.txt');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const first = withPreview(async () => {
      recordPlannedWrite(one, null, 'one');
      await gate;
      return 1;
    });
    const second = await withPreview(async () => {
      recordPlannedWrite(two, null, 'two');
      return 2;
    });
    release();
    const firstResult = await first;

    expect(firstResult.changes.map((change) => change.path)).toEqual([one]);
    expect(second.changes.map((change) => change.path)).toEqual([two]);
  });

  it('redacts environment secrets in text and JSON while keeping generated content visible', () => {
    const cwd = path.join(os.tmpdir(), 'preview-root');
    const secret = path.join(cwd, '.env.production');
    const config = path.join(cwd, '.helenrc');
    const ordinary = path.join(cwd, 'generated.ts');
    const changes = [
      { path: secret, before: 'TOKEN=old-secret', after: 'TOKEN=new-secret' },
      { path: config, before: '{"apiKey":"old-key"}', after: '{"apiKey":"new-key"}' },
      { path: ordinary, before: null, after: 'export const value = 1;' },
    ];

    const rendered = renderPreview(changes, cwd);
    expect(rendered).toContain('[content redacted]');
    expect(rendered).not.toContain('new-secret');
    expect(rendered).not.toContain('new-key');
    expect(rendered).toContain('export const value = 1;');
    expect(previewToJSON(changes, cwd)[0]).toMatchObject({ redacted: true, before: null, after: null });
    expect(previewToJSON(changes, cwd)[1]).toMatchObject({ redacted: true, before: null, after: null });
    const json = JSON.stringify(previewToJSON(changes, cwd));
    expect(json).not.toContain('old-secret');
    expect(json).not.toContain('old-key');
  });

  it('prints hostile filenames as inert path text and truncates very large diffs', () => {
    const cwd = path.join(os.tmpdir(), 'preview-root');
    const hostile = path.join(cwd, '$(touch pwned)\u001b[31m.txt');
    const rendered = renderPreview([{ path: hostile, before: null, after: `${'line\n'.repeat(7000)}` }], cwd);

    expect(rendered).toContain('$(touch pwned)');
    expect(rendered).toContain('\\x1b');
    expect(rendered).toContain('diff truncated');
  });

  it('bounds rendering for files with more than one hundred thousand lines', () => {
    const file = path.join(os.tmpdir(), 'huge-preview.txt');
    const content = 'x\n'.repeat(120_000);
    const rendered = renderPreview([{ path: file, before: null, after: content }], os.tmpdir());

    expect(rendered).toContain('diff truncated');
    expect(rendered.length).toBeLessThan(25_000);
  });
});
