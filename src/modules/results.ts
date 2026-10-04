import type { ModuleResult } from '../core/context.js';
import { patchPackageJson, readJson } from '../core/fs.js';
import path from 'node:path';

/** Keep scaffold diagnostics consistent with the filesystem mutation that occurred. */
export function recordFileResult(
  result: ModuleResult,
  file: string,
  status: 'created' | 'modified' | 'overwritten' | 'skipped',
): void {
  const entries = status === 'created' ? result.created
    : status === 'skipped' ? result.skipped : result.modified;
  if (!entries.includes(file)) entries.push(file);
}

/** Scaffold defaults fill missing dependencies without replacing a project's chosen versions. */
export function addMissingDependencies(
  cwd: string,
  defaults: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  options: { dryRun?: boolean } = {},
): 'created' | 'modified' | 'skipped' {
  const pkg = readJson<typeof defaults>(path.join(cwd, 'package.json'));
  const existing = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const patches: typeof defaults = {};
  for (const section of ['dependencies', 'devDependencies'] as const) {
    const missing = Object.fromEntries(Object.entries(defaults[section] ?? {}).filter(([name]) => !existing[name]));
    if (Object.keys(missing).length > 0) patches[section] = missing;
  }
  return Object.keys(patches).length ? patchPackageJson(cwd, patches, options) : 'skipped';
}
