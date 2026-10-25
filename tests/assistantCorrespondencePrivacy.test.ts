import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import {
  getConversation,
  saveConversation,
} from "../src/assistant/conversation.js";
import { AssistantConfigSchema } from "../src/assistant/home.js";
import type { LanguageModel, ModelRequest } from "../src/assistant/llm.js";

let home: string;
let previous: string | undefined;
const now = new Date("2026-10-24T10:00:00Z");
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-mail-privacy-"));
  previous = process.env.HELEN_MAIL_PRIVACY_TEST_TOKEN;
  process.env.HELEN_MAIL_PRIVACY_TEST_TOKEN = "synthetic-token";
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  if (previous === undefined) delete process.env.HELEN_MAIL_PRIVACY_TEST_TOKEN;
  else process.env.HELEN_MAIL_PRIVACY_TEST_TOKEN = previous;
});
function config(allowSensitive = false) {
  return AssistantConfigSchema.parse({
    owner: "Test",
    timezone: "Europe/Madrid",
    provider: {
      type: "anthropic",
      model: "synthetic-test-model",
      allowSensitive,
    },
    gmail: {
      account: "owner@example.org",
      accessTokenEnv: "HELEN_MAIL_PRIVACY_TEST_TOKEN",
      contacts: { Ana: "ana@example.org" },
    },
  });
}
function model(check: (request: ModelRequest) => void): LanguageModel {
  return {
    kind: "anthropic",
    usesTools: true,
    answer: async (request) => {
      check(request);
      return { text: "Respuesta pública de prueba.", toolCalls: [] };
    },
  };
}
const fetcher = (async (url: string | URL) =>
  Response.json(
    String(url).endsWith("/profile")
      ? { emailAddress: "owner@example.org" }
      : { id: "draft-1" },
  )) as typeof fetch;
function ask(
  text: string,
  extra: Partial<Parameters<typeof handleMessage>[1]> = {},
) {
  return handleMessage(text, {
    home,
    channel: "web",
    conversation: "owner",
    ownerVerified: true,
    config: config(),
    model: null,
    now,
    fetcher,
    ...extra,
  });
}

it("marks literal draft correspondence private even without sensitive keywords, honors provider opt-in and blocks speakers", async () => {
  const body = "El regalo sorpresa es un telescopio azul.";
  const draft = await ask(`Redacta un correo a Ana: ${body}`);
  expect(draft.text).toContain(body);
  const history = getConversation(home, "web:owner", now).history!;
  expect(history).toHaveLength(2);
  expect(history.every((turn) => turn.sensitive)).toBe(true);
  await ask("no");
  for (const [allowSensitive, speaker, expected] of [
    [false, false, false],
    [true, false, true],
    [true, true, false],
  ] as const) {
    let called = false;
    await ask("Explica la astronomía", {
      config: config(allowSensitive),
      speaker,
      model: model((request) => {
        called = true;
        expect(JSON.stringify(request.history).includes(body)).toBe(expected);
      }),
    });
    expect(called).toBe(true);
  }
});

it("withholds unrecognized composing requests and Gmail tools while preserving public Gmail questions", async () => {
  const body = "El regalo sorpresa es una bicicleta amarilla";
  let called = false;
  await ask(`Escribe un correo para Ana explicando: ${body}`, {
    model: model((request) => {
      called = true;
      expect(request.user).not.toContain(body);
      expect(request.user).toContain("Private message withheld");
      expect(request.tools.some((tool) => tool.name.startsWith("gmail_"))).toBe(
        false,
      );
    }),
  });
  expect(called).toBe(true);
  expect(
    getConversation(home, "web:owner", now).history!.every(
      (turn) => turn.sensitive,
    ),
  ).toBe(true);
  await ask("¿Qué es Gmail?", {
    model: model((request) => {
      expect(request.user).toContain("¿Qué es Gmail?");
      expect(JSON.stringify(request.history)).not.toContain(body);
    }),
  });
});

it("also filters legacy draft exchanges whose historical flags predate correspondence classification", async () => {
  const conversation = getConversation(home, "web:owner", now);
  conversation.history = [
    { role: "user", content: "Escribe un correo para Ana", sensitive: false },
    {
      role: "assistant",
      content: "Nos vemos en el observatorio secreto.",
      sensitive: false,
    },
  ];
  saveConversation(home, conversation, now);
  let called = false;
  await ask("Explica astronomía", {
    model: model((request) => {
      called = true;
      expect(JSON.stringify(request.history)).not.toContain(
        "observatorio secreto",
      );
    }),
  });
  expect(called).toBe(true);
});
