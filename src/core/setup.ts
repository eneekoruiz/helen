import fs from 'node:fs';
import path from 'node:path';
import { writeFileSafe } from './fs.js';
import { installSkills, type InstallSkillsResult, type SkillTarget } from './skills.js';

export const BLOCK_START = '<!-- HELEN:START (managed by helen setup, edit outside this block) -->';
export const BLOCK_END = '<!-- HELEN:END -->';

export type SetupAgent = 'claude' | 'codex' | 'antigravity';

export interface SetupOptions {
  cwd: string;
  agents: SetupAgent[];
  flows?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface SetupResult {
  skills: InstallSkillsResult;
  instructionFiles: string[];
}

/** Instructions any agent reads from AGENTS.md / CLAUDE.md. Kept short: it is loaded every session. */
export function helenBlock(): string {
  return [
    BLOCK_START,
    '## HELEN',
    '',
    'This project uses HELEN (prompts, skills and a tools catalog).',
    '',
    '- When asked to "use HELEN", or where the project stands, or what to do next: use the `helen-apply` skill, or run `helen apply`.',
    '- To work an area ("apply all the design improvements", "prepare the release"): `helen apply <goal>` prints the steps; `helen apply <goal> --track` follows them one by one with `helen next`, `helen done`, `helen check`.',
    '- Prompts: `helen prompts list`, `helen prompts show <id>`. Skills live in `.claude/skills` and `.agents/skills`. Guide: `helen guide`.',
    '- Never install an external tool or plugin without showing its commands (`helen skills external <id>`) and getting explicit approval. Use at most one main design skill.',
    '- Never invent content, testimonials, metrics, logos or claims. Stop if a checkpoint fails.',
    BLOCK_END,
  ].join('\n');
}

/** Insert or replace the managed block, keeping everything else in the file. */
export function upsertBlock(existing: string | null, block: string): string {
  if (existing === null || existing.trim() === '') return `${block}\n`;
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    return `${existing.slice(0, start)}${block}${existing.slice(end + BLOCK_END.length)}`;
  }
  return `${existing.replace(/\s*$/, '')}\n\n${block}\n`;
}

export function setupProject(options: SetupOptions): SetupResult {
  const skills = installSkills({
    cwd: options.cwd,
    targets: options.agents as SkillTarget[],
    flows: options.flows,
    dryRun: options.dryRun,
    force: options.force,
  });

  const instructionFiles = ['AGENTS.md'];
  if (options.agents.includes('claude')) instructionFiles.push('CLAUDE.md');

  for (const file of instructionFiles) {
    const target = path.join(options.cwd, file);
    const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : null;
    // force: the managed block is always safe to refresh; the rest of the file is preserved.
    writeFileSafe(target, upsertBlock(existing, helenBlock()), { dryRun: options.dryRun, force: true });
  }

  return { skills, instructionFiles };
}
