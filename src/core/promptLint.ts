import fs from 'node:fs';
import path from 'node:path';
import { getPromptsRoot } from './prompts.js';

export interface PromptIssue {
  file: string;
  message: string;
}

const NON_ATOMIC = new Set(['README.md', 'ROUTER.md', 'HUMAN_CHECKLIST.md']);
const REQUIRED_KEYS = ['action', 'label', 'phase', 'modifies_code', 'stop_conditions'];
/** Legacy file prefixes and the canonical actions the contract maps them to. */
const PREFIX_ACTIONS: Record<string, string[]> = { APPLY: ['APPLY', 'ENHANCE'] };
const LINK_PATTERN = /\]\(((?:[^()\s#]|\([^)]*\))+)\)/g;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

function frontmatterKeys(content: string): Map<string, string> | null {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return null;
  const keys = new Map<string, string>();
  for (const line of match[1]!.split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) keys.set(kv[1]!, kv[2]!.trim());
  }
  return keys;
}

/**
 * Enforces the Premium Prompt Contract mechanically: frontmatter on atomic
 * prompts, action/phase consistent with file name and directory, and
 * relative Markdown links that resolve (case-sensitively, as on Linux).
 */
export function lintPrompts(root: string = getPromptsRoot()): PromptIssue[] {
  const issues: PromptIssue[] = [];

  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const base = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    const phase = /^\d{2}-[^/]+/.exec(rel)?.[0];

    if (phase && !NON_ATOMIC.has(base)) {
      const keys = frontmatterKeys(content);
      if (!keys) {
        issues.push({ file: rel, message: 'missing YAML frontmatter' });
      } else {
        for (const key of REQUIRED_KEYS) {
          if (!keys.has(key)) issues.push({ file: rel, message: `frontmatter missing "${key}"` });
        }
        const prefix = /^([A-Z]+)-/.exec(base)?.[1];
        if (prefix && !(PREFIX_ACTIONS[prefix] ?? [prefix]).includes(keys.get('action') ?? '')) {
          issues.push({ file: rel, message: `action "${keys.get('action')}" does not match file prefix "${prefix}"` });
        }
        if (keys.get('phase') && keys.get('phase') !== phase) {
          issues.push({ file: rel, message: `phase "${keys.get('phase')}" does not match directory "${phase}"` });
        }
      }
    }

    if (content.includes('file:///')) {
      issues.push({ file: rel, message: 'contains an absolute file:/// link' });
    }

    for (const match of content.matchAll(LINK_PATTERN)) {
      const target = decodeURIComponent(match[1]!);
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
        issues.push({ file: rel, message: `broken link: ${target}` });
      }
    }
  }

  return issues;
}
