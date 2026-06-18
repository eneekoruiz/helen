import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

export type PromptKind = 'master' | 'guide' | 'flow' | 'step' | 'checkpoint' | 'prompt';

export interface PromptEntry {
  id: string;
  kind: PromptKind;
  title: string;
  relativePath: string;
  absolutePath: string;
  repeatable?: boolean;
  stage?: string;
}

interface RegistryFlow {
  id: string;
  path: string;
  repeatable?: boolean;
  stage?: string;
}

interface RegistryGuide {
  id: string;
  path: string;
  purpose?: string;
}

interface PromptRegistry {
  guides?: RegistryGuide[];
  executableFlows?: RegistryFlow[];
}

const PROMPTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'prompts');

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function stripMarkdownExt(filePath: string): string {
  return filePath.replace(/\.md$/i, '');
}

function titleFromId(id: string): string {
  return id
    .split('/')
    .at(-1)!
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readRegistry(): PromptRegistry {
  const registryPath = path.join(PROMPTS_ROOT, 'registry.json');
  if (!fs.existsSync(registryPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as PromptRegistry;
}

function walkMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }

  return files;
}

export function getPromptsRoot(): string {
  return PROMPTS_ROOT;
}

export function listPromptEntries(): PromptEntry[] {
  const registry = readRegistry();
  const entries: PromptEntry[] = [
    {
      id: 'master',
      kind: 'master',
      title: 'MASTER',
      relativePath: toPosix(path.relative(process.cwd(), path.join(PROMPTS_ROOT, 'MASTER.md'))),
      absolutePath: path.join(PROMPTS_ROOT, 'MASTER.md'),
    },
  ];

  for (const guide of registry.guides ?? []) {
    const absolutePath = path.resolve(PROMPTS_ROOT, path.relative('docs/prompts', guide.path));
    entries.push({
      id: guide.id,
      kind: 'guide',
      title: titleFromId(guide.id),
      relativePath: toPosix(path.relative(process.cwd(), absolutePath)),
      absolutePath,
    });
  }

  // Scan phase subdirectories dynamically
  const phaseDirs = fs.existsSync(PROMPTS_ROOT)
    ? fs.readdirSync(PROMPTS_ROOT, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^\d{2}-/.test(entry.name))
        .map(entry => entry.name)
    : [];

  for (const dir of phaseDirs) {
    const baseDir = path.join(PROMPTS_ROOT, dir);
    for (const filePath of walkMarkdownFiles(baseDir)) {
      const relativeFromRoot = toPosix(path.relative(PROMPTS_ROOT, filePath));
      const id = stripMarkdownExt(relativeFromRoot);
      const relativePath = toPosix(path.relative(process.cwd(), filePath));
      const fileName = path.basename(filePath);

      let kind: PromptKind = 'prompt';
      if (fileName.endsWith('-flow.md')) {
        kind = 'flow';
      } else if (fileName.endsWith('-checkpoint.md')) {
        kind = 'checkpoint';
      }

      const entry: PromptEntry = {
        id,
        kind,
        title: titleFromId(id),
        relativePath,
        absolutePath: filePath,
      };

      if (kind === 'flow') {
        const flowMeta = registry.executableFlows?.find(f => {
          const regRel = toPosix(f.path.replace(/^docs\/prompts\//, ''));
          return relativeFromRoot === regRel || f.id === id || path.basename(f.path, '.md') === path.basename(filePath, '.md');
        });
        if (flowMeta) {
          entry.repeatable = flowMeta.repeatable;
          entry.stage = flowMeta.stage;
        }
      }

      entries.push(entry);
    }
  }

  const seen = new Set<string>();
  return entries
    .filter(entry => {
      const key = `${entry.kind}:${entry.absolutePath}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return fs.existsSync(entry.absolutePath);
    })
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export function resolvePromptEntry(query: string): PromptEntry {
  const normalized = stripMarkdownExt(query.replaceAll('\\', '/').replace(/^docs\/prompts\//, ''));
  const entries = listPromptEntries();

  const exactMatches = entries.filter(entry => {
    const relativeFromRoot = stripMarkdownExt(toPosix(path.relative(PROMPTS_ROOT, entry.absolutePath)));
    return entry.id === normalized || relativeFromRoot === normalized;
  });

  if (exactMatches.length === 1) {
    return exactMatches[0]!;
  }

  if (exactMatches.length > 1) {
    throw new Error(`Prompt "${query}" is ambiguous: ${exactMatches.map(match => `${match.kind}:${match.id}`).join(', ')}`);
  }

  const matches = entries.filter(entry => stripMarkdownExt(path.basename(entry.absolutePath)) === normalized);

  if (matches.length === 0) {
    throw new Error(`Prompt "${query}" not found.`);
  }

  if (matches.length > 1) {
    throw new Error(`Prompt "${query}" is ambiguous: ${matches.map(match => `${match.kind}:${match.id}`).join(', ')}`);
  }

  return matches[0]!;
}

export function readPrompt(query: string): string {
  const entry = resolvePromptEntry(query);
  return fs.readFileSync(entry.absolutePath, 'utf-8');
}

export function printPromptList(kind?: PromptKind): void {
  const entries = listPromptEntries().filter(entry => !kind || entry.kind === kind);
  const grouped = new Map<PromptKind, PromptEntry[]>();

  for (const entry of entries) {
    grouped.set(entry.kind, [...(grouped.get(entry.kind) ?? []), entry]);
  }

  console.log('');
  console.log(`  ${pc.bold('HELEN prompt library')}`);
  console.log(`  ${pc.dim(getPromptsRoot())}`);
  console.log('');

  for (const [group, groupEntries] of grouped) {
    console.log(`  ${pc.bold(pc.cyan(group))}`);
    for (const entry of groupEntries) {
      const meta = entry.kind === 'flow'
        ? ` ${pc.dim(`[${entry.stage ?? 'flow'}${entry.repeatable === false ? ', final' : ', repeatable'}]`)}`
        : '';
      console.log(`    ${pc.green(entry.id.padEnd(34))} ${pc.dim(entry.relativePath)}${meta}`);
    }
    console.log('');
  }
}

export function printPromptPath(query: string): void {
  const entry = resolvePromptEntry(query);
  console.log(entry.absolutePath);
}

export function printPromptContent(query: string): void {
  const entry = resolvePromptEntry(query);
  console.log(`# ${entry.kind}:${entry.id}`);
  console.log(`Path: ${entry.absolutePath}`);
  console.log('');
  console.log(fs.readFileSync(entry.absolutePath, 'utf-8'));
}
