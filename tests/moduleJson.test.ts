import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('Real module CLI JSON output', () => {
  it('previews composed changes without writes or installs and matches the subsequent application', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-module-preview-'));
    const invoke = (args: string[]) => spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), ...args, '--json'], { cwd, encoding: 'utf8', windowsHide: true });
    try {
      const original = '{"name":"fixture","devDependencies":{"eslint":"^8.57.0"}}';
      fs.writeFileSync(path.join(cwd, 'package.json'), original);
      const preview = invoke(['add', 'quality', 'testing', '--preview', '--install']);
      const envelope = JSON.parse(preview.stdout);
      expect(envelope.ok).toBe(true);
      expect(fs.readdirSync(cwd)).toEqual(['package.json']);
      expect(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).toBe(original);
      const change = envelope.data.changes.find((entry: { path: string }) => entry.path === 'package.json');
      const manifest = envelope.data.changes.find((entry: { path: string }) => entry.path === '.helenrc');
      expect(manifest.redacted).toBe(true);
      expect(manifest.after).toBeNull();
      expect(JSON.parse(change.after).devDependencies.eslint).toBe('^8.57.0');
      expect(JSON.parse(change.after).devDependencies.vitest).toBeDefined();
      const applied = invoke(['add', 'quality', 'testing']);
      expect(JSON.parse(applied.stdout).ok).toBe(true);
      expect(JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))).toEqual(JSON.parse(change.after));
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  }, 90_000);

  it('persists actual file ownership so ejection preserves skipped user files and their backups', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-module-ownership-'));
    const invoke = (args: string[]) => spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), ...args, '--json'], { cwd, encoding: 'utf8' });
    try {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'sandbox' }));
      fs.writeFileSync(path.join(cwd, '.eslintrc.json'), '{"user":true}');
      fs.writeFileSync(path.join(cwd, '.eslintrc.json.helen-backup'), '{"stale":true}');
      const added = invoke(['add', 'quality']);
      expect(JSON.parse(added.stdout).ok).toBe(true);
      const config = JSON.parse(fs.readFileSync(path.join(cwd, '.helenrc'), 'utf8'));
      expect(config.moduleFiles.quality.created).toContain('.prettierrc');
      expect(config.moduleFiles.quality.modified).toContain('package.json');
      expect(config.moduleFiles.quality.created).not.toContain('.eslintrc.json');
      const ejected = invoke(['eject', 'quality']);
      expect(ejected.status).toBe(0);
      expect(JSON.parse(ejected.stdout).data.ejected).toBe(true);
      expect(fs.readFileSync(path.join(cwd, '.eslintrc.json'), 'utf8')).toBe('{"user":true}');
      expect(fs.existsSync(path.join(cwd, '.eslintrc.json.helen-backup'))).toBe(true);
      expect(fs.existsSync(path.join(cwd, '.prettierrc'))).toBe(false);
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  });

  it('fails unsafe installations without persisting the module as installed', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-module-failure-'));
    try {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'sandbox' }));
      fs.mkdirSync(path.join(cwd, '.eslintrc.json'));
      const result = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), 'add', 'quality', '--json'], { cwd, encoding: 'utf8' });
      expect(result.status).toBe(1);
      const envelope = JSON.parse(result.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.data.results).toHaveLength(1);
      expect(envelope.data.results[0].failed).toBe(true);
      const config = JSON.parse(fs.readFileSync(path.join(cwd, '.helenrc'), 'utf8'));
      expect(config.installedModules).toEqual([]);
      expect(config.createdFiles).toContain('.prettierrc');
      expect(fs.statSync(path.join(cwd, '.eslintrc.json')).isDirectory()).toBe(true);
      const operationId = envelope.data.results[0].operationId;
      const recovery = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), 'recover', operationId, '--json'], { cwd, encoding: 'utf8' });
      expect(JSON.parse(recovery.stdout).ok).toBe(true);
      fs.rmdirSync(path.join(cwd, '.eslintrc.json'));
      const retry = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), 'add', 'quality', '--json'], { cwd, encoding: 'utf8' });
      expect(JSON.parse(retry.stdout).ok).toBe(true);
      const recovered = JSON.parse(fs.readFileSync(path.join(cwd, '.helenrc'), 'utf8'));
      expect(recovered.installedModules).toEqual(['quality']);
      expect(recovered.moduleFiles.quality.created).toContain('.prettierrc');
      const eject = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), 'eject', 'quality', '--json'], { cwd, encoding: 'utf8' });
      expect(JSON.parse(eject.stdout).ok).toBe(true);
      expect(fs.existsSync(path.join(cwd, '.prettierrc'))).toBe(false);
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  });

  it('emits exactly one envelope when a module has next-step instructions', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-module-json-'));
    try {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'sandbox' }));
      const result = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('src/cli.ts'), 'add', 'testing', '--dry-run', '--json'], { cwd, encoding: 'utf8' });
      expect(result.status).toBeLessThan(3);
      const envelope = JSON.parse(result.stdout);
      expect(envelope.command).toBe('add');
      expect(envelope.errors).toEqual([]);
      expect(fs.readdirSync(cwd)).toEqual(['package.json']);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
