import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../core/frontmatter.js';
import { ensureHome, withHomeLock, writePrivate } from './home.js';
import { findSecrets, looksSensitive, secretRefusal } from '../core/secrets.js';
import { fold, slug, tokens } from './text.js';

/**
 * Personal memory: one Markdown file per item in ~/.helen/memory, readable and editable by hand
 * (or in Obsidian). Metadata sits in frontmatter; the first "# " line is the title.
 */
export const MEMORY_KINDS = ['note', 'fact', 'idea', 'decision', 'person', 'bookmark', 'journal'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export type Visibility = 'private' | 'agents';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  title: string;
  body: string;
  tags: string[];
  /** private: only the owner's channels. agents: coding agents may read it through MCP. */
  visibility: Visibility;
  /** Never read aloud by a speaker and never sent to a model provider unless the owner allows it. */
  sensitive: boolean;
  source: string;
  created: string;
  updated: string;
  expires?: string;
  project?: string;
  file: string;
}

export interface AddMemoryInput {
  text: string;
  title?: string;
  kind?: MemoryKind;
  tags?: string[];
  visibility?: Visibility;
  sensitive?: boolean;
  source?: string;
  expires?: string;
  project?: string;
  /** Store text that looks like a credential anyway (still marked sensitive). */
  allowSecret?: boolean;
  /** Language of the error messages. */
  lang?: 'es' | 'en';
  now?: Date;
}

export function memoryDir(home: string): string {
  return path.join(home, 'memory');
}

