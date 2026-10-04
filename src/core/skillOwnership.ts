import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { writeAtomicFile } from './operations.js';

const MANIFEST = '.helen/skill-files.json';
const MAX_BYTES = 256 * 1024;
const MAX_ENTRIES = 2000;
type Ownership = Record<string, string>;

function digest(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function validateRelative(relative: string): string {
  if (typeof relative !== 'string' || !relative || relative.includes('\0') || relative.includes('\\') || path.posix.isAbsolute(relative)) {
    throw new Error(`Invalid owned skill path: ${String(relative)}`);
  }
  const parts = relative.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part === '.helen') || !parts.slice(0, -1).some(part => part.startsWith('helen-'))) {
    throw new Error(`Invalid owned skill path: ${relative}`);
  }
  if (path.posix.normalize(relative) !== relative) throw new Error(`Non-normalized owned skill path: ${relative}`);
  return relative;
}

function safePath(cwd: string, relative: string, allowMissingLeaf = true): string {
  validateRelative(relative);
  const root = path.resolve(cwd);
  const target = path.resolve(root, ...relative.split('/'));
  const rel = path.relative(root, target);
  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`)) throw new Error(`Owned skill path escapes project: ${relative}`);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error(`Symlink in owned skill path: ${relative}`);
      if (current === target && !stat.isFile()) throw new Error(`Owned skill path is not a regular file: ${relative}`);
      if (current !== target && !stat.isDirectory()) throw new Error(`Non-directory in owned skill path: ${relative}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (current === target && !allowMissingLeaf) throw new Error(`Owned skill file is missing: ${relative}`);
    }
  }
  return target;
}

function readManifest(cwd: string): Ownership {
  const metadataDir = path.join(cwd, '.helen');
  try {
    const dirStat = fs.lstatSync(metadataDir);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) throw new Error('Skill ownership metadata directory must be a real directory.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const file = path.join(cwd, MANIFEST);
  let raw: Buffer;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Skill ownership manifest must be a regular file.');
    if (stat.size > MAX_BYTES) throw new Error('Skill ownership manifest exceeds 256 KiB.');
    raw = fs.readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  if (raw.byteLength > MAX_BYTES) throw new Error('Skill ownership manifest exceeds 256 KiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw.toString('utf8')); } catch { throw new Error('Skill ownership manifest is malformed JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Skill ownership manifest has an invalid schema.');
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1 || !record.files || typeof record.files !== 'object' || Array.isArray(record.files)) throw new Error('Skill ownership manifest has an unsupported schema.');
  const entries = Object.entries(record.files as Record<string, unknown>);
  if (entries.length > MAX_ENTRIES) throw new Error('Skill ownership manifest exceeds 2000 entries.');
  const result: Ownership = {};
  for (const [file, hash] of entries) {
    validateRelative(file);
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid hash for owned skill path: ${file}`);
    result[file] = hash;
  }
  return result;
}

function persist(cwd: string, files: Ownership): void {
  const content = `${JSON.stringify({ version: 1, files }, null, 2)}\n`;
  if (Buffer.byteLength(content) > MAX_BYTES) throw new Error('Skill ownership manifest exceeds 256 KiB.');
  const manifest = path.join(cwd, MANIFEST);
  const parent = path.dirname(manifest);
  for (const dir of [path.resolve(cwd), parent]) {
    if (dir !== path.resolve(cwd) && fs.existsSync(dir) && (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink())) {
      throw new Error('Unsafe skill ownership manifest directory.');
    }
  }
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
  if (fs.existsSync(manifest) && (!fs.lstatSync(manifest).isFile() || fs.lstatSync(manifest).isSymbolicLink())) throw new Error('Unsafe skill ownership manifest file.');
  writeAtomicFile(manifest, content);
}

export function recordOwnedSkillFiles(cwd: string, files: Record<string, string>, dryRun = false): void {
  const owned = readManifest(cwd);
  const updates: Array<[string, string, string]> = Object.entries(files).map(([relative, content]) => {
    if (typeof content !== 'string') throw new Error(`Skill content must be text: ${relative}`);
    const target = safePath(cwd, relative, dryRun);
    return [relative, content, target];
  });
  if (updates.length === 0 || dryRun) return;
  for (const [relative, content, target] of updates) {
    if (!fs.existsSync(target) || !fs.lstatSync(target).isFile()) throw new Error(`Successfully written skill file is missing: ${relative}`);
    owned[relative] = digest(content);
  }
  if (Object.keys(owned).length > MAX_ENTRIES) throw new Error('Skill ownership manifest exceeds 2000 entries.');
  const serialized = `${JSON.stringify({ version: 1, files: owned }, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_BYTES) throw new Error('Skill ownership manifest exceeds 256 KiB.');
  validateGitignore(cwd);
  ensureGitignore(cwd);
  persist(cwd, owned);
}

function validateGitignore(cwd: string): string {
  const file = path.join(cwd, '.gitignore');
  let current = '';
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Project .gitignore must be a regular file.');
    current = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return current;
}

function ensureGitignore(cwd: string): void {
  const file = path.join(cwd, '.gitignore');
  const current = validateGitignore(cwd);
  if (current.split(/\r?\n/).some(line => line.trim() === '.helen/')) return;
  const separator = current && !current.endsWith('\n') ? '\n' : '';
  writeAtomicFile(file, `${current}${separator}.helen/\n`);
}

export function removeOwnedSkillFiles(cwd: string, dryRun = false): { removed: string[]; preserved: string[] } {
  const owned = readManifest(cwd);
  const removed: string[] = [];
  const preserved: string[] = [];
  const next = { ...owned };
  // Resolve and inspect every target before the first deletion so a later unsafe path
  // cannot leave a partially removed installation.
  const targets = Object.entries(owned).map(([relative, expected]) => ({
    relative, expected, target: safePath(cwd, relative),
  }));
  for (const { relative, expected, target } of targets) {
    if (!fs.existsSync(target)) { delete next[relative]; continue; }
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || digest(fs.readFileSync(target)) !== expected) {
      preserved.push(relative);
      continue;
    }
    removed.push(relative);
    delete next[relative];
    if (!dryRun) {
      fs.unlinkSync(target);
      removeEmptySkillDirs(cwd, path.dirname(target));
    }
  }
  if (!dryRun && Object.keys(next).length !== Object.keys(owned).length) persist(cwd, next);
  return { removed, preserved };
}

function removeEmptySkillDirs(cwd: string, start: string): void {
  const root = path.resolve(cwd);
  let current = start;
  while (current !== root) {
    const relative = path.relative(root, current).split(path.sep).join('/');
    if (!relative || relative === '.helen' || relative.startsWith('.helen/')) break;
    try {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(current).length !== 0) break;
      fs.rmdirSync(current);
    } catch { break; }
    // Never remove the shared agent skills root or any project parent.
    if (path.basename(current).startsWith('helen-')) break;
    current = path.dirname(current);
  }
}

export function validateSkillOwnership(cwd: string): void {
  const owned = readManifest(cwd);
  for (const relative of Object.keys(owned)) safePath(cwd, relative);
  validateGitignore(cwd);
}
