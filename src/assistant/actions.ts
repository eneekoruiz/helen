import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { withHomeLock, writePrivate } from "./home.js";
import { ReminderSchema } from "./reminders.js";
import { TaskSchema } from "./tasks.js";
import { readCollection, updateCollection } from "./store.js";

const schema = z.object({
  id: z.string(),
  expires: z.string().datetime(),
  reminders: z.array(
    z.object({
      before: ReminderSchema.nullable(),
      after: ReminderSchema.nullable(),
    }),
  ),
  tasks: z.array(
    z.object({ before: TaskSchema.nullable(), after: TaskSchema.nullable() }),
  ),
});
export function actionSnapshot(home: string) {
  return {
    reminders: readCollection(home, "reminders", ReminderSchema).items,
    tasks: readCollection(home, "tasks", TaskSchema).items,
  };
}

export function runAction<T>(
  home: string,
  id: string,
  now: Date,
  action: () => T,
): T {
  return withHomeLock(home, () => {
    const before = actionSnapshot(home);
    const result = action();
    recordAction(home, id, before, now);
    return result;
  });
}

function changes<T extends { id: string }>(before: T[], after: T[]) {
  return [...new Set([...before, ...after].map((item) => item.id))].flatMap(
    (id) => {
      const a = before.find((item) => item.id === id) ?? null;
      const b = after.find((item) => item.id === id) ?? null;
      return JSON.stringify(a) === JSON.stringify(b)
        ? []
        : [{ before: a, after: b }];
    },
  );
}

/** Only one short-lived undo entry per conversation; another writer's changes must never be overwritten. */
export function recordAction(
  home: string,
  id: string,
  before: ReturnType<typeof actionSnapshot>,
  now: Date,
) {
  const after = actionSnapshot(home);
  const reminders = changes(before.reminders, after.reminders);
  const tasks = changes(before.tasks, after.tasks);
  if (!reminders.length && !tasks.length) return;
  updateCollection(home, "recent-actions", schema, (items) => {
    const fresh = items.filter(
      (item) => item.id !== id && Date.parse(item.expires) > now.getTime(),
    );
    fresh.push({
      id,
      reminders,
      tasks,
      expires: new Date(now.getTime() + 600_000).toISOString(),
    });
    items.splice(0, items.length, ...fresh);
  });
}

export function undoAction(home: string, id: string, now: Date): void {
  withHomeLock(home, () => {
    const loaded = readCollection(home, "recent-actions", schema);
    const entry = loaded.items.find(
      (item) => item.id === id && Date.parse(item.expires) > now.getTime(),
    );
    if (!entry)
      throw new Error(
        "No hay una acción reciente que deshacer / No recent action to undo.",
      );
    const reminders = readCollection(home, "reminders", ReminderSchema);
    const tasks = readCollection(home, "tasks", TaskSchema);
    if (
      entry.reminders.some(
        (patch) =>
          patch.before?.status === "pending" &&
          Date.parse(patch.before.due) <= now.getTime(),
      )
    )
      throw new Error("No puedo restaurar un aviso cuya hora ya ha pasado.");
    const apply = <T extends { id: string }>(
      items: T[],
      patches: Array<{ before: T | null; after: T | null }>,
    ) => {
      for (const patch of patches) {
        const key = (patch.after ?? patch.before)!.id;
        const current = items.find((item) => item.id === key) ?? null;
        if (JSON.stringify(current) !== JSON.stringify(patch.after))
          throw new Error(
            "La acción cambió desde entonces; no puedo deshacerla sin sobrescribir datos.",
          );
        const index = items.findIndex((item) => item.id === key);
        if (index >= 0) items.splice(index, 1);
        if (patch.before) items.push(patch.before);
      }
    };
    apply(reminders.items, entry.reminders);
    apply(tasks.items, entry.tasks);
    // Validate all comparisons before writing either collection.
    for (const [name, collection] of [
      ["reminders", reminders],
      ["tasks", tasks],
    ] as const)
      writePrivate(
        path.join(home, `${name}.json`),
        JSON.stringify({
          version: 1,
          items: [...collection.items, ...collection.invalid],
        }),
      );
    writePrivate(
      path.join(home, "recent-actions.json"),
      JSON.stringify({
        version: 1,
        items: loaded.items.filter((item) => item !== entry),
      }),
    );
  });
}

export function clearActions(home: string): void {
  fs.rmSync(path.join(home, "recent-actions.json"), { force: true });
}
