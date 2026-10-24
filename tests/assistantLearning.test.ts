import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { getConversation } from "../src/assistant/conversation.js";
import { readConfig } from "../src/assistant/home.js";
import type { LanguageModel, ModelRequest } from "../src/assistant/llm.js";
import { addMemory, getMemory, listMemory } from "../src/assistant/memory.js";
import {
  RegressionCaseSchema,
  prepareRegression,
} from "../src/assistant/regressions.js";
import { listReminders } from "../src/assistant/reminders.js";
import { readCollection } from "../src/assistant/store.js";
import { runTelegramBot } from "../src/assistant/telegram.js";
import { handleAlexa } from "../src/assistant/alexa.js";

let home: string;
const now = new Date("2026-10-24T10:00:00Z");
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-learning-"));
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});
const config = () => ({ ...readConfig(home), timezone: "Europe/Madrid" });
const model = (
  answer: (request: ModelRequest) => Promise<string>,
): LanguageModel => ({
  kind: "anthropic",
  usesTools: true,
  answer: async (request) => ({ text: await answer(request), toolCalls: [] }),
});
const ask = (
  text: string,
  extra: Partial<Parameters<typeof handleMessage>[1]> = {},
) =>
  handleMessage(text, {
    home,
    channel: "cli",
    config: config(),
    now,
    model: null,
    ...extra,
  });

it("corrects a memory in place, exposes its source and makes it expire", async () => {
  const note = addMemory(home, {
    text: "Prefiero estudiar por la tarde",
    source: "telegram",
    now,
  });
  await ask(`corrige el recuerdo ${note.id}: Prefiero estudiar por la mañana`);
  expect(listMemory(home)).toHaveLength(1);
  expect(getMemory(home, note.id)!.body).toContain("mañana");
  const source = await ask("de dónde sabes que prefiero estudiar");
  expect(source.text).toContain("telegram");
  expect(source.text).toContain("creado");
  await ask(`haz temporal el recuerdo ${note.id} hasta mañana a las 18`);
  expect(getMemory(home, note.id)!.expires).toBeDefined();
  expect(
    listMemory(home, { now: new Date("2026-10-27T10:00:00Z") }),
  ).toHaveLength(0);
});

it("creates temporary memories offline and rejects invalid or past expiry", async () => {
  await ask(
    "recuerda hasta mañana a las 18: las llaves están en el cajón azul",
  );
  expect(listMemory(home)).toHaveLength(1);
  expect(listMemory(home)[0]!.expires).toContain("2026-10-25");
  await ask("recuerda hasta ayer: esto no se guarda");
  expect(listMemory(home)).toHaveLength(1);
});

it("does not reveal a private memory's provenance through a speaker", async () => {
  addMemory(home, {
    text: "Código del portal azul",
    sensitive: true,
    source: "telegram",
  });
  const answer = await ask("de dónde sabes código del portal", {
    channel: "alexa",
  });
  expect(answer.text).not.toContain("telegram");
  expect(answer.text).not.toContain("Código del portal azul");
});

it("lets the model inspect provenance and change expiry without rewriting the fact", async () => {
  const note = addMemory(home, {
    text: "Estudio por la tarde",
    source: "telegram",
    now,
  });
  await ask("Ayúdame a revisar mis preferencias", {
    model: model(async (request) => {
      const search = request.tools.find(
        (tool) => tool.name === "memory_search",
      )!;
      expect(await search.run({ query: "estudio" })).toContain(
        '"source":"telegram"',
      );
      const update = request.tools.find(
        (tool) => tool.name === "memory_update",
      )!;
      await expect(
        update.run({ id: note.id, expires: "2026-10-23T10:00:00Z" }),
      ).rejects.toThrow("future");
      await update.run({ id: note.id, expires: "2026-10-26T10:00:00Z" });
      await update.run({ id: note.id, expires: null });
      return "Hecho";
    }),
  });
  expect(getMemory(home, note.id)!.expires).toBeUndefined();
  expect(getMemory(home, note.id)!.body).toBe(note.body);
  expect(getMemory(home, note.id)!.title).toBe(note.title);
});

it("interrupts active and queued actions while a new topic proceeds immediately", async () => {
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  const old = ask("Ayúdame a preparar la llamada", {
    model: model(async (request) => {
      const add = request.tools.find((tool) => tool.name === "reminder_add")!;
      await add.run({ what: "primera llamada", when: "mañana a las 9" });
      started();
      await waiting;
      expect(request.signal?.aborted).toBe(true);
      await expect(
        add.run({ what: "segunda llamada", when: "mañana a las 10" }),
      ).rejects.toThrow("cancelled");
      return "Respuesta antigua";
    }),
  });
  await entered;
  const queued = ask("recuérdame comprar café mañana a las 11");
  expect((await ask("espera, eso no")).text).toContain("completadas");
  const fresh = await ask("Cambiemos de tema", {
    model: model(async () => "Tema nuevo"),
  });
  expect(fresh.text).toBe("Tema nuevo");
  release();
  expect((await old).intent).toBe("stop");
  expect((await queued).intent).toBe("stop");
  expect(listReminders(home)).toHaveLength(1);
  expect(
    JSON.stringify(getConversation(home, "cli:default", now).history),
  ).not.toContain("Respuesta antigua");
});

