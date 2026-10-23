import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { withHomeLock, writePrivate } from "./home.js";

/**
 * Small JSON collections in the personal home (reminders.json, tasks.json). Every change happens under the
 * home lock and is written atomically, so the CLI, the server, the Telegram bot and the scheduler can all
 * work at once. A damaged entry is skipped and reported, never silently "repaired" over the owner's data.
 */
export interface Collection<T> {
  version: 1;
  items: T[];
}

export interface LoadedCollection<T> extends Collection<T> {
  /** Entries that did not validate (kept on disk untouched until the owner fixes or removes them). */
  invalid: unknown[];
}

function collectionFile(home: string, name: string): string {
  return path.join(home, `${name}.json`);
}

export function readCollection<T>(
  home: string,
  name: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): LoadedCollection<T> {
  const file = collectionFile(home, name);
  if (!fs.existsSync(file)) return { version: 1, items: [], invalid: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `${file} is not valid JSON (${(error as Error).message}). Fix it or move it away; HELEN will not overwrite it.`,
    );
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    (raw as { version?: unknown }).version !== 1 ||
    !Array.isArray((raw as { items?: unknown }).items)
  )
    throw new Error(
      `${file} has an invalid collection envelope; HELEN will not overwrite it.`,
    );
  const entries = (raw as { items: unknown[] }).items;
  const items: T[] = [];
  const invalid: unknown[] = [];
  for (const entry of entries) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
    else invalid.push(entry);
  }
  return { version: 1, items, invalid };
}

/** Read, change and write a collection atomically. Invalid entries are written back as they were. */
export function updateCollection<T, R>(
  home: string,
  name: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  change: (items: T[]) => R,
): R {
  return withHomeLock(home, () => {
    const loaded = readCollection(home, name, schema);
    const result = change(loaded.items);
    writePrivate(
      collectionFile(home, name),
      `${JSON.stringify({ version: 1, items: [...loaded.items, ...loaded.invalid] }, null, 2)}\n`,
    );
    return result;
  });
}
