import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runProjectOperation, listOperations, recoverOperation, writeAtomicFile, removeTrackedFile } from '../src/core/operations.js';
import { writeFileSafe, patchJson, appendOnce } from '../src/core/fs.js';
import { withPreview, getPlannedContent } from '../src/core/preview.js';
import { updateConfig } from '../src/core/config.js';

describe('Durable project operations', () => {
  let cwd: string;
  beforeEach(() => { cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-operation-')); });
  afterEach(() => { fs.rmSync(cwd, { recursive: true, force: true }); });

  it('commits atomic writes without leaving snapshots or locks', async () => {
    const file = path.join(cwd, 'file.txt');
    await runProjectOperation(cwd, 'test', async () => { writeAtomicFile(file, 'complete'); });
    expect(fs.readFileSync(file, 'utf8')).toBe('complete');
    expect(listOperations(cwd)).toEqual([]);
    expect(fs.readdirSync(path.join(cwd, '.helen/operations'))).toEqual(['.gitignore']);
  });

  it.each(['committed', 'recovered'])('reconciles a crash after %s was saved but before lock cleanup', async status => {
    const id = randomUUID();
    const directory = path.join(cwd, '.helen/operations');
    fs.mkdirSync(directory, { recursive: true });
    const journal = path.join(directory, `${id}.json`);
    fs.writeFileSync(journal, JSON.stringify({ version: 1, id, kind: 'test', status, startedAt: new Date().toISOString(), entries: [], temporaries: [] }));
    fs.linkSync(journal, path.join(directory, '.lock'));
    expect(listOperations(cwd)).toEqual([]);
    await runProjectOperation(cwd, 'new', async () => { writeAtomicFile(path.join(cwd, 'new.txt'), 'safe'); });
    expect(fs.readFileSync(path.join(cwd, 'new.txt'), 'utf8')).toBe('safe');
    expect(fs.existsSync(path.join(directory, '.lock'))).toBe(false);
  });

  it('recovers repeated writes, deletions, created files and backup creation after failure', async () => {
    const file = path.join(cwd, 'file.txt');
    const removed = path.join(cwd, 'removed.txt');
    fs.writeFileSync(file, 'original'); fs.writeFileSync(removed, 'keep');
    await expect(runProjectOperation(cwd, 'test', async () => {
      writeFileSafe(file, 'first', { force: true, root: cwd });
      writeFileSafe(file, 'second', { force: true, root: cwd });
      writeAtomicFile(path.join(cwd, 'new.txt'), 'created');
      removeTrackedFile(removed);
      throw new Error('interrupted');
    })).rejects.toThrow('helen recover');
    const pending = listOperations(cwd)[0]!;
    expect(pending.files).toContain('file.txt.helen-backup');
    expect(JSON.stringify(pending)).not.toContain('original');
    recoverOperation(cwd, pending.id, true);
    expect(fs.readFileSync(file, 'utf8')).toBe('second');
    recoverOperation(cwd, pending.id);
    expect(fs.readFileSync(file, 'utf8')).toBe('original');
    expect(fs.readFileSync(removed, 'utf8')).toBe('keep');
    expect(fs.existsSync(path.join(cwd, 'new.txt'))).toBe(false);
    expect(fs.existsSync(`${file}.helen-backup`)).toBe(false);
    expect(listOperations(cwd)).toEqual([]);
  });

  it('blocks new mutations and preserves all files when later user edits conflict with recovery', async () => {
    const file = path.join(cwd, 'file.txt');
    fs.writeFileSync(file, 'original');
    const failed = await runProjectOperation(cwd, 'test', async () => { writeAtomicFile(file, 'planned'); return false; }, value => value);
    await expect(runProjectOperation(cwd, 'other', async () => {})).rejects.toThrow('needs recovery');
    fs.writeFileSync(file, 'user edited later');
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow('Recovery conflict');
    expect(fs.readFileSync(file, 'utf8')).toBe('user edited later');
    fs.writeFileSync(file, 'planned');
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(file, 'utf8')).toBe('original');
  });

  it('restores corrupt config recovery and preserves existing file permissions', async () => {
    const config = path.join(cwd, '.helenrc');
    fs.writeFileSync(config, '{corrupt', { mode: 0o600 });
    const failed = await runProjectOperation(cwd, 'config', async () => {
      updateConfig(cwd, { projectName: 'new' });
      return false;
    }, value => value);
    expect(fs.existsSync(path.join(cwd, '.helenrc.corrupt'))).toBe(true);
    if (process.platform !== 'win32') {
      expect(fs.statSync(path.join(cwd, '.helenrc.corrupt')).mode & 0o777).toBe(0o600);
    }
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(config, 'utf8')).toBe('{corrupt');
    expect(fs.existsSync(path.join(cwd, '.helenrc.corrupt'))).toBe(false);
  });

  it('does not let another asynchronous operation enter while an action is running', async () => {
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const first = runProjectOperation(cwd, 'first', async () => { await waiting; });
    await expect(runProjectOperation(cwd, 'second', async () => { writeAtomicFile(path.join(cwd, 'bad.txt'), 'bad'); })).rejects.toThrow('needs recovery');
    release(); await first;
    expect(fs.existsSync(path.join(cwd, 'bad.txt'))).toBe(false);
    expect(listOperations(cwd)).toEqual([]);
  });

  it('rejects recovery paths escaping the project before changing any file', async () => {
    const file = path.join(cwd, 'safe.txt');
    fs.writeFileSync(file, 'original');
    const failed = await runProjectOperation(cwd, 'test', async () => { writeAtomicFile(file, 'changed'); return false; }, value => value);
    const manifest = path.join(cwd, '.helen/operations', `${failed.operation!.id}.json`);
    const journal = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    journal.entries.push({ file: '../outside.txt', before: null, hashes: [null] });
    fs.writeFileSync(manifest, JSON.stringify(journal));
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow('Unsafe operation file');
    expect(fs.readFileSync(file, 'utf8')).toBe('changed');
  });

  it('recovers a real terminated process and its leftover temporary files', () => {
    const file = path.join(cwd, 'target.txt'); fs.writeFileSync(file, 'original');
    const script = path.join(cwd, 'crash.mts');
    const source = pathToFileURL(path.resolve('src/core/operations.ts')).href;
    fs.writeFileSync(script, `import fs from 'node:fs'; import path from 'node:path';
      import {runProjectOperation,writeAtomicFile,listOperations} from ${JSON.stringify(source)};
      await runProjectOperation(process.cwd(),'crash',async()=>{
        writeAtomicFile(path.resolve('target.txt'),'changed');
        const op=listOperations(process.cwd())[0];
        const journal=JSON.parse(fs.readFileSync(path.join('.helen/operations',op.id+'.json'),'utf8'));
        fs.writeFileSync(journal.temporaries[0],'partial'); process.exit(17);
      });`);
    const child = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), script], { cwd, encoding: 'utf8', timeout: 30_000, windowsHide: true });
    expect(child.status, child.stderr).toBe(17);
    const pending = listOperations(cwd)[0]!;
    expect(pending.status).toBe('active');
    recoverOperation(cwd, pending.id);
    expect(fs.readFileSync(file, 'utf8')).toBe('original');
    expect(fs.readdirSync(cwd).filter(name => name.endsWith('.tmp'))).toEqual([]);
    expect(listOperations(cwd)).toEqual([]);
  }, 45_000);

  it('composes dry-run JSON patches and appends without writing files or journals', async () => {
    const pkg = path.join(cwd, 'package.json');
    const text = path.join(cwd, 'rules.txt');
    fs.writeFileSync(pkg, '{"name":"fixture"}');
    const preview = await withPreview(async () => {
      patchJson(pkg, { dependencies: { first: '1' } }, { dryRun: true, root: cwd });
      patchJson(pkg, { dependencies: { second: '2' } }, { dryRun: true, root: cwd });
      appendOnce(text, 'first', 'first', { dryRun: true, root: cwd });
      appendOnce(text, 'second', 'second', { dryRun: true, root: cwd });
      expect(JSON.parse(getPlannedContent(pkg)!)).toEqual({ name: 'fixture', dependencies: { first: '1', second: '2' } });
    });
    expect(preview.changes).toHaveLength(2);
    expect(getPlannedContent(text)).toBeUndefined();
    expect(fs.readFileSync(pkg, 'utf8')).toBe('{"name":"fixture"}');
    expect(fs.existsSync(text)).toBe(false);
    expect(fs.existsSync(path.join(cwd, '.helen'))).toBe(false);
  });
});
