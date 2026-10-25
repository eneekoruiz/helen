import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
  beginRecordatoriosAuthorization,
  disconnectRecordatoriosAuthorization,
  RecordatoriosConfigSchema,
  saveRecordatoriosAuthorization,
  syncRecordatorios,
  SyncConflictSchema,
} from "../src/assistant/recordatorios.js";
import {
  addTasks,
  completeTask,
  listTasks,
  TaskSchema,
  type Task,
} from "../src/assistant/tasks.js";
import { readCollection, updateCollection } from "../src/assistant/store.js";
import { getAppMode, setAppMode } from "../src/assistant/appMode.js";

let home: string;
const now = new Date("2026-10-25T10:00:00Z");
const config = RecordatoriosConfigSchema.parse({
  url: "https://pwa.example/",
  tokenEnv: "SYNTHETIC_TOKEN",
});
type Remote = {
  id: string;
  version: number;
  deleted: boolean;
  task: Omit<Task, "id" | "source">;
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-sync-audit-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
it("invalidates pending authorization across process contexts after disconnect or a newer login", () => {
  const stale = beginRecordatoriosAuthorization(home);
  disconnectRecordatoriosAuthorization(home);
  expect(() =>
    saveRecordatoriosAuthorization(
      home,
      config,
      "synthetic-token",
      "owner",
      stale,
    ),
  ).toThrow("cancelled");
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  const superseded = beginRecordatoriosAuthorization(home);
  const current = beginRecordatoriosAuthorization(home);
  expect(() =>
    saveRecordatoriosAuthorization(
      home,
      config,
      "synthetic-token",
      "owner",
      superseded,
    ),
  ).toThrow("cancelled");
  saveRecordatoriosAuthorization(
    home,
    config,
    "synthetic-token",
    "owner",
    current,
  );
  expect(
    JSON.parse(
      fs.readFileSync(path.join(home, "recordatorios-auth.json"), "utf8"),
    ).accountId,
  ).toBe("owner");
});
function backend() {
  const rows = new Map<string, Remote>();
  let accountId = "owner";
  let posts = 0;
  let failAfterCommit = false;
  let beforePost: (() => void) | undefined;
  let mode = { mode: "normal", updatedAt: new Date(0).toISOString() };
  const fetcher = (async (_url: unknown, init?: RequestInit) => {
    if (init?.method !== "POST")
      return Response.json({
        accountId,
        serverTime: now.getTime(),
        tasks: [...rows.values()],
        activeIds: [...rows.values()]
          .filter((row) => !row.deleted)
          .map((row) => row.id),
        mode,
      });
    posts++;
    const body = JSON.parse(String(init.body));
    beforePost?.();
    beforePost = undefined;
    const applied: Remote[] = [];
    const conflicts: Remote[] = [];
    for (const mutation of body.mutations) {
      const old = rows.get(mutation.id);
      if ((old?.version ?? null) !== mutation.expectedVersion) {
        if (old) conflicts.push(structuredClone(old));
        continue;
      }
      const task = {
        text: "",
        list: "inbox",
        status: "open",
        priority: "normal",
        created: now.toISOString(),
        updated: now.toISOString(),
        ...old?.task,
        ...mutation.patch,
      } as Remote["task"];
      if (mutation.patch?.due === null) delete task.due;
      if (task.status === "done") task.done = now.toISOString();
      else delete task.done;
      const row: Remote = {
        id: mutation.id,
        version: (old?.version ?? 0) + 1,
        deleted: mutation.deleted ?? false,
        task,
      };
      rows.set(row.id, row);
      applied.push(structuredClone(row));
    }
    if (body.mode) {
      expect(body.mode.id).toBeUndefined();
      mode = { mode: body.mode.mode, updatedAt: body.mode.updatedAt };
    }
    if (failAfterCommit) {
      failAfterCommit = false;
      throw new Error("Response lost after commit");
    }
    return Response.json({ accountId, applied, conflicts, mode });
  }) as typeof fetch;
  return {
    rows,
    options: { fetcher, env: { SYNTHETIC_TOKEN: "synthetic-token" }, now },
    get posts() {
      return posts;
    },
    switchAccount: () => {
      accountId = "different-owner";
    },
    loseReply: () => {
      failAfterCommit = true;
    },
    beforePost: (fn: () => void) => {
      beforePost = fn;
    },
  };
}
function remote(id = "pwa-1"): Remote {
  return {
    id,
    version: 1,
    deleted: false,
    task: {
      text: "Revisar entrega",
      list: "estudio",
      status: "open",
      priority: "normal",
      created: now.toISOString(),
      updated: now.toISOString(),
    },
  };
}
it("mirrors creation, completion, web edits and seasonal mode in both directions", async () => {
  const api = backend();
  api.rows.set("pwa-1", remote());
  await syncRecordatorios(home, config, api.options);
  const task = listTasks(home)[0]!;
  completeTask(home, task.id, now);
  setAppMode(home, "examenes", now);
  await syncRecordatorios(home, config, api.options);
  expect(api.rows.get("pwa-1")!.task.status).toBe("done");
  expect(getAppMode(home, now)).toBe("examenes");
  const row = api.rows.get("pwa-1")!;
  row.version++;
  row.task.text = "Título cambiado en la web";
  await syncRecordatorios(home, config, api.options);
  expect(listTasks(home, { status: "all" })[0]!.text).toBe(
    "Título cambiado en la web",
  );
});
it("recovers a lost creation response without creating a duplicate", async () => {
  const api = backend();
  addTasks(home, { text: "Llamar", now });
  api.loseReply();
  await expect(syncRecordatorios(home, config, api.options)).rejects.toThrow();
  await syncRecordatorios(home, config, api.options);
  expect(api.rows.size).toBe(1);
  expect(listTasks(home)).toHaveLength(1);
});
it("preserves independent local edits when the web wins a version conflict", async () => {
  const api = backend();
  api.rows.set("pwa-1", remote());
  await syncRecordatorios(home, config, api.options);
  updateCollection(home, "tasks", TaskSchema, (tasks) => {
    tasks[0]!.priority = "high";
  });
  api.beforePost(() => {
    const row = api.rows.get("pwa-1")!;
    row.version++;
    row.task.text = "Cambio concurrente";
  });
  await syncRecordatorios(home, config, api.options);
  await syncRecordatorios(home, config, api.options);
  expect(api.rows.get("pwa-1")!.task).toMatchObject({
    text: "Cambio concurrente",
    priority: "high",
  });
});
it("archives a conflicting local edit before accepting a remote tombstone", async () => {
  const api = backend();
  api.rows.set("pwa-1", remote());
  await syncRecordatorios(home, config, api.options);
  updateCollection(home, "tasks", TaskSchema, (tasks) => {
    tasks[0]!.text = "No pierdas esta edición";
  });
  const row = api.rows.get("pwa-1")!;
  row.version++;
  row.deleted = true;
  await syncRecordatorios(home, config, api.options);
  expect(listTasks(home, { status: "all" })).toHaveLength(0);
  expect(
    readCollection(home, "sync-conflicts", SyncConflictSchema).items[0]!.task
      .text,
  ).toBe("No pierdas esta edición");
});
it("does not resurrect a local task deleted while its creation was in flight", async () => {
  const api = backend();
  addTasks(home, { text: "Eliminar durante envío", now });
  api.beforePost(() =>
    updateCollection(home, "tasks", TaskSchema, (tasks) => {
      tasks.splice(0);
    }),
  );
  await syncRecordatorios(home, config, api.options);
  await syncRecordatorios(home, config, api.options);
  expect(listTasks(home, { status: "all" })).toHaveLength(0);
  expect([...api.rows.values()].every((row) => row.deleted)).toBe(true);
});
it("refuses a different account before uploading any personal changes", async () => {
  const api = backend();
  await syncRecordatorios(home, config, api.options);
  addTasks(home, { text: "Dato privado", now });
  api.switchAccount();
  await expect(syncRecordatorios(home, config, api.options)).rejects.toThrow(
    /account|cuenta/i,
  );
  expect(api.posts).toBe(0);
  expect(listTasks(home)[0]!.text).toBe("Dato privado");
});
it("leaves local changes intact when already cancelled", async () => {
  const api = backend();
  addTasks(home, { text: "Esperar", now });
  const signal = AbortSignal.abort();
  await expect(
    syncRecordatorios(home, config, { ...api.options, signal }),
  ).rejects.toThrow();
  expect(api.posts).toBe(0);
  expect(listTasks(home)[0]!.text).toBe("Esperar");
});
