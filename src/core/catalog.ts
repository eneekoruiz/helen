import fs from 'node:fs';
import path from 'node:path';
import { getSkillsRoot } from './skills.js';

export type CatalogStatus = 'active' | 'caution' | 'discontinued';

export type CatalogKind = 'skill' | 'plugin' | 'cli' | 'reference' | 'service' | 'mcp';

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  kind: CatalogKind;
  status: CatalogStatus;
  source: string;
  summary: string;
  install: string[];
  license: string;
  phases: string[];
  notes?: string;
  /** ISO date when the entry was last checked against its own documentation. */
  verified: string;
}

interface CatalogFile {
  version: number;
  note: string;
  items: CatalogItem[];
}

export function readCatalog(root: string = getSkillsRoot()): CatalogItem[] {
  const file = path.join(root, 'catalog.json');
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, 'utf-8')) as CatalogFile).items;
}

export function listCatalog(category?: string, root?: string, kind?: string): CatalogItem[] {
  return readCatalog(root).filter(item => (!category || item.category === category) && (!kind || item.kind === kind));
}

export function getCatalogItem(id: string, root?: string): CatalogItem {
  const item = readCatalog(root).find(entry => entry.id === id);
  if (!item) {
    const ids = readCatalog(root).map(entry => entry.id).join(', ');
    throw new Error(`"${id}" is not in the catalog. Available: ${ids}`);
  }
  return item;
}

export const STALE_AFTER_DAYS = 180;
const KINDS: CatalogKind[] = ['skill', 'plugin', 'cli', 'reference', 'service', 'mcp'];
const STATUSES: CatalogStatus[] = ['active', 'caution', 'discontinued'];

export interface CatalogIssue {
  id: string;
  level: 'error' | 'warn';
  message: string;
}

/** Structural errors, plus warnings for entries not re-verified recently. */
export function validateCatalog(root?: string, today: Date = new Date()): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const seen = new Set<string>();
  for (const item of readCatalog(root)) {
    const add = (level: CatalogIssue['level'], message: string) => issues.push({ id: item.id, level, message });
    if (seen.has(item.id)) add('error', 'duplicate id');
    seen.add(item.id);
    if (!KINDS.includes(item.kind)) add('error', `unknown kind "${item.kind}"`);
    if (!STATUSES.includes(item.status)) add('error', `unknown status "${item.status}"`);
    if (!/^https:\/\//.test(item.source)) add('error', 'source must be an https URL');
    if (!item.summary || item.install.length === 0 || item.phases.length === 0 || !item.license) add('error', 'summary, install, phases and license are required');
    const verified = Date.parse(item.verified ?? '');
    if (Number.isNaN(verified)) add('error', 'verified must be an ISO date');
    else if ((today.getTime() - verified) / 86_400_000 > STALE_AFTER_DAYS) add('warn', `not verified for more than ${STALE_AFTER_DAYS} days: re-check commands and status`);
  }
  return issues;
}

export interface CatalogComparison {
  item1: CatalogItem;
  item2: CatalogItem;
  sharedPhases: string[];
  sameCategory: boolean;
  sameKind: boolean;
}

export function compareCatalogItems(id1: string, id2: string, root?: string): CatalogComparison {
  const item1 = getCatalogItem(id1, root);
  const item2 = getCatalogItem(id2, root);
  const sharedPhases = item1.phases.filter(p => item2.phases.includes(p));

  return {
    item1,
    item2,
    sharedPhases,
    sameCategory: item1.category === item2.category,
    sameKind: item1.kind === item2.kind,
  };
}

export function checkCatalogHealth(root?: string): { total: number; active: number; caution: number; discontinued: number; issues: CatalogIssue[] } {
  const items = readCatalog(root);
  const issues = validateCatalog(root);
  const active = items.filter(i => i.status === 'active').length;
  const caution = items.filter(i => i.status === 'caution').length;
  const discontinued = items.filter(i => i.status === 'discontinued').length;

  return {
    total: items.length,
    active,
    caution,
    discontinued,
    issues,
  };
}

