import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUIDE_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'GUIA.md');

export function readGuide(file: string = GUIDE_FILE): string {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : 'Guide not found (docs/GUIA.md).';
}
