import fs from 'node:fs';
import path from 'node:path';
import { getSkillsRoot } from './skills.js';

export type CatalogStatus = 'active' | 'caution' | 'discontinued';

export type CatalogKind = 'skill' | 'plugin' | 'cli' | 'reference' | 'service';

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

export function listCatalog(category?: string, root?: string): CatalogItem[] {
  return readCatalog(root).filter(item => !category || item.category === category);
}

export function getCatalogItem(id: string, root?: string): CatalogItem {
  const item = readCatalog(root).find(entry => entry.id === id);
  if (!item) {
    const ids = readCatalog(root).map(entry => entry.id).join(', ');
    throw new Error(`"${id}" is not in the catalog. Available: ${ids}`);
  }
  return item;
}
