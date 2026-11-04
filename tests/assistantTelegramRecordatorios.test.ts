import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getConversation } from "../src/assistant/conversation.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { listTasks } from "../src/assistant/tasks.js";
import { handleUpdate } from "../src/assistant/telegram.js";

let home: string;
let config: AssistantConfig;
const secret = "synthetic-service-secret-for-offline-tests";
const code = "a".repeat(64);
const actor = {
  id: "telegram-42-10",
  version: 1,
  deleted: false,
  task: { text: "Preparar paquete", status: "open" },
};
const model = { kind: "command" as const, usesTools: false, answer: vi.fn() };
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-telegram-bridge-"));
  config = writeConfig(
    {
      owner: "Test",
      channels: {
        telegram: {
          allowedChats: [42],
          recordatoriosBridge: {
            enabled: true,
            url: "https://tasks.example/",
            secretEnv: "TEST_SERVICE_SECRET",
          },
        },
      },
    },
    home,
  );
  model.answer.mockReset();
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
function update(text: string, extra: object = {}) {
  return {
    update_id: 10,
    message: {
      message_id: 3,
      chat: { id: 42, type: "private" },
      from: { id: 42 },
      text,
      ...extra,
    },
  };
}
function network(
  result: object = { linked: true, scopes: ["tasks:read", "tasks:write"] },
  status = 200,
) {
  const requests: Array<{
    url: string;
    init: RequestInit;
    body: Record<string, unknown>;
  }> = [];
  const fetcher = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("tasks.example")) {
        requests.push({
          url,
          init: init!,
          body: JSON.parse(String(init!.body)),
        });
        return Response.json(result, {
          status,
          headers: { "X-Refreshed-Token": "never-save-this-jwt" },
        });
      }
      if (url.endsWith("/sendMessage"))
        return Response.json({ ok: true, result: {} });
      throw new Error("Unexpected offline request");
    },
  ) as unknown as typeof fetch;
  return { requests, fetcher };
}
const options = (fetcher: typeof fetch) => ({
  home,
  config,
  token: "offline-bot-token",
  env: { TEST_SERVICE_SECRET: secret },
  fetcher,
  model,
});

it("redeems a code through the existing private handler without JWT storage, model calls or captured history", async () => {
  const net = network();
  expect(
    await handleUpdate(
      update(`/recordatorios vincular ${code}`),
      options(net.fetcher),
    ),
  ).toContain("Vínculo de tareas confirmado");
  expect(net.requests[0].body).toEqual({ subject: "42", code });
  expect(net.requests[0].init.redirect).toBe("error");
  expect(net.requests[0].init.headers).toMatchObject({
    Authorization: `Bearer ${secret}`,
  });
  expect(model.answer).not.toHaveBeenCalled();
  expect(getConversation(home, "telegram:42").history).toBeUndefined();
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  expect(fs.existsSync(path.join(home, "recordatorios-sync.json"))).toBe(false);
});

it("refuses non-private, missing/spoofed, unlisted and forwarded actors before any bridge request", async () => {
  const net = network();
  for (const extra of [
    { chat: { id: 42, type: "group" } },
    { from: { id: 99 } },
    { from: undefined },
    { chat: { id: 99, type: "private" }, from: { id: 99 } },
    { forward_origin: { type: "user" } },
  ])
    await handleUpdate(
      update(`/recordatorios vincular ${code}`, extra),
      options(net.fetcher),
    );
  expect(net.requests).toEqual([]);
  expect(fs.existsSync(path.join(home, "captures.json"))).toBe(false);
  expect(model.answer).not.toHaveBeenCalled();
});

it("stays disabled by default and refuses missing or malformed local service secrets", async () => {
  const net = network();
  config.channels.telegram!.recordatoriosBridge!.enabled = false;
  expect(
    await handleUpdate(update("/recordatorios tareas"), options(net.fetcher)),
  ).toContain("deshabilitado");
  config.channels.telegram!.recordatoriosBridge!.enabled = true;
  for (const value of [undefined, "short", `${secret}\n`])
    expect(
      await handleUpdate(update("/recordatorios tareas"), {
        ...options(net.fetcher),
        env: { TEST_SERVICE_SECRET: value },
      }),
    ).toContain("secreto");
  expect(net.requests).toEqual([]);
  expect(() =>
    writeConfig(
      {
        channels: {
          telegram: { recordatoriosBridge: { url: "http://public.example/" } },
        },
      },
      home,
    ),
  ).toThrow();
});

