import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSafe } from './fs.js';
import { listPromptEntries } from './prompts.js';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Skills are folders containing a SKILL.md. Known targets map an agent to the
 * project-relative directory it scans; any other agent uses the generic
 * `custom` target with an explicit directory.
 */
export const SKILL_TARGETS = {
  claude: '.claude/skills',
  codex: '.agents/skills',
  // Google's Antigravity codelab documents <project-root>/.agents/skills/ for workspace skills,
  // the same folder Codex reads. Older material mentions .agent/skills: use `custom --dir` for that.
  antigravity: '.agents/skills',
} as const;

export type SkillTarget = keyof typeof SKILL_TARGETS | 'custom';

export interface SkillInfo {
  name: string;
  /** Source directory for bundled skills; absent for generated ones. */
  dir?: string;
  /** In-memory files (relative path -> content) for generated skills. */
  files?: Record<string, string>;
}

export interface InstallSkillsOptions {
  cwd: string;
  targets: SkillTarget[];
  /** Project-relative directory for the `custom` target. */
  customDir?: string;
  skills?: string[];
  /** Also install executable prompt flows as `helen-flow-<id>` skills. */
  flows?: boolean;
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
    .map((entry): SkillInfo => ({ name: entry.name, dir: path.join(root, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}


function firstMatch(content: string, pattern: RegExp): string | undefined {
  return pattern.exec(content)?.[1]?.replace(/\s+/g, ' ').trim();
}

/**
 * Turns each executable prompt flow into a skill so agents can invoke it by
 * name. The flow body is embedded; its step links are rewritten to
 * `helen prompts show <id>` hints so the skill stays self-contained.
 */
export function listFlowSkills(): SkillInfo[] {
  return listPromptEntries()
    .filter(entry => entry.kind === 'flow')
    .map((entry): SkillInfo => {
      const raw = fs.readFileSync(entry.absolutePath, 'utf-8');
      const body = raw
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '')
        .replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (_match, label: string, target: string) => {
          const stem = decodeURIComponent(target).split('/').at(-1)!.replace(/\.md$/i, '').toLowerCase();
          return `${label} (\`helen prompts show ${stem}\`)`;
        });
      const objective = entry.summary || firstMatch(body, /## Goal\s+([^\n]+(?:\n(?!#)[^\n]+)*)/) || entry.title;
      const slug = entry.id.split('/').at(-1)!.replace(/^(apply|audit|generate|plan|research|init|enhance)-/, '').replace(/-flow$/, '');
      const name = `helen-flow-${slug}`;
      const description = `Use to run the HELEN "${slug}" flow. ${objective}`.replace(/\s+/g, ' ').slice(0, 500);
      const skill = `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n` +
        `> Steps referenced below are prompts in the HELEN library. Print any of them with \`helen prompts show <id>\` (list ids with \`helen prompts list\`).\n\n${body}`;
      return { name, files: { 'SKILL.md': skill } };
    });
}

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function skillFiles(skill: SkillInfo): Record<string, string> {
  if (skill.files) return skill.files;
  const dir = skill.dir!;
  return Object.fromEntries(walkFiles(dir).map(file => [path.relative(dir, file), fs.readFileSync(file, 'utf-8')]));
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
  const available = [...listSkills(root), ...(options.flows ? listFlowSkills() : [])];
  const selected = options.skills?.length
    ? options.skills.map(name => {
        const found = available.find(skill => skill.name === name);
        if (!found) throw new Error(`Skill "${name}" not found. Available: ${available.map(s => s.name).join(', ') || 'none'}`);
        return found;
      })
    : available;

  const result: InstallSkillsResult = { created: [], overwritten: [], skipped: [] };

  // Several agents can share a folder (codex and antigravity): write each folder once.
  const targetDirs = new Set(options.targets.map(target => resolveTargetDir(target, options.customDir)));

  for (const targetDir of targetDirs) {
    for (const skill of selected) {
      for (const [relative, content] of Object.entries(skillFiles(skill))) {
        const destination = path.join(options.cwd, targetDir, skill.name, relative);
        const outcome = writeFileSafe(destination, content, { dryRun: options.dryRun, force: options.force });
        result[outcome].push(path.relative(options.cwd, destination));
      }
    }
  }

  return result;
}

/** Structural checks for bundled skills: frontmatter, name, description length, size. */
export function validateSkills(root: string = SKILLS_ROOT): string[] {
  const issues: string[] = [];
  for (const skill of listSkills(root)) {
    const raw = fs.readFileSync(path.join(skill.dir!, 'SKILL.md'), 'utf-8');
    const { data, hasFrontmatter } = parseFrontmatter(raw);
    if (!hasFrontmatter || !data.name || !data.description) {
      issues.push(`${skill.name}: SKILL.md must start with name and description frontmatter`);
      continue;
    }
    const name = String(data.name);
    const desc = String(data.description);
    if (name !== skill.name) issues.push(`${skill.name}: name "${name}" does not match the folder`);
    if (desc.length > 1024) issues.push(`${skill.name}: description longer than 1024 characters`);
    if (desc.length < 80) issues.push(`${skill.name}: description too short to trigger reliably (under 80 characters)`);
    if (raw.replace(/\r\n/g, '\n').split('\n').length > 500) issues.push(`${skill.name}: SKILL.md longer than 500 lines; move detail to references/`);
  }
  return issues;
}
