import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { recordOwnedSkillFiles, removeOwnedSkillFiles, validateSkillOwnership } from '../src/core/skillOwnership.js';

const roots: string[] = [];
function project(): string {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-owned-skills-'));
  roots.push(cwd);
  return cwd;
}
function put(cwd: string, relative: string, content: string): void {
  const target = path.join(cwd, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('skill ownership manifest', () => {
  it('removes only unchanged recorded files and keeps user files and shared parents', () => {
    const cwd = project();
    const generated = '.agents/skills/helen-demo/SKILL.md';
    put(cwd, generated, 'generated');
    put(cwd, '.agents/skills/helen-demo/custom.md', 'user file');
    put(cwd, '.agents/skills/custom-skill/SKILL.md', 'unowned skill');
    recordOwnedSkillFiles(cwd, { [generated]: 'generated' });

    expect(removeOwnedSkillFiles(cwd)).toEqual({ removed: [generated], preserved: [] });
    expect(fs.existsSync(path.join(cwd, generated))).toBe(false);
    expect(fs.existsSync(path.join(cwd, '.agents/skills/helen-demo/custom.md'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.agents/skills/custom-skill/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.agents/skills'))).toBe(true);
    expect(removeOwnedSkillFiles(cwd)).toEqual({ removed: [], preserved: [] });
  });

  it('preserves edited owned files and unknown files without deleting the skill directory', () => {
    const cwd = project();
    const generated = '.claude/skills/helen-demo/SKILL.md';
    put(cwd, generated, 'generated');
    put(cwd, '.claude/skills/helen-demo/notes.md', 'unknown');
    recordOwnedSkillFiles(cwd, { [generated]: 'generated' });
    fs.writeFileSync(path.join(cwd, generated), 'user edit');

    expect(removeOwnedSkillFiles(cwd)).toEqual({ removed: [], preserved: [generated] });
    expect(fs.readFileSync(path.join(cwd, generated), 'utf8')).toBe('user edit');
    expect(fs.existsSync(path.join(cwd, '.claude/skills/helen-demo/notes.md'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.helen/skill-files.json'))).toBe(true);
  });

  it('dry runs neither create metadata nor mutate files', () => {
    const cwd = project();
    const generated = '.agents/skills/helen-demo/SKILL.md';
    put(cwd, generated, 'generated');
    recordOwnedSkillFiles(cwd, { [generated]: 'generated' }, true);
    expect(fs.existsSync(path.join(cwd, '.helen'))).toBe(false);
    expect(fs.existsSync(path.join(cwd, '.gitignore'))).toBe(false);

    recordOwnedSkillFiles(cwd, { [generated]: 'generated' });
    expect(removeOwnedSkillFiles(cwd, true)).toEqual({ removed: [generated], preserved: [] });
    expect(fs.existsSync(path.join(cwd, generated))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.helen/skill-files.json'))).toBe(true);
  });

  it('returns the dry-run removal plan without changing owned files or the manifest', () => {
    const cwd = project();
    const generated = '.agents/skills/helen-demo/SKILL.md';
    put(cwd, generated, 'generated');
    recordOwnedSkillFiles(cwd, { [generated]: 'generated' });
    const manifest = fs.readFileSync(path.join(cwd, '.helen/skill-files.json'), 'utf8');
    expect(removeOwnedSkillFiles(cwd, true)).toEqual({ removed: [generated], preserved: [] });
    expect(fs.readFileSync(path.join(cwd, generated), 'utf8')).toBe('generated');
    expect(fs.readFileSync(path.join(cwd, '.helen/skill-files.json'), 'utf8')).toBe(manifest);
  });

  it('ignores .helen exactly once and preserves existing gitignore content', () => {
    const cwd = project();
    put(cwd, '.agents/skills/helen-demo/SKILL.md', 'generated');
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules/\n');
    recordOwnedSkillFiles(cwd, { '.agents/skills/helen-demo/SKILL.md': 'generated' });
    recordOwnedSkillFiles(cwd, { '.agents/skills/helen-demo/SKILL.md': 'generated' });
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules/\n.helen/\n');
  });

  it.each(['../outside.txt', '.helen/secret', '.agents/skills/user-owned/SKILL.md', 'helen-personal.md'])('rejects unsafe/unowned path %s before writes', relative => {
    const cwd = project();
    expect(() => recordOwnedSkillFiles(cwd, { [relative]: 'data' })).toThrow();
    expect(fs.existsSync(path.join(cwd, '.helen'))).toBe(false);
    expect(fs.existsSync(path.join(cwd, '.gitignore'))).toBe(false);
  });

  it('rejects malformed and oversized manifests before deleting anything', () => {
    const cwd = project();
    const generated = '.agents/skills/helen-demo/SKILL.md';
    put(cwd, generated, 'generated');
    fs.mkdirSync(path.join(cwd, '.helen'));
    fs.writeFileSync(path.join(cwd, '.helen/skill-files.json'), '{bad');
    expect(() => removeOwnedSkillFiles(cwd)).toThrow(/malformed/);
    expect(() => validateSkillOwnership(cwd)).toThrow(/malformed/);
    expect(fs.existsSync(path.join(cwd, generated))).toBe(true);
    fs.writeFileSync(path.join(cwd, '.helen/skill-files.json'), ' '.repeat(256 * 1024 + 1));
    expect(() => removeOwnedSkillFiles(cwd)).toThrow(/256 KiB/);
    expect(fs.existsSync(path.join(cwd, generated))).toBe(true);
  });

  it('rejects traversal records and symlinked skill paths without touching their targets', () => {
    const cwd = project();
    const outside = path.join(cwd, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'keep.md'), 'keep');
    const skillRoot = path.join(cwd, '.agents/skills/helen-demo');
    fs.mkdirSync(path.dirname(skillRoot), { recursive: true });
    fs.symlinkSync(outside, skillRoot, process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => recordOwnedSkillFiles(cwd, { '.agents/skills/helen-demo/keep.md': 'keep' })).toThrow(/Symlink/);
    expect(fs.readFileSync(path.join(outside, 'keep.md'), 'utf8')).toBe('keep');

    fs.unlinkSync(skillRoot);
    fs.mkdirSync(skillRoot, { recursive: true });
    put(cwd, '.agents/skills/helen-demo/keep.md', 'keep');
    fs.mkdirSync(path.join(cwd, '.helen'));
    fs.writeFileSync(path.join(cwd, '.helen/skill-files.json'), JSON.stringify({ version: 1, files: { '../outside/keep.md': 'a'.repeat(64) } }));
    expect(() => removeOwnedSkillFiles(cwd)).toThrow();
    expect(fs.readFileSync(path.join(outside, 'keep.md'), 'utf8')).toBe('keep');
  });

  it('rejects too many manifest entries before removal', () => {
    const cwd = project();
    const files: Record<string, string> = {};
    for (let index = 0; index < 2001; index++) files[`.agents/skills/helen-${index}/SKILL.md`] = 'a'.repeat(64);
    fs.mkdirSync(path.join(cwd, '.helen'));
    fs.writeFileSync(path.join(cwd, '.helen/skill-files.json'), JSON.stringify({ version: 1, files }));
    expect(() => removeOwnedSkillFiles(cwd)).toThrow(/2000 entries/);
  });
});
