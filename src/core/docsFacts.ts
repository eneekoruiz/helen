import fs from 'node:fs';
import path from 'node:path';
import { listPromptEntries } from './prompts.js';
import { listSkills } from './skills.js';
import { readPlaybooks } from './apply.js';
import { getAllModules } from '../modules/registry.js';
import { HELEN_MCP_TOOLS } from './mcp.js';
import { helenVersion, PACKAGE_ROOT } from './version.js';

/**
 * Documentation drift control.
 *
 * Docs that state a number the repository can compute wrap it in a fact marker:
 *   <!--fact:skills-->12<!--/fact-->
 * `checkDocs` fails when a marker is stale or when a document points at a file that
 * does not exist, so a README or CHANGELOG can no longer claim things the repo lacks.
 */

export type FactName = 'version' | 'skills' | 'prompts' | 'library' | 'catalog' | 'goals' | 'modules' | 'mcpTools' | 'evalCases';

export interface DocIssue {
  file: string;
  line: number;
  kind: 'fact' | 'reference' | 'link' | 'version';
  message: string;
}

const MARKER = /<!--fact:([A-Za-z]+)-->([^<]*)<!--\/fact-->/g;

/** Documents that describe the current state of the project. Archived reports are history and are not checked. */
export const CHECKED_DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'AUTONOMY.md',
  'CHANGELOG.md',
  'docs/GUIA.md',
  'docs/RELEASING.md',
  'docs/ORCHESTRATION.md',
  'docs/ASSISTANT.md',
  'docs/ALEXA.md',
  'docs/SKILLS-CATALOG.md',
  'docs/WORKFLOW-QUALITY.md',
  'docs/AGENT-PRESETS.md',
  'docs/COMPARISON.md',
];

function countEvalCases(root: string): number {
  const dir = path.join(root, 'evals');
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    try {
      const spec = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as { cases?: unknown[] };
      total += Array.isArray(spec.cases) ? spec.cases.length : 0;
    } catch {
      // Malformed eval files are reported by `helen lint`.
    }
  }
  return total;
}

export function collectFacts(root: string = PACKAGE_ROOT): Record<FactName, string> {
  const entries = listPromptEntries();
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'skills', 'catalog.json'), 'utf8')) as { items?: unknown[] } | unknown[];
  const catalogItems = Array.isArray(catalog) ? catalog : (catalog.items ?? []);
  const playbooks = readPlaybooks(undefined, root);
  return {
    version: helenVersion(),
    skills: String(listSkills().length),
    prompts: String(entries.filter(entry => entry.kind === 'prompt' || entry.kind === 'flow').length),
    library: String(entries.length),
    catalog: String(catalogItems.length),
    goals: String(Object.keys(playbooks.goals).length),
    modules: String(getAllModules().length),
    mcpTools: String(HELEN_MCP_TOOLS.length),
    evalCases: String(countEvalCases(root)),
  };
}

function readIfExists(file: string): string | undefined {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;
}

/** CHANGELOG history legitimately mentions removed files, so only the newest sections are held to the repository. */
function relevantText(relativeFile: string, content: string): string {
  if (relativeFile !== 'CHANGELOG.md') return content;
  const sections = content.split(/^(?=## )/m);
  return sections.slice(0, 3).join('');
}

// Agent config folders (.claude, .cursor, .agents) are install targets inside user projects, so they are not checked here.
const REPO_REF = /^(?:\.github|\.githooks|\.claude-plugin|docs|src|scripts|skills|evals|templates|tests|examples|packaging)\/[A-Za-z0-9_.@/-]+$|^(?:README\.md|CHANGELOG\.md|SECURITY\.md|CONTRIBUTING\.md|AUTONOMY\.md|LICENSE|Dockerfile|package\.json|package-lock\.json|tsconfig\.json|vitest\.config\.ts|release-please-config\.json|\.release-please-manifest\.json)$/;

function stripFences(content: string): string {
  // Keep line numbers stable by blanking fenced blocks instead of removing them.
  return content.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, block => block.replace(/[^\n]/g, ' '));
}

export function checkDocs(root: string = PACKAGE_ROOT, facts: Record<FactName, string> = collectFacts(root)): DocIssue[] {
  const issues: DocIssue[] = [];

  for (const relativeFile of CHECKED_DOCS) {
    const file = path.join(root, relativeFile);
    const raw = readIfExists(file);
    if (raw === undefined) continue;
    const content = relevantText(relativeFile, raw);
    const body = stripFences(content);
    const lines = body.split('\n');

    lines.forEach((text, index) => {
      const line = index + 1;
      for (const match of text.matchAll(MARKER)) {
        const name = match[1] as FactName;
        if (!(name in facts)) {
          issues.push({ file: relativeFile, line, kind: 'fact', message: `Unknown fact "${name}"` });
        } else if (match[2] !== facts[name]) {
          issues.push({ file: relativeFile, line, kind: 'fact', message: `Fact "${name}" is "${match[2]}" but the repository has "${facts[name]}" (run npm run docs:sync)` });
        }
      }
      for (const match of text.matchAll(/`([^`\n]+)`/g)) {
        const token = match[1]!.trim();
        if (!REPO_REF.test(token) || /[<>*{}]/.test(token) || token.includes('...')) continue;
        if (!fs.existsSync(path.join(root, token))) {
          issues.push({ file: relativeFile, line, kind: 'reference', message: `\`${token}\` does not exist in the repository` });
        }
      }
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const target = match[1]!;
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
        const withoutAnchor = target.split('#')[0]!.split('?')[0]!;
        if (!withoutAnchor) continue;
        if (!fs.existsSync(path.resolve(path.dirname(file), withoutAnchor))) {
          issues.push({ file: relativeFile, line, kind: 'link', message: `Broken link: ${target}` });
        }
      }
    });
  }

  issues.push(...checkVersions(root, facts.version));
  return issues;
}

function jsonVersion(file: string, pick: (value: Record<string, unknown>) => unknown): string | undefined {
  const raw = readIfExists(file);
  if (raw === undefined) return undefined;
  try {
    const value = pick(JSON.parse(raw) as Record<string, unknown>);
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Every file that carries a version must agree with package.json. */
export function checkVersions(root: string, version: string): DocIssue[] {
  const issues: DocIssue[] = [];
  const targets: Array<[string, (value: Record<string, unknown>) => unknown]> = [
    ['.release-please-manifest.json', value => value['.']],
    ['.claude-plugin/plugin.json', value => value.version],
  ];
  for (const [relativeFile, pick] of targets) {
    const found = jsonVersion(path.join(root, relativeFile), pick);
    if (found !== undefined && found !== version) {
      issues.push({ file: relativeFile, line: 1, kind: 'version', message: `Version ${found} differs from package.json ${version}` });
    }
  }
  return issues;
}

/** Rewrite stale fact markers in place. Returns the files that changed. */
export function syncDocs(root: string = PACKAGE_ROOT, facts: Record<FactName, string> = collectFacts(root)): string[] {
  const changed: string[] = [];
  for (const relativeFile of CHECKED_DOCS) {
    const file = path.join(root, relativeFile);
    const raw = readIfExists(file);
    if (raw === undefined) continue;
    const next = raw.replace(MARKER, (whole, name: string) => (name in facts ? `<!--fact:${name}-->${facts[name as FactName]}<!--/fact-->` : whole));
    if (next !== raw) {
      fs.writeFileSync(file, next, 'utf8');
      changed.push(relativeFile);
    }
  }
  return changed;
}
