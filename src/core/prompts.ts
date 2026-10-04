import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { parseFrontmatter } from './frontmatter.js';
import { EXECUTION_CONTRACT } from './executionProtocol.js';

export type PromptKind = 'master' | 'guide' | 'flow' | 'checkpoint' | 'prompt';

export interface ReadPromptOptions {
  fill?: Record<string, string>;
  replyLang?: string;
  protocol?: boolean;
  /** Legacy option retained for callers; prefer protocol. */
  level100?: boolean;
}

export interface PromptEntry {
  id: string;
  kind: PromptKind;
  title: string;
  summary: string;
  action?: string;
  phase?: string;
  aliases: string[];
  relativePath: string;
  absolutePath: string;
  repeatable?: boolean;
  stage?: string;
}

const PROMPTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'prompts');

/** Library-level documents, always available by id. */
const GUIDES: { id: string; file: string; kind: PromptKind }[] = [
  { id: 'master', file: 'MASTER.md', kind: 'master' },
  { id: 'rules', file: 'RULES.md', kind: 'guide' },
  { id: 'contract', file: 'CONTRACT.md', kind: 'guide' },
];

const ACTION_PREFIXES = ['APPLY', 'AUDIT', 'ENHANCE', 'GENERATE', 'INIT', 'PLAN', 'RESEARCH'];

export const PHASE_PATTERN = /^\d{2}-[a-z0-9-]+$/;

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function walkMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md' ? [fullPath] : [];
  });
}

/** `02-building/clean-code/APPLY-clean-code-pass-flow.md` -> `02-building/clean-code/apply-clean-code-pass-flow`. */
export function idFromRelativePath(relativeFromRoot: string): string {
  const parts = relativeFromRoot.replace(/\.md$/i, '').split('/');
  const file = parts.at(-1)!;
  const prefix = ACTION_PREFIXES.find(candidate => file.startsWith(`${candidate}-`));
  parts[parts.length - 1] = prefix ? `${prefix.toLowerCase()}${file.slice(prefix.length)}` : file;
  return parts.join('/');
}

function kindFromFile(fileName: string): PromptKind {
  if (fileName.endsWith('-flow.md')) return 'flow';
  if (fileName.endsWith('-checkpoint.md')) return 'checkpoint';
  return 'prompt';
}

function titleFrom(body: string, fallback: string): string {
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? fallback;
}

function toEntry(root: string, absolutePath: string, id: string, kind: PromptKind): PromptEntry {
  const { data, body } = parseFrontmatter(fs.readFileSync(absolutePath, 'utf-8'));
  const aliases = Array.isArray(data.aliases) ? data.aliases : [];
  return {
    id,
    kind,
    title: titleFrom(body, id),
    summary: typeof data.summary === 'string' ? data.summary : '',
    action: typeof data.action === 'string' ? data.action : undefined,
    phase: typeof data.phase === 'string' ? data.phase : undefined,
    aliases,
    relativePath: toPosix(path.relative(root, absolutePath)),
    absolutePath,
    repeatable: typeof data.repeatable === 'boolean' ? data.repeatable : undefined,
    stage: typeof data.stage === 'string' ? data.stage : undefined,
  };
}

export function getPromptsRoot(): string {
  return PROMPTS_ROOT;
}

export function listPromptEntries(root: string = PROMPTS_ROOT): PromptEntry[] {
  const entries: PromptEntry[] = GUIDES.filter(guide => fs.existsSync(path.join(root, guide.file))).map(guide =>
    toEntry(root, path.join(root, guide.file), guide.id, guide.kind),
  );

  const phases = fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && PHASE_PATTERN.test(entry.name))
    : [];
  for (const phase of phases) {
    for (const file of walkMarkdown(path.join(root, phase.name))) {
      const relative = toPosix(path.relative(root, file));
      entries.push(toEntry(root, file, idFromRelativePath(relative), kindFromFile(path.basename(file))));
    }
  }

  const userPromptsDir = path.join(process.cwd(), '.helen', 'prompts');
  if (fs.existsSync(userPromptsDir)) {
    for (const file of walkMarkdown(userPromptsDir)) {
      const relative = toPosix(path.relative(userPromptsDir, file));
      entries.push(toEntry(userPromptsDir, file, `user/${idFromRelativePath(relative)}`, kindFromFile(path.basename(file))));
    }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

/** Resolve by full id, short id (file name), relative path, or a legacy alias. */
export function resolvePromptEntry(query: string, root: string = PROMPTS_ROOT, entries: readonly PromptEntry[] = listPromptEntries(root)): PromptEntry {
  const normalized = query.replaceAll('\\', '/').replace(/^docs\/prompts\//, '').replace(/\.md$/i, '').toLowerCase();
  const short = (entry: PromptEntry) => entry.id.split('/').at(-1)!;

  const found =
    entries.find(entry => entry.id === normalized || entry.relativePath.replace(/\.md$/i, '').toLowerCase() === normalized) ??
    entries.find(entry => short(entry) === normalized) ??
    entries.find(entry => entry.aliases.map(alias => alias.toLowerCase()).includes(normalized));

  if (!found) {
    const suggestions = searchPrompts(query, root).slice(0, 3).map(entry => short(entry));
    throw new Error(`Prompt "${query}" not found.${suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : ''}`);
  }
  return found;
}

export function readPrompt(
  query: string,
  root: string = PROMPTS_ROOT,
  options?: ReadPromptOptions
): string {
  const entry = resolvePromptEntry(query, root);
  return readPromptEntry(entry, options);
}

/** Read an already-resolved entry without rescanning the entire library. */
export function readPromptEntry(
  entry: PromptEntry,
  options?: ReadPromptOptions,
): string {
  let content = fs.readFileSync(entry.absolutePath, 'utf-8');
  if (options?.fill) {
    for (const [key, val] of Object.entries(options.fill)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), () => val);
    }
  }
  if ((options?.protocol ?? options?.level100 ?? true) && entry.kind !== 'master' && entry.kind !== 'guide') {
    content += `\n\n---\n${EXECUTION_CONTRACT}\n`;
  }
  if (options?.replyLang) {
    content += `\n\n---\n**Reply Language**: Please respond in ${options.replyLang}.\n`;
  }
  return content;
}

