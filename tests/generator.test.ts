import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateEntity } from '../src/core/generator.js';

describe('Entity generator', () => {
  let cwd: string;
  beforeEach(() => { cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-generator-')); });
  afterEach(() => { fs.rmSync(cwd, { recursive: true, force: true }); });

  it.each(['../../escape', 'bad-name', 'class', 'Injected\ncode', 'arguments', 'eval', 'package', 'private', 'protected', 'public', 'static'])('rejects unsafe or invalid names %s', async name => {
    await expect(generateEntity({ type: 'component', name, cwd })).rejects.toThrow('TypeScript identifier');
    expect(fs.readdirSync(cwd)).toEqual([]);
  });

  it('generates domain entities without allowing undefined partials to overwrite defaults', async () => {
    await generateEntity({ type: 'entity', name: 'Account', cwd });
    const code = fs.readFileSync(path.join(cwd, 'src/domain/entities/Account.ts'), 'utf8');
    expect(code).toContain('id: data.id ?? crypto.randomUUID()');
    expect(code).not.toContain('...data');
    expect(code).not.toContain('as Account');
  });

  it('generates pages without unused React imports', async () => {
    await generateEntity({ type: 'page', name: 'Profile', cwd });
    expect(fs.readFileSync(path.join(cwd, 'src/pages/Profile.tsx'), 'utf8')).not.toContain('import React');
  });
});
