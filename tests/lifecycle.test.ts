import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const helenCli = path.join(repoRoot, 'src', 'cli.ts');
interface JsonEnvelope<T> {
  ok: boolean;
  command: string;
  data: T;
  warnings: string[];
  errors: string[];
}

function runCli<T = unknown>(cwd: string, args: string[], allowedStatuses = [0]): JsonEnvelope<T> {
  const result = spawnSync(process.execPath, [tsxCli, helenCli, ...args, '--json'], {
    cwd,
    encoding: 'utf8',
    timeout: 45_000,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  expect(allowedStatuses, result.stderr || result.stdout).toContain(result.status);
  return JSON.parse(result.stdout.trim()) as JsonEnvelope<T>;
}

describe('CLI project lifecycle', () => {
  let projectDir: string | undefined;

  afterEach(() => {
    if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
    projectDir = undefined;
  });

  it('adds and repeats modules, force-updates safely, ejects owned files, and rolls back', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-lifecycle-'));
    const initialPackage = {
      name: 'lifecycle-fixture',
      version: '1.0.0',
      dependencies: { 'user-kept': '^1.2.3' },
      devDependencies: {},
    };
    fs.writeFileSync(path.join(projectDir, 'package.json'), `${JSON.stringify(initialPackage, null, 2)}\n`);

    const add = runCli(projectDir, ['add', 'quality', 'testing']);
    expect(add.command).toBe('add');
    expect(fs.existsSync(path.join(projectDir, '.prettierrc'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')).dependencies['user-kept']).toBe('^1.2.3');

    const installedConfig = JSON.parse(fs.readFileSync(path.join(projectDir, '.helenrc'), 'utf8')) as {
      moduleFiles: Record<string, { created: string[]; modified: string[] }>;
    };
    runCli(projectDir, ['add', 'quality', 'testing'], [0, 2]);
    const repeatedConfig = JSON.parse(fs.readFileSync(path.join(projectDir, '.helenrc'), 'utf8')) as typeof installedConfig;
    expect(repeatedConfig.moduleFiles).toEqual(installedConfig.moduleFiles);
    const afterRepeat = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    expect(afterRepeat.dependencies['user-kept']).toBe('^1.2.3');
    expect(afterRepeat.devDependencies.eslint).toBeDefined();
    expect(afterRepeat.devDependencies.vitest).toBeDefined();

    const userConfig = '{"userOwned":true}\n';
    fs.writeFileSync(path.join(projectDir, '.prettierrc'), userConfig);
    runCli(projectDir, ['update']);
    const forcedPackage = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    expect(forcedPackage.dependencies['user-kept']).toBe('^1.2.3');
    expect(forcedPackage.devDependencies.eslint).toBeDefined();
    expect(fs.existsSync(path.join(projectDir, '.prettierrc.helen-backup'))).toBe(true);

    const eject = runCli<{ moduleId: string; ejected: boolean }>(projectDir, ['eject', 'quality']);
    expect(eject.data.ejected).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.prettierrc'))).toBe(true);
    expect(fs.readFileSync(path.join(projectDir, '.prettierrc'), 'utf8')).toBe(userConfig);
    expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true);
    // package.json is shared by the remaining testing module.
    expect(JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')).devDependencies.vitest).toBeDefined();

    const rollback = runCli(projectDir, ['rollback']);
    expect(rollback.command).toBe('rollback');
    expect(JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'))).toEqual(initialPackage);
    // Rollback restores files backed up by the force-update and the earlier config.
    expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.helenrc'))).toBe(true);
  }, 180_000);

  it('rolls back a fresh install to the original project', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-lifecycle-rollback-'));
    const initialPackage = { name: 'rollback-fixture', version: '1.0.0', dependencies: { 'user-kept': '^2.0.0' } };
    fs.writeFileSync(path.join(projectDir, 'package.json'), `${JSON.stringify(initialPackage, null, 2)}\n`);

    runCli(projectDir, ['add', 'quality', 'testing']);
    expect(fs.existsSync(path.join(projectDir, '.prettierrc'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true);
    const rollback = runCli(projectDir, ['rollback']);

    expect(rollback.command).toBe('rollback');
    expect(JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'))).toEqual(initialPackage);
    expect(fs.existsSync(path.join(projectDir, '.prettierrc'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, 'src', 'test', 'setup.ts'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.helenrc'))).toBe(false);
  }, 180_000);
});
