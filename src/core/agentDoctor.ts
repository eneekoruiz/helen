import fs from 'node:fs';
import path from 'node:path';
import { writeFileSafe } from './fs.js';
import type { DoctorCheck } from './doctor.js';
import { readProgress, currentIndex } from './progress.js';
import { BLOCK_END, BLOCK_START, helenBlock, upsertBlock } from './setup.js';
import { SKILL_TARGETS, listFlowSkills, listSkills, type SkillInfo } from './skills.js';

/** Project-level MCP configuration files of common agents. */
export const MCP_CONFIG_FILES = ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', '.codex/config.toml', '.gemini/settings.json', '.agent/mcp_config.json'];

const SECRET_KEY = /(token|secret|password|api[_-]?key|authorization)/i;

function skillDirs(cwd: string): string[] {
  return [...new Set([...Object.values(SKILL_TARGETS), '.agent/skills'])].filter(dir => fs.existsSync(path.join(cwd, dir)));
}

function bundledFiles(skill: SkillInfo): Record<string, string> {
  if (skill.files) return skill.files;
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  return Object.fromEntries(walk(skill.dir!).map(file => [path.relative(skill.dir!, file), fs.readFileSync(file, 'utf-8')]));
}

export interface InstalledSkill {
  dir: string;
  name: string;
  outdated: boolean;
}

/** HELEN skills (bundled and flow skills) installed in the project, and whether they differ from this HELEN version. */
export function installedHelenSkills(cwd: string): InstalledSkill[] {
  const bundled = new Map([...listSkills(), ...listFlowSkills()].map(skill => [skill.name, skill]));
  const found: InstalledSkill[] = [];
  for (const dir of skillDirs(cwd)) {
    for (const entry of fs.readdirSync(path.join(cwd, dir), { withFileTypes: true })) {
      const skill = bundled.get(entry.name);
      if (!entry.isDirectory() || !skill) continue;
      const outdated = Object.entries(bundledFiles(skill)).some(([rel, content]) => {
        const file = path.join(cwd, dir, entry.name, rel);
        return !fs.existsSync(file) || fs.readFileSync(file, 'utf-8') !== content;
      });
      found.push({ dir, name: entry.name, outdated });
    }
  }
  return found;
}

/** Literal-looking secrets in MCP config files (values not taken from the environment). */
export function findInlineSecrets(content: string): string[] {
  const hits: string[] = [];
  const pattern = /["']?([A-Za-z0-9_-]+)["']?\s*[:=]\s*["']([^"'\n]{12,})["']/g;
  for (const match of content.matchAll(pattern)) {
    const [, key, value] = match as unknown as [string, string, string];
    if (!SECRET_KEY.test(key)) continue;
    if (/^\$\{|^\$[A-Z_]|^env:|^<|^your[-_ ]/i.test(value) || /input:/i.test(value)) continue;
    hits.push(key);
  }
  return hits;
}

function isIgnored(cwd: string, entry: string): boolean {
  const file = path.join(cwd, '.gitignore');
  if (!fs.existsSync(file)) return false;
  return fs.readFileSync(file, 'utf-8').split(/\r?\n/).some(line => line.trim().replace(/\/$/, '') === entry.replace(/\/$/, ''));
}

export function runAgentDoctor(cwd: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const installed = installedHelenSkills(cwd);

  checks.push(
    installed.length === 0
      ? { label: 'HELEN skills', status: 'warn', message: 'None installed. Run: helen setup' }
      : { label: 'HELEN skills', status: 'ok', message: `${new Set(installed.map(skill => skill.name)).size} installed in ${[...new Set(installed.map(skill => skill.dir))].join(', ')}` },
  );
  if (installed.length > 0 && !installed.some(skill => skill.name === 'helen-apply')) {
    checks.push({ label: 'Entry skill', status: 'warn', message: 'helen-apply is missing. Run: helen setup' });
  }
  const outdated = installed.filter(skill => skill.outdated);
  if (outdated.length > 0) {
    checks.push({ label: 'Skill versions', status: 'warn', message: `${outdated.length} differ from this HELEN version. Run: helen skills update` });
  }

  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const target = path.join(cwd, file);
    if (!fs.existsSync(target)) {
      if (file === 'AGENTS.md') checks.push({ label: file, status: 'warn', message: 'Missing: agents do not know about HELEN. Run: helen setup' });
      continue;
    }
    const content = fs.readFileSync(target, 'utf-8');
    if (!content.includes(BLOCK_START)) checks.push({ label: file, status: 'warn', message: 'No HELEN block. Run: helen setup' });
    else if (!content.includes(helenBlock())) checks.push({ label: file, status: 'warn', message: 'HELEN block is outdated. Run: helen skills update' });
    else checks.push({ label: file, status: 'ok', message: 'HELEN block current' });
  }

  if (fs.existsSync(path.join(cwd, '.helen'))) {
    try {
      const progress = readProgress(cwd);
      if (progress) {
        const index = currentIndex(progress);
        checks.push({
          label: 'Tracked plan',
          status: 'ok',
          message: index === -1 ? `"${progress.goal}" finished` : `"${progress.goal}" at step ${index + 1}/${progress.steps.length}. Continue: helen next`,
        });
      }
    } catch (err) {
      checks.push({ label: 'Tracked plan', status: 'error', message: `${err instanceof Error ? err.message : String(err)}. Restore .helen/progress.json from a valid backup.` });
    }
    if (!isIgnored(cwd, '.helen')) checks.push({ label: '.gitignore', status: 'warn', message: '.helen/ (local progress) is not ignored' });
  }

  for (const file of MCP_CONFIG_FILES) {
    const target = path.join(cwd, file);
    if (!fs.existsSync(target)) continue;
    const secrets = findInlineSecrets(fs.readFileSync(target, 'utf-8'));
    checks.push(
      secrets.length > 0
        ? { label: `MCP config ${file}`, status: 'error', message: `Possible inline secret in: ${secrets.join(', ')}. Use environment variables and keep this file out of git.` }
        : { label: `MCP config ${file}`, status: 'ok', message: 'Found, no inline secrets detected. Review permissions with audit-third-party-tools-and-mcp' },
    );
  }

  return checks;
}

export interface UpdateResult {
  skills: string[];
  instructionFiles: string[];
}

/** Refresh installed HELEN skills and managed instruction blocks to this HELEN version. Files are backed up before overwrite. */
export function updateAgentSetup(cwd: string, dryRun = false): UpdateResult {
  const bundled = new Map([...listSkills(), ...listFlowSkills()].map(skill => [skill.name, skill]));
  const result: UpdateResult = { skills: [], instructionFiles: [] };

  for (const skill of installedHelenSkills(cwd).filter(item => item.outdated)) {
    for (const [rel, content] of Object.entries(bundledFiles(bundled.get(skill.name)!))) {
      const target = path.join(cwd, skill.dir, skill.name, rel);
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf-8') === content) continue;
      writeFileSafe(target, content, { dryRun, force: true });
    }
    result.skills.push(`${skill.dir}/${skill.name}`);
  }

  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const target = path.join(cwd, file);
    if (!fs.existsSync(target)) continue;
    const content = fs.readFileSync(target, 'utf-8');
    if (!content.includes(BLOCK_START) || !content.includes(BLOCK_END) || content.includes(helenBlock())) continue;
    writeFileSafe(target, upsertBlock(content, helenBlock()), { dryRun, force: true });
    result.instructionFiles.push(file);
  }
  return result;
}
