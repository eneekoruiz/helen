import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
import {
  addTasks,
  completeTask,
  reopenTask,
  listTasks,
  TaskSchema,
} from "../src/assistant/tasks.js";
import { getAppMode } from "../src/assistant/appMode.js";
import { runWeeklyReview } from "../src/assistant/weeklyRitual.js";
import { tick } from "../src/assistant/scheduler.js";
import { recordatoriosPushChannel } from "../src/assistant/recordatoriosPush.js";
import { RecordatoriosConfigSchema } from "../src/assistant/recordatorios.js";
import { deliver, type Notification } from "../src/assistant/notify.js";
import { updateCollection } from "../src/assistant/store.js";

let home: string;
const now = new Date("2026-10-25T18:15:00Z");
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-productivity-"));
  writeConfig(
    {
      owner: "Test",
      timezone: "Europe/Madrid",
      locale: "es-ES",
      channels: { desktop: false, console: false },
    },
    home,
  );
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
const ask = (text: string, ownerVerified = true) =>
  handleMessage(text, {
    home,
    config: readConfig(home),
    model: null,
    channel: "web",
    conversation: "owner",
    ownerVerified,
    now,
  });
it("switches the actual mode from spoken input and refuses an unverified actor", async () => {
  expect((await ask("Oye Helen, activa el modo exámenes")).text).toContain(
    "Modo examenes activado",
  );
  expect(getAppMode(home, now)).toBe("examenes");
  await ask("modo vacaciones", false);
  expect(getAppMode(home, now)).toBe("examenes");
  await ask("modo vacaciones");
  expect(getAppMode(home, now)).toBe("vacaciones");
});
it("uses retained routine completions for streaks even after a task reopens", () => {
  const [task] = addTasks(home, {
    text: "Estudiar",
    list: "estudio",
    now: new Date("2026-10-20T10:00Z"),
  }).added;
  completeTask(home, task!.id, new Date("2026-10-23T10:00Z"));
  reopenTask(home, task!.id);
  completeTask(home, task!.id, new Date("2026-10-24T10:00Z"));
  reopenTask(home, task!.id);
  completeTask(home, task!.id, new Date("2026-10-25T10:00Z"));
  completeTask(home, task!.id, now);
  const review = runWeeklyReview(home, {
    now,
    timezone: "Europe/Madrid",
    locale: "es-ES",
    lang: "es",
  });
  expect(review.completionCountLast7Days).toBe(3);
  expect(review.streak.currentDays).toBe(3);
  expect(listTasks(home, { status: "all" })[0]!.done).toBe(
    "2026-10-25T10:00:00.000Z",
  );
});
it("schedules the Sunday review once with a durable delivery identifier", async () => {
  const received: Notification[] = [];
  const channels = [
    {
      name: "phone",
      local: false,
      send: async (event: Notification) => {
        received.push(event);
      },
    },
  ];
  await tick(home, { now, channels });
  await tick(home, { now, channels });
  expect(received).toHaveLength(1);
  expect(received[0]!.title).toContain("semanal");
  expect(received[0]!.id).toMatch(/^[a-f0-9]{64}$/);
});
it("does not speak private list identifiers in urgency recommendations", async () => {
  addTasks(home, { text: "Dato confidencial", list: "87654321x", now });
  addTasks(home, { text: "Regar plantas", now });
  const answer = await handleMessage("qué es lo más urgente", {
    home,
    model: null,
    channel: "alexa",
    ownerVerified: true,
    now,
  });
  expect(answer.text).not.toContain("Dato confidencial");
  expect(answer.speech).not.toContain("87654321");
});
it("preserves private text on the lock screen and classifies ambiguous push delivery", async () => {
  const config = RecordatoriosConfigSchema.parse({
    url: "https://pwa.example/",
    tokenEnv: "TOKEN",
  });
  let uncertain = false;
  let body: Record<string, unknown> = {};
  const fetcher = (async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return Response.json(
      uncertain ? { delivered: 0, uncertain: true } : { delivered: 1 },
    );
  }) as typeof fetch;
  const channel = recordatoriosPushChannel(home, config, {
    fetcher,
    env: { TOKEN: "synthetic-token" },
  });
  const event: Notification = {
    id: "event-1",
    title: "HELEN",
    text: "contenido privado",
    sensitive: true,
    kind: "reminder",
    lang: "es",
  };
  expect((await deliver(event, [channel]))[0]!.ok).toBe(true);
  expect(body.text).not.toContain("contenido privado");
  expect(body.id).toBe("event-1");
  uncertain = true;
  expect((await deliver(event, [channel]))[0]).toMatchObject({
    ok: false,
    uncertain: true,
  });
});
it("does not expose private shopping entries through supermarket buttons", async () => {
  addTasks(home, { text: "Pan", list: "compra", now });
  updateCollection(home, "tasks", TaskSchema, (tasks) =>
    tasks.push({ ...tasks[0]!, id: "tabc123", text: "DNI 87654321X" }),
  );
  const answer = await ask("modo supermercado");
  expect(answer.text).toContain("Pan");
  expect(JSON.stringify(answer)).not.toContain("87654321");
});
