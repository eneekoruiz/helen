import fs from 'node:fs';
import path from 'node:path';
import { isSafeProjectPath } from './fs.js';

/**
 * Append-only coordination log (.helen/events.jsonl).
 *
 * Every claim, handoff, completion and failure is recorded so that any agent can resume a plan,
 * a human can audit what happened, and nothing depends on an agent remembering its conversation.
 */
export interface HelenEvent {
  ts: string;
  type: string;
  agent?: string;
  item?: string;
  data?: Record<string, unknown>;
}

export interface EventFilter {
  type?: string | string[];
  item?: string;
  agent?: string;
  since?: string;
  limit?: number;
}

const MAX_LOG_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 8000;

export function eventsFile(cwd: string): string {
  return path.join(cwd, '.helen', 'events.jsonl');
}

/** Remove control characters and cap length; events are data for other agents, never markup or commands. */
export function cleanText(value: string, max = MAX_TEXT): string {
  return Array.from(value).filter(char => {
    const code = char.charCodeAt(0);
    return code >= 32 || code === 10 || code === 9;
  }).join('').slice(0, max);
}

function cleanData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof value === 'string') out[key] = cleanText(value);
    else if (Array.isArray(value)) out[key] = value.slice(0, 100).map(entry => (typeof entry === 'string' ? cleanText(entry, 500) : entry));
    else out[key] = value;
  }
  return out;
}

export function appendEvent(cwd: string, event: Omit<HelenEvent, 'ts'> & { ts?: string }): HelenEvent {
  const file = eventsFile(cwd);
  if (!isSafeProjectPath(cwd, file)) throw new Error('The events log must remain inside the project directory');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const complete: HelenEvent = {
    ts: event.ts ?? new Date().toISOString(),
    type: cleanText(event.type, 80),
    ...(event.agent ? { agent: cleanText(event.agent, 64) } : {}),
    ...(event.item ? { item: cleanText(event.item, 100) } : {}),
    ...(event.data ? { data: cleanData(event.data) } : {}),
  };
  try {
    if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, path.join(path.dirname(file), 'events.1.jsonl'));
  } catch {
    // No log yet.
  }
  // One write call with O_APPEND: concurrent writers never interleave inside a line.
  fs.appendFileSync(file, `${JSON.stringify(complete)}\n`, { mode: 0o600 });
  return complete;
}

function parseLines(file: string): HelenEvent[] {
  if (!fs.existsSync(file)) return [];
  const events: HelenEvent[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as HelenEvent;
      if (value && typeof value.ts === 'string' && typeof value.type === 'string') events.push(value);
    } catch {
      // A torn or foreign line must not make the whole log unreadable.
    }
  }
  return events;
}

export function readEvents(cwd: string, filter: EventFilter = {}): HelenEvent[] {
  const file = eventsFile(cwd);
  if (!isSafeProjectPath(cwd, file)) throw new Error('The events log must remain inside the project directory');
  const types = filter.type === undefined ? undefined : Array.isArray(filter.type) ? filter.type : [filter.type];
  let events = parseLines(file).filter(event =>
    (!types || types.some(type => (type.endsWith('*') ? event.type.startsWith(type.slice(0, -1)) : event.type === type))) &&
    (!filter.item || event.item === filter.item) &&
    (!filter.agent || event.agent === filter.agent) &&
    (!filter.since || event.ts > filter.since));
  if (filter.limit !== undefined && filter.limit >= 0) events = events.slice(-filter.limit);
  return events;
}