it("drops a pending question when the owner changes their mind", async () => {
  await ask("recuérdame llamar a mamá");
  await ask("espera");
  expect(getConversation(home, "cli:default", now).pending).toBeUndefined();
  await ask("mañana a las 9");
  expect(listReminders(home)).toHaveLength(0);
});

it("does not use a new dated command as the answer to an older date question", async () => {
  await ask("recuérdame llamar a mamá");
  await ask("recuérdame otra llamada mañana a las 10");
  expect(listReminders(home)).toHaveLength(1);
  expect(listReminders(home)[0]!.text).toContain("otra llamada");
  expect(getConversation(home, "cli:default", now).pending).toBeUndefined();
});

it("only persists a redacted regression after preview and explicit confirmation", async () => {
  await ask("Mi correo es test@example.org", {
    model: model(async () => "Lo he entendido"),
  });
  const preview = await ask("prepara prueba: debería explicar que no lo sabe");
  expect(preview.text).toContain("[email]");
  expect(preview.text).not.toContain("test@example.org");
  expect(
    readCollection(home, "assistant-regressions", RegressionCaseSchema).items,
  ).toHaveLength(0);
  await ask("no");
  expect(
    readCollection(home, "assistant-regressions", RegressionCaseSchema).items,
  ).toHaveLength(0);
  await ask("prepara prueba: debería explicar que no lo sabe");
  await ask("sí");
  const examples = readCollection(
    home,
    "assistant-regressions",
    RegressionCaseSchema,
  ).items;
  expect(examples).toHaveLength(1);
  expect(JSON.stringify(examples)).not.toContain("test@example.org");
});

it("refuses regression examples containing private turns or credentials", () => {
  const options = { now, timezone: "Europe/Madrid", requiresModel: true };
  expect(() =>
    prepareRegression(
      [{ role: "user", content: "dato privado", sensitive: true }],
      "answer",
      options,
    ),
  ).toThrow("privada");
  expect(() =>
    prepareRegression(
      [
        {
          role: "user",
          content: "token: abcdefghijklmnopqrstuvwxyz",
          sensitive: false,
        },
      ],
      "answer",
      options,
    ),
  ).toThrow("credenciales");
});

it("routes Alexa stop and session-end events through pending-request cancellation", async () => {
  const conversation = "echo-test";
  for (const event of ["AMAZON.StopIntent", "SessionEndedRequest"]) {
    await ask("recuérdame llamar a mamá", { channel: "alexa", conversation });
    await handleAlexa(
      {
        session: { user: { userId: conversation } },
        request: {
          type: event === "SessionEndedRequest" ? event : "IntentRequest",
          timestamp: now.toISOString(),
          intent: { name: event },
        },
      },
      { home, config: config(), now, model: null },
    );
    expect(
      getConversation(home, `alexa:${conversation}`, now).pending,
    ).toBeUndefined();
  }
});

it("receives a Telegram stop from a later poll while the model is still running", async () => {
  const controller = new AbortController();
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const sent: string[] = [];
  let polls = 0;
  const fetcher = (async (url: string | URL, init?: RequestInit) => {
    if (String(url).endsWith("/getUpdates")) {
      polls++;
      if (polls === 2) await started;
      if (polls > 2 && !init?.signal?.aborted)
        await new Promise<void>((resolve) =>
          init?.signal?.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        );
      return new Response(
        JSON.stringify({
          ok: true,
          result:
            polls > 2
              ? []
              : [
                  {
                    update_id: polls,
                    message: {
                      message_id: polls,
                      chat: { id: 42 },
                      text:
                        polls === 1
                          ? "Ayúdame a preparar una llamada"
                          : "espera, eso no",
                    },
                  },
                ],
        }),
      );
    }
    const body = JSON.parse(String(init?.body));
    sent.push(body.text);
    if (body.text.includes("Detengo")) controller.abort();
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }) as typeof fetch;
  await runTelegramBot({
    home,
    config: {
      ...config(),
      channels: {
        ...config().channels,
        telegram: { tokenEnv: "TEST_TOKEN", allowedChats: [42] },
      },
    },
    env: { TEST_TOKEN: "synthetic-token" },
    signal: controller.signal,
    fetcher,
    model: model(async (request) => {
      entered();
      await new Promise<void>((resolve) =>
        request.signal!.addEventListener("abort", () => resolve(), {
          once: true,
        }),
      );
      await expect(
        request.tools
          .find((tool) => tool.name === "reminder_add")!
          .run({ what: "No debe guardarse", when: "mañana a las 9" }),
      ).rejects.toThrow("cancelled");
      return "Respuesta antigua";
    }),
  });
  expect(polls).toBeGreaterThanOrEqual(2);
  expect(sent.some((text) => text.includes("Detengo"))).toBe(true);
  expect(listReminders(home)).toHaveLength(0);
});
