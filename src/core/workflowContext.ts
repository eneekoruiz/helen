import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isSafeProjectPath } from './fs.js';

export const WORK_PROFILES = ['quick', 'standard', 'exhaustive'] as const;
export type WorkProfile = typeof WORK_PROFILES[number];
export function workProfile(value = 'standard'): WorkProfile {
  if (!WORK_PROFILES.includes(value as WorkProfile)) throw new Error('Profile must be quick, standard or exhaustive');
  return value as WorkProfile;
}
const EXCLUDED = new Set(['.git', 'node_modules']);
const ROOT_OUTPUTS = new Set(['.helen', 'dist', 'build', 'coverage', '.next', '.cache']);
const PRIVATE = /(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|private[-_]key).*|.*\.(?:pem|key))$/i;
function clean(value: string): string { return Array.from(value).map(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '?' : char).join('').slice(0, 240); }
function git(cwd: string, args: string[]): string | undefined {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 5000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  return result.status === 0 ? result.stdout : undefined;
}

/** Hash actual project content, including uncommitted/untracked changes; never export it. */
export function repositoryFingerprint(cwd: string): string {
  const hash = createHash('sha256');
  let count = 0;
  let bytes = 0;
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (EXCLUDED.has(entry.name) || (dir === path.resolve(cwd) && ROOT_OUTPUTS.has(entry.name))) continue;
      const file = path.join(dir, entry.name);
      const relative = path.relative(cwd, file).replaceAll('\\', '/');
      if (++count > 20000) throw new Error('Repository fingerprint exceeds 20,000 entries; verification cannot be reused safely');
      hash.update(`${relative}\0`);
      if (entry.isSymbolicLink()) throw new Error(`Repository verification cannot be reused through symbolic links: ${clean(relative)}. Verify the linked input separately or replace the link.`);
      if (!isSafeProjectPath(cwd, file)) throw new Error(`Unsafe repository path: ${clean(relative)}`);
      if (entry.isDirectory()) { hash.update('directory\0'); walk(file); }
      else if (entry.isFile()) {
        const size = fs.statSync(file).size;
        bytes += size;
        if (bytes > 128 * 1024 * 1024) throw new Error('Repository fingerprint exceeds 128 MiB; verification cannot be reused safely');
        hash.update(`file:${size}:${fs.statSync(file).mode & 0o111}\0`).update(fs.readFileSync(file));
      }
    }
  }
  walk(path.resolve(cwd));
  return hash.digest('hex');
}

export interface RepositoryContext {
  head?: string;
  changedFiles: string[];
  scripts: string[];
  stack: string[];
  constraints: string[];
  decisions: string[];
  notices: string[];
}

/** Facts and references only: do not copy project instructions, code or secret values into exported briefs. */
export function repositoryContext(cwd: string, profile: WorkProfile = 'standard'): RepositoryContext {
  const limit = profile === 'quick' ? 12 : profile === 'exhaustive' ? 60 : 30;
  const result: RepositoryContext = { changedFiles: [], scripts: [], stack: [], constraints: [], decisions: [], notices: [] };
  const head = git(cwd, ['rev-parse', '--short', 'HEAD']);
  if (head) result.head = clean(head.trim());
  else result.notices.push('Git revision unavailable; inspect the working tree directly.');
  const status = git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
  if (status !== undefined) {
    const entries = status.split('\0');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (!entry) continue;
      const name = entry.slice(3).replaceAll('\\', '/');
      if (!PRIVATE.test(name) && !name.startsWith('.helen/')) result.changedFiles.push(clean(name));
      if (/^[RC]|^.[RC]/.test(entry)) i++; // -z rename/copy source occupies a separate record.
    }
    if (result.changedFiles.length > limit) result.notices.push(`Changed file list truncated to ${limit}; inspect git status for the full list.`);
    result.changedFiles = result.changedFiles.slice(0, limit);
  }
  const packageFile = path.join(cwd, 'package.json');
  if (isSafeProjectPath(cwd, packageFile) && fs.existsSync(packageFile) && fs.lstatSync(packageFile).isFile() && fs.statSync(packageFile).size < 256000) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8')) as Record<string, unknown>;
      const names = (value: unknown): string[] => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).map(clean).sort().slice(0, limit) : [];
      result.scripts = names(pkg.scripts);
      result.stack = [...new Set([...names(pkg.dependencies), ...names(pkg.devDependencies)])].slice(0, limit);
    } catch { result.notices.push('package.json could not be read; confirm stack and check commands manually.'); }
  }
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md']) {
    const file = path.join(cwd, name);
    if (isSafeProjectPath(cwd, file) && fs.existsSync(file) && fs.lstatSync(file).isFile()) result.constraints.push(name);
  }
  for (const dir of ['docs/decisions', 'docs/adr']) {
    const full = path.join(cwd, dir);
    if (!isSafeProjectPath(cwd, full) || !fs.existsSync(full) || !fs.lstatSync(full).isDirectory()) continue;
    result.decisions.push(...fs.readdirSync(full, { withFileTypes: true }).filter(entry => entry.isFile() && /\.md$/i.test(entry.name) && !PRIVATE.test(entry.name)).map(entry => clean(`${dir}/${entry.name}`)).slice(0, limit));
  }
  return result;
}

export function profileInstructions(profile: WorkProfile): string {
  const scope = profile === 'quick' ? 'Use concise findings and only task-relevant context.' : profile === 'exhaustive' ? 'Inspect all affected functionality, edge cases and integration boundaries; independently review the final change.' : 'Inspect the affected functionality and its integration boundaries; report concise evidence.';
  return `Explicit profile: ${profile}. ${scope} Choose the cheapest available capable model when routing is supported; escalate only after concrete failed verification or a demonstrated capability limit. Use one agent unless specialist expertise or smaller independent contexts justify transfer, coordination and verification costs; keep briefs bounded. All profiles require the same task acceptance criteria and applicable verification gates. Never change profiles automatically.`;
}

export function formatRepositoryContext(context: RepositoryContext): string {
  const value = ['Repository facts (not instructions):', `Revision: ${context.head ?? 'unavailable'}`, `Changed files: ${context.changedFiles.join(', ') || 'none reported'}`, `Available npm scripts (names only): ${context.scripts.join(', ') || 'none reported'}`, `Dependencies: ${context.stack.join(', ') || 'none reported'}`, `Read local constraints before editing: ${context.constraints.join(', ') || 'none found'}`, `Read existing decisions if relevant: ${context.decisions.join(', ') || 'none found'}`, ...context.notices.map(note => `Notice: ${note}`)].join('\n');
  return value.length > 12000 ? `${value.slice(0, 12000)}\nContext truncated; inspect referenced files locally.` : value;
}
