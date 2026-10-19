import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root of the installed package (or of the source checkout when running from `src`). */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let cachedVersion: string | undefined;

/** The one source of truth for the HELEN version: package.json. */
export function helenVersion(): string {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version?: unknown };
    cachedVersion = typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}
