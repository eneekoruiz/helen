import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSafe } from './fs.js';

/**
 * Skills are folders containing a SKILL.md. Known targets map an agent to the
 * project-relative directory it scans; any other agent uses the generic
 * `custom` target with an explicit directory.
 */
export const SKILL_TARGETS = {
  claude: '.claude/skills',
  codex: '.agents/skills',
} as const;

export type SkillTarget = keyof typeof SKILL_TARGETS | 'custom';

export interface SkillInfo {
  name: string;
  dir: string;
}

export interface InstallSkillsOptions {
  cwd: string;
  targets: SkillTarget[];
  /** Project-relative directory for the `custom` target. */
  customDir?: string;
  skills?: string[];
  dryRun?: boolean;
  force?: boolean;
}

export interface InstallSkillsResult {
  created: string[];
  overwritten: string[];
  skipped: string[];
}

const SKILLS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');

export function getSkillsRoot(): string {
  return SKILLS_ROOT;
}

export function listSkills(root: string = SKILLS_ROOT): SkillInfo[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'SKILL.md')))
    .map(entry => ({ name: entry.name, dir: path.join(root, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

export function resolveTargetDir(target: SkillTarget, customDir?: string): string {
  if (target !== 'custom') return SKILL_TARGETS[target];
  if (!customDir) {
    throw new Error('The "custom" target requires --dir <project-relative directory>.');
  }
  const normalized = path.normalize(customDir);
  if (path.isAbsolute(normalized) || normalized.split(path.sep).includes('..')) {
    throw new Error(`--dir must be a relative path inside the project: ${customDir}`);
  }
  return normalized;
}

export function installSkills(options: InstallSkillsOptions, root: string = SKILLS_ROOT): InstallSkillsResult {
  const available = listSkills(root);
  const selected = options.skills?.length
    ? options.skills.map(name => {
        const found = available.find(skill => skill.name === name);
        if (!found) throw new Error(`Skill "${name}" not found. Available: ${available.map(s => s.name).join(', ') || 'none'}`);
        return found;
      })
    : available;

  const result: InstallSkillsResult = { created: [], overwritten: [], skipped: [] };

  for (const target of new Set(options.targets)) {
    const targetDir = resolveTargetDir(target, options.customDir);
    for (const skill of selected) {
      for (const source of walkFiles(skill.dir)) {
        const relative = path.relative(skill.dir, source);
        const destination = path.join(options.cwd, targetDir, skill.name, relative);
        const outcome = writeFileSafe(destination, fs.readFileSync(source, 'utf-8'), {
          dryRun: options.dryRun,
          force: options.force,
        });
        result[outcome].push(path.relative(options.cwd, destination));
      }
    }
  }

  return result;
}
