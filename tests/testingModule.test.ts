import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { detectProject } from '../src/core/projectDetector.js';
import { runModule } from '../src/core/moduleRunner.js';
import type { HelenContext } from '../src/core/context.js';

describe('testing module', () => {
  let fixtureDir: string | undefined;

  afterEach(() => {
    if (!fixtureDir) return;

    const tempRoot = path.resolve(os.tmpdir());
    const fixtureRoot = path.resolve(fixtureDir);
    if (!fixtureRoot.toLowerCase().startsWith(`${tempRoot.toLowerCase()}${path.sep}`)) {
      throw new Error(`Refusing to clean test fixture outside the temp directory: ${fixtureRoot}`);
    }

    // The fixture has a junction to the repo's Vitest package. Remove the link
    // first so recursive cleanup cannot touch the shared node_modules tree.
    const vitestLink = path.join(fixtureDir, 'node_modules', 'vitest');
    try { fs.unlinkSync(vitestLink); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = undefined;
  });

  it('runs generated TSX tests with Vitest and no Vite React plugin installed', async () => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-testing-module-'));
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'testing-fixture', type: 'module' }));
    const tsconfigPath = path.join(fixtureDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { jsx: 'react-jsx', moduleResolution: 'bundler' } }));

    const ctx: HelenContext = {
      cwd: fixtureDir,
      project: detectProject(fixtureDir),
      dryRun: false,
      force: false,
    };
    await runModule('testing', ctx);
    const configPath = path.join(fixtureDir, 'vitest.config.ts');
    const generatedConfig = fs.readFileSync(configPath, 'utf8');
    expect(generatedConfig).toContain("environment: 'jsdom'");
    expect(generatedConfig).not.toContain('@vitejs/plugin-react');
    expect(generatedConfig).toContain("runtime: 'automatic'");
    expect(generatedConfig).toContain("importSource: 'react'");
    expect(generatedConfig).toContain("jsxImportSource: 'react'");

    // This repo intentionally does not install jsdom. Keep the generated setup
    // logic, but provide its browser global and run the same config in Node for
    // this isolated transform regression.
    fs.writeFileSync(path.join(fixtureDir, 'src/test/setup.ts'), `globalThis.window = {};\n${fs.readFileSync(path.join(fixtureDir, 'src/test/setup.ts'), 'utf8')}`);
    fs.writeFileSync(configPath, generatedConfig.replace("environment: 'jsdom'", "environment: 'node'"));

    // Link only the installed test runner. Project-only imports are supplied as
    // tiny local stubs, demonstrating that the generated setup has no hidden
    // dependency on the host's project packages.
    fs.mkdirSync(path.join(fixtureDir, 'node_modules'), { recursive: true });
    const vitestLink = path.join(fixtureDir, 'node_modules', 'vitest');
    fs.symlinkSync(path.resolve('node_modules/vitest'), vitestLink, 'junction');
    fs.mkdirSync(path.join(fixtureDir, 'node_modules', '@testing-library', 'jest-dom'), { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'node_modules', '@testing-library', 'jest-dom', 'package.json'), JSON.stringify({ name: '@testing-library/jest-dom', type: 'module', exports: './index.js' }));
    fs.writeFileSync(path.join(fixtureDir, 'node_modules', '@testing-library', 'jest-dom', 'index.js'), '');
    fs.mkdirSync(path.join(fixtureDir, 'node_modules', 'react'), { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'node_modules', 'react', 'package.json'), JSON.stringify({ name: 'react', type: 'module', exports: { './jsx-runtime': './jsx-runtime.js', './jsx-dev-runtime': './jsx-dev-runtime.js' } }));
    fs.writeFileSync(path.join(fixtureDir, 'node_modules', 'react', 'jsx-runtime.js'), `
export const Fragment = Symbol.for('fixture.fragment');
export const jsx = (type, props, key = null) => ({ type, key, props });
export const jsxs = jsx;
`);
    fs.writeFileSync(path.join(fixtureDir, 'node_modules', 'react', 'jsx-dev-runtime.js'), `
export { Fragment, jsx as jsxDEV } from './jsx-runtime.js';
`);
    fs.writeFileSync(path.join(fixtureDir, 'src/test/Greeting.tsx'), `export function Greeting() { return <span>works</span>; }\n`);
    fs.writeFileSync(path.join(fixtureDir, 'src/test/generated.test.tsx'), `
import { describe, expect, it } from 'vitest';
import { Greeting } from './Greeting.js';

describe('generated Vitest config', () => {
  it('transforms React TSX without @vitejs/plugin-react', () => {
    expect(Greeting()).toEqual({ type: 'span', key: null, props: { children: 'works' } });
  });
});
`);

    const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'package.json'), 'utf8')) as { devDependencies?: Record<string, string> };
    expect(manifest.devDependencies?.['@vitejs/plugin-react']).toBeUndefined();

    const vitestCli = path.resolve('node_modules/vitest/vitest.mjs');
    for (const jsx of ['react-jsx', 'preserve'] as const) {
      fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { jsx, moduleResolution: 'bundler' } }));
      const run = spawnSync(process.execPath, [vitestCli, 'run', '--config', 'vitest.config.ts', '--environment', 'node'], {
        cwd: fixtureDir,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 45_000,
      });

      expect(run.status, `jsx=${jsx}\n${run.stdout}\n${run.stderr}`).toBe(0);
    }
  }, 60_000);
});
