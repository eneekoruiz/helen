import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { updatePhaseIndexes } from './promptIndex.js';
import { PHASE_PATTERN, getPromptsRoot, idFromRelativePath } from './prompts.js';

export interface PromptIssue {
  file: string;
  message: string;
}

const REQUIRED_KEYS = ['action', 'phase', 'summary', 'modifies_code'];
const REQUIRED_SECTIONS = ['## Goal', '## Use when', '## Limits', '## Output'];
const BODY_SECTIONS = ['## Requirements', '## Steps'];
const LINK_PATTERN = /\]\(((?:[^()\s#]|\([^)]*\))+)\)/g;
const MAX_SUMMARY = 160;

const SPANISH = ['que', 'para', 'los', 'las', 'del', 'una', 'con', 'por', 'como', 'cuando', 'sin', 'más', 'también', 'según'];
const ENGLISH = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'when', 'without', 'into', 'each', 'before'];
const LEGACY_MARKERS = ['Nivel 0', 'Mente Abierta', 'file:///', '## Objetivo', '## Cuándo', '## Requisitos', '## Formato', '## Límites'];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

function count(words: string[], text: string): number {
  return words.reduce((total, word) => total + (text.match(new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, 'giu'))?.length ?? 0), 0);
}

/** Prose outside code blocks and inline code, which is where the language is judged. */
function prose(text: string): string {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
}

export function looksSpanish(text: string): boolean {
  const body = prose(text);
  const spanish = count(SPANISH, body);
  return spanish >= 6 && spanish > count(ENGLISH, body) * 0.5;
}

/**
 * Mechanical enforcement of docs/prompts/CONTRACT.md: frontmatter, required
 * sections, English, no legacy boilerplate, unique aliases, working relative
 * links (case-sensitive) and up-to-date phase indexes.
 */
export function lintPrompts(root: string = getPromptsRoot()): PromptIssue[] {
  const issues: PromptIssue[] = [];
  const ids = new Map<string, string>();
  const aliases = new Map<string, string>();

  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const base = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    const phase = rel.split('/')[0]!;
    const isPrompt = PHASE_PATTERN.test(phase) && base !== 'README.md';
    const add = (message: string) => issues.push({ file: rel, message });

    for (const marker of LEGACY_MARKERS) {
      if (content.includes(marker)) add(`contains legacy text "${marker}"`);
    }
    if (looksSpanish(content)) add('prose looks Spanish: HELEN prompts are written in English');

    for (const match of content.matchAll(LINK_PATTERN)) {
      const target = decodeURIComponent(match[1]!);
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) add(`broken link: ${target}`);
    }

    if (!isPrompt) continue;

    const { data, body, hasFrontmatter } = parseFrontmatter(content);
    if (!hasFrontmatter) {
      add('missing YAML frontmatter');
      continue;
    }
    for (const key of REQUIRED_KEYS) {
      if (data[key] === undefined || data[key] === '') add(`frontmatter missing "${key}"`);
    }
    const prefix = /^([A-Z]+)-/.exec(base)?.[1];
    if (!prefix) add('file name must start with its action, e.g. AUDIT-');
    else if (data.action !== prefix) add(`action "${String(data.action)}" does not match file prefix "${prefix}"`);
    if (data.phase !== phase) add(`phase "${String(data.phase)}" does not match directory "${phase}"`);
    if (typeof data.summary === 'string' && data.summary.length > MAX_SUMMARY) add(`summary longer than ${MAX_SUMMARY} characters`);
    if (base.endsWith('-flow.md') && (typeof data.repeatable !== 'boolean' || !data.stage)) add('flows need "repeatable" and "stage"');

    if (!/^#\s+\S/m.test(body)) add('missing "# Title"');
    for (const section of REQUIRED_SECTIONS) {
      if (!new RegExp(`^${section}\\s*$`, 'm').test(body)) add(`missing section "${section}"`);
    }
    if (!BODY_SECTIONS.some(section => new RegExp(`^${section}\\s*$`, 'm').test(body))) add('missing section "## Requirements" or "## Steps"');

    const words = body.trim().split(/\s+/).length;
    if (words > 2000) add(`prompt exceeds 2000 words limit (${words} words)`);

    const id = idFromRelativePath(rel).split('/').at(-1)!;
    if (ids.has(id)) add(`short id "${id}" also used by ${ids.get(id)}`);
    ids.set(id, rel);
    for (const alias of Array.isArray(data.aliases) ? data.aliases : []) {
      if (aliases.has(alias)) add(`alias "${alias}" also used by ${aliases.get(alias)}`);
      aliases.set(alias, rel);
    }
  }

  for (const [alias, rel] of aliases) {
    if (ids.has(alias)) issues.push({ file: rel, message: `alias "${alias}" collides with an existing prompt id` });
  }
  for (const readme of updatePhaseIndexes(false, root)) {
    issues.push({ file: readme, message: 'prompt index is out of date: run `helen prompts index`' });
  }

  return issues;
}
