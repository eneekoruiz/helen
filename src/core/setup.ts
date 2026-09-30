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
    '- Never install an external tool, plugin or MCP server without showing its commands (`helen skills external <id>`) and getting explicit approval. Use at most one main design skill. Prefer read-only, least-privilege, development-environment MCP connections.',
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

/** Install hierarchical rules in .agents/rules for Antigravity and Codex. */
export function installAntigravityRules(cwd: string, dryRun = false): string[] {
  const rulesDir = path.join(cwd, '.agents', 'rules');
  const created: string[] = [];

  const rules = [
    {
      file: 'security.md',
      content: `# HELEN Security Rules\n- Never commit or print real secrets, tokens, private keys or passwords.\n- Always use environment variables (.env.local) and sanitized inputs.\n- Enforce strict CSP headers and validate external inputs.\n`,
    },
    {
      file: 'quality.md',
      content: `# HELEN Quality & Clean Code Rules\n- Maintain modular architecture and strict TypeScript types without any-casts.\n- Keep test suites green before completing checkpoints.\n- Never bypass git hooks (--no-verify is prohibited).\n`,
    },
    {
      file: 'design.md',
      content: `# HELEN Design System Rules\n- Maintain accessible contrast (WCAG AA/AAA) across all color themes.\n- Ensure responsive layouts across mobile, tablet, and desktop breakpoints.\n- Respect prefers-reduced-motion for all UI transitions and animations.\n`,
    },
  ];

  for (const { file, content } of rules) {
    const target = path.join(rulesDir, file);
    if (!fs.existsSync(target)) {
      writeFileSafe(target, content, { dryRun });
      created.push(`.agents/rules/${file}`);
    }
  }

  return created;
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

  if (options.agents.includes('antigravity') || options.agents.includes('codex')) {
    installAntigravityRules(options.cwd, options.dryRun);
  }

  return { skills, instructionFiles };
}
