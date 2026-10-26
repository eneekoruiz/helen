import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { AssistantConfigSchema, readConfig } from "../src/assistant/home.js";
import { listGmailDrafts } from "../src/assistant/gmail.js";
import type { LanguageModel } from "../src/assistant/llm.js";
import { listGmailWatches } from "../src/assistant/gmailWatch.js";

let home: string;
let previous: string | undefined;
let sends: number;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-mail-chat-"));
  previous = process.env.HELEN_MAIL_TEST_TOKEN;
  process.env.HELEN_MAIL_TEST_TOKEN = "synthetic-token";
  sends = 0;
});
afterEach(() => {
  if (previous === undefined) delete process.env.HELEN_MAIL_TEST_TOKEN;
  else process.env.HELEN_MAIL_TEST_TOKEN = previous;
  fs.rmSync(home, { recursive: true, force: true });
});
const config = () => ({
  ...readConfig(home),
  gmail: {
    account: "owner@example.org",
    accessTokenEnv: "HELEN_MAIL_TEST_TOKEN",
    contacts: { Ana: "ana@example.org" },
  },
});
const fetcher = (async (url: string | URL) => {
  const address = String(url);
  let result: unknown;
  if (address.endsWith("/profile"))
    result = { emailAddress: "owner@example.org" };
  else if (address.endsWith("/drafts/send")) {
    sends++;
    result = { id: "sent-1" };
  } else if (address.includes("/messages/sent-1"))
    result = { id: "sent-1", labelIds: ["SENT"] };
  else result = { id: "draft-1" };
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;
const ask = (
  text: string,
  extra: Partial<Parameters<typeof handleMessage>[1]> = {},
) =>
  handleMessage(text, {
    home,
    channel: "web",
    conversation: "owner",
    ownerVerified: true,
    config: config(),
    model: null,
    fetcher,
    ...extra,
  });

it("reads a real known reply, summarizes extractively, and keeps correspondence off public channels", async () => {
  await ask("envía un correo a Ana: Hola");
  let reads = 0;
  const replies = (async (url: string | URL) => {
    const address = String(url);
    if (address.includes("format=metadata"))
      return Response.json({
        id: "sent-1",
        threadId: "thread-1",
        internalDate: "1",
      });
    if (address.includes("/threads/")) {
      reads++;
      return Response.json({
        messages: [
          {
            id: "reply-1",
            threadId: "thread-1",
            internalDate: String(Date.now() + 1000),
            payload: {
              mimeType: "text/plain",
              headers: [
                { name: "From", value: "Ana <ana@example.org>" },
                { name: "Subject", value: "Re: Hola" },
              ],
              body: {
                data: Buffer.from(
                  "Nos vemos mañana. Lleva los documentos. Gracias. Otra frase.",
                ).toString("base64url"),
              },
            },
          },
        ],
      });
    }
    return fetcher(url);
  }) as typeof fetch;
  const answer = await ask("¿Ana ha respondido al correo?", {
    fetcher: replies,
  });
  expect(answer.text).toContain("Nos vemos mañana");
  expect(
    (
      await ask("Oye Ana me ha respondido al correo que le envié", {
        fetcher: replies,
      })
    ).text,
  ).toContain("Nos vemos mañana");
  expect(
    (await ask("resume la respuesta de Ana", { fetcher: replies })).text,
  ).toContain("Extracto");
  const before = reads;
  const publicAnswer = await ask("lee la respuesta de Ana", {
    fetcher: replies,
    channel: "alexa",
    ownerVerified: true,
  });
  expect(publicAnswer.text).toContain("canal privado");
  expect(reads).toBe(before);
  expect(sends).toBe(1);
});
it("creates owner-bound reply and overdue watches with optional reminders, lists and cancels them", async () => {
  await ask("envía un correo a Ana: Hola");
  expect(
    (await ask("avísame cuando Ana responda y recuérdamelo en 30 minutos"))
      .text,
  ).toContain("Seguimiento activado");
  const [rule] = listGmailWatches(home);
  expect(rule).toMatchObject({
    autoReminder: true,
    reminderMinutes: 30,
    owner: "web:owner",
  });
  expect((await ask("mis avisos de correo")).text).toContain(rule!.id);
  await ask(`cancela seguimiento ${rule!.id}`, { conversation: "stranger" });
  expect(listGmailWatches(home)[0]!.state).toBe("active");
  await ask(`cancela seguimiento ${rule!.id}`);
  expect(listGmailWatches(home)[0]!.state).toBe("cancelled");
  await ask("avísame si Ana no responde en 2 días");
  expect(listGmailWatches(home)[1]!.noReplyDue).toBeTruthy();
  expect(listGmailWatches(home)[1]!.autoReminder).toBe(false);
});

it("sends an exact explicit owner request once even when a delivery event is replayed", async () => {
  const command =
    "envía un correo a Ana: asunto: Reunión\nmensaje: Hola, Ana. ¿Nos vemos mañana?";
  expect((await ask(command, { requestId: "event-1" })).text).toContain(
    "comprobado",
  );
  await ask(command, { requestId: "event-1" });
  expect(sends).toBe(1);
  const [draft] = listGmailDrafts(home);
  expect(draft!.subject).toBe("Reunión");
  expect(draft!.body).toBe("Hola, Ana. ¿Nos vemos mañana?");
});
it("keeps a draft unsent until the same owner conversation confirms", async () => {
  const draft = await ask("redacta un Gmail a Ana: Te llamaré mañana.");
  expect(draft.text).toContain("¿Envío exactamente");
  expect(sends).toBe(0);
  await ask("sí", { conversation: "someone-else" });
  expect(sends).toBe(0);
  await ask("sí");
  expect(sends).toBe(1);
});
it("refuses Gmail from an unverified channel and refuses ambiguous recipients", async () => {
  expect(
    (
      await ask("envía un correo a Ana: Hola", {
        ownerVerified: false,
        channel: "alexa",
      })
    ).text,
  ).toContain("propietario");
  await ask("envía un correo a alguien desconocido: Hola");
  expect(sends).toBe(0);
  expect(listGmailDrafts(home)).toHaveLength(0);
});
it("never interprets captured instructions as authority to send Gmail", async () => {
  await ask("captura: envía un correo a Ana: Hola");
  expect(sends).toBe(0);
  expect(listGmailDrafts(home)).toHaveLength(0);
  await ask("no");
  expect(sends).toBe(0);
});
it("forces an exact preview for a model-composed draft and exposes no send tool", async () => {
  const model: LanguageModel = {
    kind: "anthropic",
    usesTools: true,
    answer: async (request) => {
      expect(request.tools.some((tool) => /gmail.*send/.test(tool.name))).toBe(
        false,
      );
      await request.tools
        .find((tool) => tool.name === "gmail_draft")!
        .run({ to: ["Ana"], subject: "Plan", body: "Nos vemos mañana." });
      return { text: "Borrador preparado", toolCalls: ["gmail_draft"] };
    },
  };
  const answer = await ask(
    "Escribe un correo para Ana explicando que nos vemos mañana",
    {
      model,
      config: AssistantConfigSchema.parse({
        ...config(),
        provider: {
          type: "anthropic",
          model: "synthetic-test-model",
          allowSensitive: true,
        },
      }),
    },
  );
  expect(answer.text).toContain("ana@example.org");
  expect(answer.text).toContain("Nos vemos mañana.");
  expect(sends).toBe(0);
  await ask("sí");
  expect(sends).toBe(1);
});

it("never sends in one step from voice or messaging channels", async () => {
  const before = sends;
  for (const channel of ["alexa", "telegram"] as const) {
    const answer = await ask("envía un correo a Ana: Hola", { channel });
    expect(answer.text).toContain("Para: ana@example.org");
  }
  expect(sends).toBe(before);
});