export interface PromptOverlap {
  promptA: string;
  promptB: string;
  similarity: number;
}

/**
 * Identify overlapping prompts based on word-set Jaccard similarity (DRY enforcement).
 */
export function findPromptOverlaps(root: string = PROMPTS_ROOT, threshold = 0.45): PromptOverlap[] {
  const entries = listPromptEntries(root).filter(e => e.kind === 'prompt' || e.kind === 'flow');
  const wordSets = new Map<string, Set<string>>();

  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'when', 'without', 'into', 'each', 'before', 'after', 'will', 'your', 'about', 'must', 'should', 'have', 'more', 'some', 'than'
  ]);

  for (const entry of entries) {
    const raw = fs.readFileSync(entry.absolutePath, 'utf-8');
    const words = raw.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const set = new Set(words.filter(w => !STOP_WORDS.has(w)));
    wordSets.set(entry.id, set);
  }

  const overlaps: PromptOverlap[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const idA = entries[i]!.id;
      const idB = entries[j]!.id;
      const setA = wordSets.get(idA)!;
      const setB = wordSets.get(idB)!;
      let intersection = 0;
      for (const w of setA) {
        if (setB.has(w)) intersection++;
      }
      const union = setA.size + setB.size - intersection;
      const similarity = union > 0 ? intersection / union : 0;
      if (similarity >= threshold) {
        overlaps.push({ promptA: idA, promptB: idB, similarity: Math.round(similarity * 100) / 100 });
      }
    }
  }

  return overlaps.sort((a, b) => b.similarity - a.similarity);
}

/** Rank prompts by how many query words appear in their id, title, summary and aliases. */
export function searchPrompts(query: string, root: string = PROMPTS_ROOT): PromptEntry[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
  if (words.length === 0) return [];
  return listPromptEntries(root)
    .map(entry => {
      const haystack = `${entry.id} ${entry.title} ${entry.summary} ${entry.aliases.join(' ')}`.toLowerCase();
      return { entry, score: words.filter(word => haystack.includes(word)).length };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .map(result => result.entry);
}

export function shortId(entry: PromptEntry): string {
  return entry.id.split('/').at(-1)!;
}

export function printPromptList(kind?: PromptKind): void {
  const entries = listPromptEntries().filter(entry => !kind || entry.kind === kind);
  let phase = '';
  console.log('');
  for (const entry of entries) {
    const group = entry.phase ?? 'library';
    if (group !== phase) {
      phase = group;
      console.log(`  ${pc.bold(pc.cyan(group))}`);
    }
    const tag = entry.kind === 'prompt' ? entry.action ?? '' : entry.kind;
    console.log(`    ${pc.green(shortId(entry).padEnd(44))} ${pc.dim(tag.padEnd(10))} ${entry.summary}`);
  }
  console.log(`\n  ${pc.dim('Read one: helen prompts show <id>   Search: helen prompts search <words>')}\n`);
}

export function printPromptPath(query: string): void {
  console.log(resolvePromptEntry(query).absolutePath);
}

export function printPromptContent(query: string): void {
  const entry = resolvePromptEntry(query);
  console.log(fs.readFileSync(entry.absolutePath, 'utf-8'));
  if (entry.kind !== 'master' && entry.kind !== 'guide') {
    console.log(pc.dim('Shared rules apply to every HELEN prompt: helen prompts show rules'));
  }
}
