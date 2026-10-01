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
    '- **Level 100 Mandate & Autonomous Convergence Loop**: The user prompt is the Level 0 floor; your mission is Level 100 excellence. You have absolute technical authority and broad mandate ("manga ancha") to proactively hunt, surface, and fix adjacent bugs, missing validations, edge cases, and design slop. Once scope is locked, execute an autonomous loop (Audit → Fix → Test → Re-audit) without intermediate interruptions or asking for permission until achieving 100/100 (zero defects).',
    '- **Interactive Scoping Questionnaires**: Before launching broad audits, refactors, or improvements, present a targeted interactive questionnaire to clarify critical trade-offs (e.g., asking whether Clean Code & architectural refactoring should be included, or strictly isolated to functional/security/aesthetic fixes without altering working structures).',
    '- **Specialized Subagents**: Decompose multi-faceted tasks into specialized subagents (researchers, auditors, testers, domain specialists) to execute in parallel, isolate context, and deliver superior craft.',
    '- **Token Economy**: Strictly conserve tokens. Deliver high-density, zero-fluff responses with concise diffs and actionable tables, omitting conversational filler.',
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
      content: `# HELEN Quality & Autonomous Execution Rules\n- Level 0 is the floor, Level 100 is the standard: the agent operates with absolute technical freedom and broad mandate ("manga ancha") to fix adjacent bugs and elevate craft.\n- Autonomous Convergence Loop: Once scope is agreed upon, iterate autonomously (Audit → Fix → Test → Re-audit) until 100/100 perfection with zero interruptions.\n- Interactive Scoping: Use questionnaires before initiating broad tasks to clarify whether clean code refactors are requested or excluded.\n- Specialized Subagents: Delegate heavy domain tasks and research to dedicated subagents.\n- Token Efficiency: Output dense, high-signal diffs and tables with zero conversational filler.\n- Maintain strict TypeScript types without any-casts; never bypass git hooks (--no-verify is prohibited).\n`,
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

export function removeBlock(existing: string | null): string {
  if (!existing) return '';
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    const before = existing.slice(0, start).trimEnd();
    const after = existing.slice(end + BLOCK_END.length).trimStart();
    if (!before && !after) return '';
    if (!before) return `${after}\n`;
    if (!after) return `${before}\n`;
    return `${before}\n\n${after}\n`;
  }
  return existing;
}

export function detectInstalledAgents(): SetupAgent[] {
  const detected = new Set<SetupAgent>();
  const home = process.env.HOME || process.env.USERPROFILE || '';

  if (fs.existsSync(path.join(home, '.claude')) || fs.existsSync(path.join(home, '.claude.json'))) {
    detected.add('claude');
  }
  if (fs.existsSync(path.join(home, '.gemini')) || fs.existsSync(path.join(home, '.antigravity'))) {
    detected.add('antigravity');
  }
  if (fs.existsSync(path.join(home, '.codex')) || fs.existsSync(path.join(home, '.agents'))) {
    detected.add('codex');
  }

  return detected.size > 0 ? Array.from(detected) : ['claude', 'codex', 'antigravity'];
}

export interface UninstallResult {
  cleanedInstructions: string[];
  removedSkills: string[];
}

export function uninstallProject(options: { cwd: string; dryRun?: boolean }): UninstallResult {
  const cleanedInstructions: string[] = [];
  const removedSkills: string[] = [];

  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const full = path.join(options.cwd, file);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf-8');
      const updated = removeBlock(content);
      if (!options.dryRun) {
        if (!updated.trim()) {
          fs.unlinkSync(full);
        } else {
          fs.writeFileSync(full, updated, 'utf-8');
        }
      }
      cleanedInstructions.push(file);
    }
  }

  const skillDirs = [
    path.join(options.cwd, '.claude', 'skills'),
    path.join(options.cwd, '.agents', 'skills'),
  ];

  for (const dir of skillDirs) {
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.startsWith('helen-')) {
          const skillPath = path.join(dir, entry.name);
          if (!options.dryRun) {
            fs.rmSync(skillPath, { recursive: true, force: true });
          }
          removedSkills.push(path.relative(options.cwd, skillPath));
        }
      }
    }
  }

  return { cleanedInstructions, removedSkills };
}

export function setupProject(options: SetupOptions & { global?: boolean }): SetupResult {
  const targets = options.agents as SkillTarget[];
  const skills = installSkills({
    cwd: options.cwd,
    targets,
    flows: options.flows,
    dryRun: options.dryRun,
    force: options.force,
  });

  if (options.global) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (options.agents.includes('claude')) {
      installSkills({ cwd: home, targets: ['custom'], customDir: '.claude/skills', dryRun: options.dryRun, force: options.force });
    }
    if (options.agents.includes('antigravity')) {
      installSkills({ cwd: home, targets: ['custom'], customDir: '.gemini/config/skills', dryRun: options.dryRun, force: options.force });
    }
  }

  const instructionFiles = ['AGENTS.md'];
  if (options.agents.includes('claude')) instructionFiles.push('CLAUDE.md');

  for (const file of instructionFiles) {
    const target = path.join(options.cwd, file);
    const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : null;
    writeFileSafe(target, upsertBlock(existing, helenBlock()), { dryRun: options.dryRun, force: true });
  }

  if (options.agents.includes('antigravity') || options.agents.includes('codex')) {
    installAntigravityRules(options.cwd, options.dryRun);
  }

  return { skills, instructionFiles };
}