it("keeps retries stable and creates only a task mutation scoped to the authenticated actor", async () => {
  const net = network({ applied: [actor], conflicts: [] });
  const event = update("/recordatorios añadir Preparar paquete");
  expect(await handleUpdate(event, options(net.fetcher))).toContain(
    "Tarea registrada",
  );
  expect(await handleUpdate(event, options(net.fetcher))).toContain(
    "Tarea registrada",
  );
  expect(net.requests.map((request) => request.body)).toEqual(
    [0, 1].map(() => ({
      subject: "42",
      eventId: "10",
      operation: "write",
      payload: {
        mutations: [
          {
            id: "telegram-42-10",
            expectedVersion: null,
            patch: { text: "Preparar paquete" },
          },
        ],
      },
    })),
  );
  expect(listTasks(home)).toEqual([]);
  expect(model.answer).not.toHaveBeenCalled();
});

it("shows task IDs/versions and uses an explicit version when completing a remote task", async () => {
  const read = network({
    tasks: [actor],
    mode: { reason: "not-task-data" },
    accountId: "private-account",
  });
  const answer = await handleUpdate(
    update("/recordatorios tareas"),
    options(read.fetcher),
  );
  expect(answer).toContain("telegram-42-10 · versión: 1");
  expect(answer).not.toContain("private-account");
  expect(answer).not.toContain("not-task-data");
  expect(read.requests[0].body).toEqual({
    subject: "42",
    eventId: "10",
    operation: "read",
  });
  const done = network({
    applied: [
      { ...actor, version: 2, task: { ...actor.task, status: "done" } },
    ],
    conflicts: [],
  });
  expect(
    await handleUpdate(
      update("/recordatorios completar telegram-42-10 1"),
      options(done.fetcher),
    ),
  ).toContain("Tarea completada");
  expect(done.requests[0].body).toMatchObject({
    payload: {
      mutations: [
        {
          id: "telegram-42-10",
          expectedVersion: 1,
          patch: { status: "done" },
        },
      ],
    },
  });
});

it("never reports conflicts, uncertain/partial responses or malformed success bodies as completed", async () => {
  for (const [body, status] of [
    [{ uncertain: true }, 202],
    [{ applied: [], conflicts: [actor] }, 200],
    [{ applied: [], conflicts: [] }, 200],
    [{ error: "private server detail" }, 503],
    [{ error: "reused" }, 409],
    [{}, 200],
  ] as const) {
    const net = network(body, status);
    const answer = await handleUpdate(
      update("/recordatorios completar telegram-42-10 1"),
      options(net.fetcher),
    );
    expect(answer).not.toContain("Tarea completada");
    expect(answer).not.toContain("private server detail");
    expect(net.requests).toHaveLength(1);
  }
  expect(listTasks(home)).toEqual([]);
});

it("rejects unsupported commands, malformed codes, controls and identity fields without network/model fallback", async () => {
  const net = network();
  for (const text of [
    "/recordatorios vincular invalid",
    "/recordatorios finanzas gasto 20",
    "/recordatorios userId other",
    "/recordatorios completar id -1",
    `/recordatorios añadir ${"x".repeat(301)}`,
    "/recordatorios añadir a\nb",
  ])
    await handleUpdate(update(text), options(net.fetcher));
  expect(net.requests).toEqual([]);
  expect(model.answer).not.toHaveBeenCalled();
});

it("does not expose service secrets or remote exception details after a failed transport", async () => {
  const fetcher = (async (input) => {
    if (String(input).includes("tasks.example"))
      throw new Error(`${secret}: internal-private-error`);
    return Response.json({ ok: true, result: {} });
  }) as typeof fetch;
  const answer = await handleUpdate(
    update("/recordatorios tareas"),
    options(fetcher),
  );
  expect(answer).not.toContain(secret);
  expect(answer).not.toContain("internal-private-error");
});
