import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPlan } from '../src/core/apply.js';
import { readProgress, runChecks, runFocusedChecks, startProgress } from '../src/core/progress.js';

describe('focused check runs', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-focused-check-'));
    fs.mkdirSync(path.join(cwd, 'tests'));
    fs.writeFileSync(path.join(cwd, 'tests', 'one.test.ts'), '');
    fs.writeFileSync(path.join(cwd, 'tests', 'two.test.ts'), '');
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^4.0.0' },
      scripts: { test: 'vitest run', lint: 'eslint .' },
    }));
  });

  afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

  it('runs only selected Vitest files and labels the result ineligible for checkpoint evidence', () => {
    const calls: Array<{ script: string; args: string[] }> = [];
    const result = runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }, (_cwd, _pm, script, args) => {
      calls.push({ script, args });
      return true;
    });

    expect(calls).toEqual([{ script: 'test', args: ['--run', 'tests/one.test.ts'] }]);
    expect(result).toMatchObject({ ok: true, checkpointEligible: false, scope: { kind: 'tests', files: ['tests/one.test.ts'] } });
  });

  it('does not overwrite a passing full check already recorded for a checkpoint', () => {
    startProgress(cwd, buildPlan(cwd, 'quality'));
    runChecks(cwd, () => true);
    const fullEvidence = readProgress(cwd)!.lastCheck;

    runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }, () => true);

    expect(readProgress(cwd)!.lastCheck).toEqual(fullEvidence);
  });

  it('rejects paths outside the project, symlinks, and option-like paths before invoking the runner', () => {
    const outside = path.join(path.dirname(cwd), 'helen-outside.test.ts');
    fs.writeFileSync(outside, '');
    let calls = 0;
    const runner = () => { calls++; return true; };
    try {
      expect(() => runFocusedChecks(cwd, { files: [outside] }, runner)).toThrow(/inside the project/);
      expect(() => runFocusedChecks(cwd, { files: ['--config=evil.ts'] }, runner)).toThrow(/Invalid focused test path/);
      fs.writeFileSync(path.join(cwd, '--config.test.ts'), '');
      expect(() => runFocusedChecks(cwd, { files: ['tests/../--config.test.ts'] }, runner)).toThrow(/after normalization/);
      const symlink = path.join(cwd, 'tests', 'linked.test.ts');
      try {
        fs.symlinkSync(path.join(cwd, 'tests', 'one.test.ts'), symlink);
      } catch (err) {
        // Windows runners without Developer Mode may not permit creating test symlinks.
        if (process.platform === 'win32' && (err as NodeJS.ErrnoException).code === 'EPERM') {
          expect(calls).toBe(0);
          return;
        }
        throw err;
      }
      expect(() => runFocusedChecks(cwd, { files: ['tests/linked.test.ts'] }, runner)).toThrow(/symbolic links|symlink/);
      expect(calls).toBe(0);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  it('rejects non-Vitest projects for file focus', () => {
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ devDependencies: { jest: '^30.0.0' }, scripts: { test: 'jest' } }));
    expect(() => runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }, () => true)).toThrow(/direct Vitest script/);
  });

  it('rejects wrappers, compound scripts, and script-level filters that can bypass focused selection', () => {
    let calls = 0;
    const runner = () => { calls++; return true; };
    for (const testScript of ['echo vitest', 'vitest run && npm run integration', 'npx vitest run', 'vitest run tests/two.test.ts']) {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
        devDependencies: { vitest: '^4.0.0' }, scripts: { test: testScript },
      }));
      expect(() => runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }, runner), testScript)
        .toThrow(/direct Vitest script/);
    }
    expect(calls).toBe(0);
  });

  it('refuses Vitest substring collisions before invoking the runner', () => {
    fs.writeFileSync(path.join(cwd, 'tests', 'one.test.ts.extra.test.ts'), '');
    let calls = 0;
    expect(() => runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }, () => { calls++; return true; }))
      .toThrow(/could also run tests\/one\.test\.ts\.extra\.test\.ts/);
    expect(calls).toBe(0);
  });

  it('runs the installed Vitest binary for an unambiguous file and preserves config flags', () => {
    fs.writeFileSync(path.join(cwd, 'tests', 'one.test.ts'), "import { it, expect } from 'vitest'; it('selected', () => expect(true).toBe(true));");
    fs.symlinkSync(path.resolve(process.cwd(), 'node_modules'), path.join(cwd, 'node_modules'), 'junction');
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^4.0.0' },
      scripts: { test: 'vitest run --config vitest.config.ts' },
    }));
    fs.writeFileSync(path.join(cwd, 'vitest.config.ts'), "import { defineConfig } from 'vitest/config'; export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });");
    const selectedContents = fs.readFileSync(path.join(cwd, 'tests', 'one.test.ts'), 'utf8');

    const result = runFocusedChecks(cwd, { files: ['tests/one.test.ts'] });

    expect(result).toMatchObject({ ok: true, results: [{ script: 'test', ok: true }] });
    expect(result.scope).toEqual({ kind: 'tests', files: ['tests/one.test.ts'] });
    expect(fs.readFileSync(path.join(cwd, 'tests', 'one.test.ts'), 'utf8')).toBe(selectedContents);

    fs.writeFileSync(path.join(cwd, 'tests', 'one.test.ts.extra.test.ts'), "import { it } from 'vitest'; it('must never be selected accidentally', () => { throw new Error('unselected sibling executed'); });");
    expect(() => runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }))
      .toThrow(/could also run tests\/one\.test\.ts\.extra\.test\.ts/);
  });

  it('rejects a selected test excluded by Vitest config even when passWithNoTests is enabled', () => {
    fs.writeFileSync(path.join(cwd, 'tests', 'one.test.ts'), "import { it, expect } from 'vitest'; it('selected', () => expect(true).toBe(true));");
    fs.symlinkSync(path.resolve(process.cwd(), 'node_modules'), path.join(cwd, 'node_modules'), 'junction');
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^4.0.0' },
      scripts: { test: 'vitest run' },
    }));
    fs.writeFileSync(path.join(cwd, 'vitest.config.ts'), "import { defineConfig } from 'vitest/config'; export default defineConfig({ test: { include: ['tests/missing.test.ts'], passWithNoTests: true } });");

    expect(() => runFocusedChecks(cwd, { files: ['tests/one.test.ts'] }))
      .toThrow(/different file set than requested|Unable to verify focused Vitest file selection/);
  });

  it('runs an explicitly selected script subset without replacing full gate evidence', () => {
    startProgress(cwd, buildPlan(cwd, 'quality'));
    runChecks(cwd, () => true);
    const fullEvidence = readProgress(cwd)!.lastCheck;
    const calls: string[] = [];

    const result = runFocusedChecks(cwd, { scripts: ['lint'] }, (_cwd, _pm, script, args) => {
      calls.push(`${script}:${args.length}`);
      return true;
    });

    expect(calls).toEqual(['lint:0']);
    expect(result).toMatchObject({ ok: true, checkpointEligible: false, scope: { kind: 'scripts', scripts: ['lint'] } });
    expect(readProgress(cwd)!.lastCheck).toEqual(fullEvidence);
  });
});