function cleanTag(tag: string): string {
  return fold(tag).replace(/^#/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

function deriveTitle(text: string): string {
  const firstLine = text.trim().split('\n')[0]!.replace(/^#+\s*/, '');
  const sentence = /^(.{3,80}?[.!?])(\s|$)/.exec(firstLine)?.[1] ?? firstLine;
  return sentence.length > 80 ? `${sentence.slice(0, 77).trimEnd()}...` : sentence;
}

function serialize(item: Omit<MemoryItem, 'file'>): string {
  const lines = [
    '---',
    `id: ${item.id}`,
    `kind: ${item.kind}`,
    `tags: [${item.tags.join(', ')}]`,
    `visibility: ${item.visibility}`,
    `sensitive: ${item.sensitive}`,
    `source: ${item.source}`,
    `created: ${item.created}`,
    `updated: ${item.updated}`,
    ...(item.expires ? [`expires: ${item.expires}`] : []),
    ...(item.project ? [`project: ${item.project}`] : []),
    '---',
    `# ${item.title.replace(/\n/g, ' ')}`,
    '',
    item.body.trim(),
    '',
  ];
  return lines.join('\n');
}

function parseItem(file: string): MemoryItem | null {
  let content: string;
  try {
    const info = fs.lstatSync(file);
    if (!info.isFile() || info.size > 512 * 1024) return null;
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(content);
  const text = body.replace(/^\s+/, '');
  const heading = /^#\s+(.+)\n?/.exec(text);
  const title = heading ? heading[1]!.trim() : deriveTitle(text || path.basename(file, '.md'));
  const rest = (heading ? text.slice(heading[0].length) : text).trim();
  const stat = fs.statSync(file);
  const id = typeof data.id === 'string' && /^[a-z][a-z0-9-]{2,60}$/.test(data.id) ? data.id : `f-${slug(path.basename(file, '.md'), 30)}`;
  const kind = MEMORY_KINDS.includes(data.kind as MemoryKind) ? (data.kind as MemoryKind) : 'note';
  return {
    id, kind, title, body: rest,
    tags: Array.isArray(data.tags) ? data.tags.map(cleanTag).filter(Boolean) : [],
    visibility: data.visibility === 'agents' ? 'agents' : 'private',
    sensitive: data.sensitive === true,
    source: typeof data.source === 'string' ? data.source : 'file',
    created: typeof data.created === 'string' ? data.created : stat.birthtime.toISOString(),
    updated: typeof data.updated === 'string' ? data.updated : stat.mtime.toISOString(),
    ...(typeof data.expires === 'string' && data.expires ? { expires: data.expires } : {}),
    ...(typeof data.project === 'string' && data.project ? { project: data.project } : {}),
    file,
  };
}

export function listMemory(home: string, filter: { kind?: MemoryKind; tag?: string; includeExpired?: boolean; visibility?: Visibility; now?: Date } = {}): MemoryItem[] {
  const dir = memoryDir(home);
  if (!fs.existsSync(dir)) return [];
  const now = (filter.now ?? new Date()).toISOString();
  const items: MemoryItem[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const item = parseItem(path.join(dir, name));
    if (!item) continue;
    if (!filter.includeExpired && item.expires && item.expires < now) continue;
    if (filter.kind && item.kind !== filter.kind) continue;
    if (filter.tag && !item.tags.includes(cleanTag(filter.tag))) continue;
    if (filter.visibility && item.visibility !== filter.visibility) continue;
    items.push(item);
  }
  return items.sort((a, b) => b.updated.localeCompare(a.updated));
}

export function getMemory(home: string, id: string): MemoryItem | null {
  return listMemory(home, { includeExpired: true }).find(item => item.id === id) ?? null;
}

export function addMemory(home: string, input: AddMemoryInput): MemoryItem {
  const text = input.text.trim();
  const es = input.lang === 'es';
  if (!text) throw new Error(es ? 'No hay nada que recordar.' : 'Nothing to remember.');
  if (text.length > 20000) throw new Error(es ? 'Es demasiado largo para una sola nota (20.000 caracteres); divídelo.' : 'Too long for one memory (20,000 characters); split it.');
  const secrets = findSecrets(`${input.title ?? ''}\n${text}`);
  if (secrets.length > 0 && !input.allowSecret) throw new Error(secretRefusal(secrets, input.lang ?? 'en'));
  const kind = input.kind ?? 'note';
  if (!MEMORY_KINDS.includes(kind)) throw new Error(`Unknown kind "${kind}". Kinds: ${MEMORY_KINDS.join(', ')}`);
  const now = (input.now ?? new Date()).toISOString();
  ensureHome(home);
  return withHomeLock(home, () => {
    let id = '';
    do id = `m${crypto.randomBytes(3).toString('hex')}`; while (getMemory(home, id));
    const title = (input.title?.trim() || deriveTitle(text)).slice(0, 120);
    const body = text === title ? '' : text;
    const item: Omit<MemoryItem, 'file'> = {
      id, kind, title, body,
      tags: [...new Set((input.tags ?? []).map(cleanTag).filter(Boolean))].slice(0, 12),
      visibility: input.visibility ?? 'private',
      sensitive: input.sensitive ?? (secrets.length > 0 || looksSensitive(text)),
      source: (input.source ?? 'cli').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'cli',
      created: now, updated: now,
      ...(input.expires ? { expires: new Date(input.expires).toISOString() } : {}),
      ...(input.project ? { project: input.project.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 60) } : {}),
    };
    const file = path.join(memoryDir(home), `${now.slice(0, 10)}-${slug(title, 40)}-${id}.md`);
    writePrivate(file, serialize(item));
    return { ...item, file };
  });
}

export function updateMemory(home: string, id: string, patch: Partial<Pick<MemoryItem, 'title' | 'body' | 'tags' | 'kind' | 'visibility' | 'sensitive' | 'expires'>>): MemoryItem {
  return withHomeLock(home, () => {
    const item = getMemory(home, id);
    if (!item) throw new Error(`No memory with id ${id}.`);
    if (patch.body !== undefined || patch.title !== undefined) {
      const secrets = findSecrets(`${patch.title ?? ''}\n${patch.body ?? ''}`);
      if (secrets.length > 0) throw new Error(`This looks like a secret (${secrets.join(', ')}); not stored.`);
    }
    const next: MemoryItem = {
      ...item,
      ...patch,
      tags: patch.tags ? [...new Set(patch.tags.map(cleanTag).filter(Boolean))] : item.tags,
      updated: new Date().toISOString(),
    };
    writePrivate(item.file, serialize(next));
    return next;
  });
}

/** Delete an item for good. Nothing of its content is kept. */
export function forgetMemory(home: string, id: string): MemoryItem {
  return withHomeLock(home, () => {
    const item = getMemory(home, id);
    if (!item) throw new Error(`No memory with id ${id}.`);
    fs.rmSync(item.file, { force: true });
    return item;
  });
}

export interface SearchHit {
  item: MemoryItem;
  score: number;
  snippet: string;
}

export interface SearchOptions {
  limit?: number;
  kind?: MemoryKind;
  visibility?: Visibility;
  includeSensitive?: boolean;
  now?: Date;
}

/** BM25 over title, tags and body, with a small boost for exact phrases and recent items. */
export function searchMemory(home: string, query: string, options: SearchOptions = {}): SearchHit[] {
  const now = options.now ?? new Date();
  const items = listMemory(home, { kind: options.kind, visibility: options.visibility, now })
    .filter(item => options.includeSensitive !== false || !item.sensitive);
  const queryTokens = [...new Set(tokens(query))];
  if (items.length === 0 || queryTokens.length === 0) return [];

  const fields = items.map(item => ({ title: tokens(item.title), tags: item.tags.flatMap(tag => tokens(tag.replace(/-/g, ' '))), body: tokens(item.body) }));
  const weighted = fields.map(f => f.title.length * 2.5 + f.tags.length * 2 + f.body.length);
  const avg = weighted.reduce((sum, value) => sum + value, 0) / items.length || 1;
  const df = new Map<string, number>();
  for (const f of fields) for (const token of new Set([...f.title, ...f.tags, ...f.body])) df.set(token, (df.get(token) ?? 0) + 1);
  const k1 = 1.2;
  const b = 0.75;
  const phrase = fold(query).replace(/\s+/g, ' ').trim();

  const hits: SearchHit[] = items.map((item, index) => {
    const f = fields[index]!;
    let score = 0;
    for (const token of queryTokens) {
      const tf = 2.5 * f.title.filter(t => t === token).length + 2 * f.tags.filter(t => t === token).length + f.body.filter(t => t === token).length;
      if (tf === 0) continue;
      const n = df.get(token) ?? 0;
      const idf = Math.log(1 + (items.length - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * weighted[index]!) / avg)));
    }
    if (score > 0 && phrase.includes(' ') && fold(`${item.title} ${item.body}`).includes(phrase)) score += 2;
    const ageDays = Math.max(0, (now.getTime() - Date.parse(item.updated)) / 86_400_000);
    score *= 1 + 0.15 * Math.exp(-ageDays / 60);
    const sentences = `${item.title}. ${item.body}`.split(/(?<=[.!?\n])\s+/).filter(Boolean);
    const best = sentences
      .map(sentence => ({ sentence, hits: tokens(sentence).filter(token => queryTokens.includes(token)).length }))
      .sort((a, c) => c.hits - a.hits)[0]?.sentence ?? item.title;
    return { item, score: Math.round(score * 1000) / 1000, snippet: best.length > 180 ? `${best.slice(0, 177)}...` : best };
  });

  return hits.filter(hit => hit.score > 0).sort((a, c) => c.score - a.score).slice(0, options.limit ?? 5);
}

/** Export everything as one JSON document (for backups or moving machines). */
export function exportMemory(home: string): Array<Omit<MemoryItem, 'file'>> {
  return listMemory(home, { includeExpired: true }).map(({ file: _file, ...rest }) => rest);
}
