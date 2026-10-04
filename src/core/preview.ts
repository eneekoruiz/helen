import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';

/** A file write planned while a preview action is running. Paths are absolute. */
export interface PlannedChange {
  path: string;
  before: string | null;
  after: string;
  /** True when the write helper plans to create a .helen-backup if none exists. */
  backup?: boolean;
}

interface PreviewContext {
  changes: Map<string, PlannedChange>;
}

const previewContext = new AsyncLocalStorage<PreviewContext>();

/**
 * Record the final content a dry-run write would produce. Repeated writes to a
 * path are folded into one change, retaining the first observed `before` value.
 */
export function recordPlannedWrite(
  filePath: string,
  before: string | null,
  after: string,
  details?: { backup?: boolean },
): void {
  const context = previewContext.getStore();
  if (!context) return;

  const resolved = path.resolve(filePath);
  const existing = context.changes.get(resolved);
  context.changes.set(resolved, {
    path: resolved,
    before: existing ? existing.before : before,
    after,
    ...(details?.backup === undefined ? {} : { backup: details.backup }),
  });
}

/** Return the latest planned file contents in this preview, if one was recorded. */
export function getPlannedContent(filePath: string): string | undefined {
  return previewContext.getStore()?.changes.get(path.resolve(filePath))?.after;
}

/** Run an action with an isolated write collector and return its planned writes. */
export async function withPreview<T>(
  action: () => Promise<T>,
): Promise<{ result: T; changes: PlannedChange[] }> {
  const context: PreviewContext = { changes: new Map() };
  const result = await previewContext.run(context, action);
  const changes = [...context.changes.values()].filter(({ before, after }) => before !== after);
  return { result, changes };
}

function isSensitivePath(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  return base === '.helenrc' || /^\.env(?:$|\.)/.test(base) || /^\.?secrets?(?:\.|$)/.test(base) ||
    /(?:^|\.)credentials?(?:\.|$)/.test(base);
}

function displayPath(filePath: string, cwd: string): string {
  const relative = path.relative(path.resolve(cwd), path.resolve(filePath)) || '.';
  // Keep paths on one terminal line and prevent control-sequence injection.
  return relative.split(path.sep).join('/')
    .split('').map(char => {
      const code = char.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159) ? `\\x${code.toString(16).padStart(2, '0')}` : char;
    }).join('');
}

function fileKind(change: PlannedChange): 'create' | 'modify' {
  return change.before === null ? 'create' : 'modify';
}

const MAX_DIFF_LINES = 300;
const MAX_DIFF_CHARS = 24_000;

/** Produce a compact line-oriented unified diff without invoking an external tool. */
function unifiedDiff(before: string | null, after: string): string {
  const oldLines = before === null ? [] : before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  const rows: Array<{ kind: ' ' | '+' | '-'; text: string }> = [];
  let truncated = false;

  // LCS yields readable contextual hunks for ordinary generated files. Bound
  // the matrix for large inputs and fall back to a complete replacement.
  if ((oldLines.length + 1) * (newLines.length + 1) > 200_000) {
    for (const text of oldLines) {
      if (rows.length >= MAX_DIFF_LINES) { truncated = true; break; }
      rows.push({ kind: '-', text });
    }
    if (!truncated) {
      for (const text of newLines) {
        if (rows.length >= MAX_DIFF_LINES) { truncated = true; break; }
        rows.push({ kind: '+', text });
      }
    }
  } else {
    const dp = Array.from({ length: oldLines.length + 1 }, () => new Uint32Array(newLines.length + 1));
    for (let i = oldLines.length - 1; i >= 0; i--) {
      for (let j = newLines.length - 1; j >= 0; j--) {
        dp[i]![j] = oldLines[i] === newLines[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
      }
    }
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        rows.push({ kind: ' ', text: oldLines[i++]! });
        j++;
      } else if (j < newLines.length && (i === oldLines.length || dp[i]![j + 1]! >= dp[i + 1]![j]!)) {
        rows.push({ kind: '+', text: newLines[j++]! });
      } else {
        rows.push({ kind: '-', text: oldLines[i++]! });
      }
    }
  }

  const output: string[] = [];
  let charCount = 0;
  for (const { kind, text } of rows) {
    const line = `${kind}${text}`;
    if (output.length >= MAX_DIFF_LINES || charCount + line.length > MAX_DIFF_CHARS) {
      truncated = true;
      break;
    }
    output.push(line);
    charCount += line.length + 1;
  }
  if (truncated) output.push('… diff truncated …');
  return output.join('\n');
}

/** Render changes for a human-readable CLI preview. Secret configuration files are redacted. */
export function renderPreview(changes: PlannedChange[], cwd: string): string {
  if (changes.length === 0) return 'No file changes planned.';
  return changes.map((change) => {
    const name = displayPath(change.path, cwd);
    const header = `${fileKind(change)} ${name}`;
    if (isSensitivePath(change.path)) return `${header}\n[content redacted]`;
    const diff = unifiedDiff(change.before, change.after);
    const lines = [`--- ${change.before === null ? '/dev/null' : `a/${name}`}`, `+++ b/${name}`];
    if (change.backup) lines.push('backup: .helen-backup (created if absent; reused if present)');
    if (diff) lines.push(diff);
    return `${header}\n${lines.join('\n')}`;
  }).join('\n\n');
}

/** Safe JSON representation; secret file bodies are always omitted. */
export function previewToJSON(changes: PlannedChange[], cwd: string): Array<{
  path: string;
  operation: 'create' | 'modify';
  before: string | null;
  after: string | null;
  backup?: boolean;
  redacted?: true;
}> {
  return changes.map((change) => {
    const base = { path: displayPath(change.path, cwd), operation: fileKind(change) };
    if (isSensitivePath(change.path)) {
      return { ...base, before: null, after: null, ...(change.backup === undefined ? {} : { backup: change.backup }), redacted: true as const };
    }
    return {
      ...base,
      before: change.before,
      after: change.after,
      ...(change.backup === undefined ? {} : { backup: change.backup }),
    };
  });
}
