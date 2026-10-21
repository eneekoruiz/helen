import { execFileSync, spawnSync } from "node:child_process";
import crypto, { X509Certificate } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AlexaVerificationError,
  createAlexaVerifier,
  handleAlexa,
  interactionModel,
  nativeReminderBody,
  REMINDERS_SCOPE,
  utteranceFor,
  validCertUrl,
  verifyChain,
  type AlexaRequestEnvelope,
} from "../src/assistant/alexa.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { addReminder, listReminders } from "../src/assistant/reminders.js";

const hasOpenssl = spawnSync("openssl", ["version"]).status === 0;
const SKILL = "amzn1.ask.skill.11111111-2222-3333-4444-555555555555";
const USER = "amzn1.ask.account.TESTUSER";
const CERT_URL = "https://s3.amazonaws.com/echo.api/echo-api-cert-12.pem";
const NOW = new Date("2026-10-20T08:30:00Z");

describe("certificate chain URL (Amazon's rules)", () => {
  it.each([
    ["https://s3.amazonaws.com/echo.api/echo-api-cert.pem", true],
    ["https://s3.amazonaws.com:443/echo.api/echo-api-cert.pem", true],
    ["https://s3.amazonaws.com/echo.api/../echo.api/echo-api-cert.pem", true],
    ["HTTPS://S3.AMAZONAWS.COM/echo.api/echo-api-cert.pem", true],
    ["http://s3.amazonaws.com/echo.api/echo-api-cert.pem", false],
    ["https://notamazon.com/echo.api/echo-api-cert.pem", false],
    ["https://s3.amazonaws.com/EcHo.aPi/echo-api-cert.pem", false],
    ["https://s3.amazonaws.com/invalid.path/echo-api-cert.pem", false],
    ["https://s3.amazonaws.com:563/echo.api/echo-api-cert.pem", false],
    ["https://s3.amazonaws.com/echo.api/../invalid.path/cert.pem", false],
    ["https://user:pass@s3.amazonaws.com/echo.api/cert.pem", false],
    ["not a url", false],
  ])("%s -> %s", (url, valid) => expect(validCertUrl(url)).toBe(valid));
});

describe.skipIf(!hasOpenssl)("request verification", () => {
  // The test certificates are valid from the moment they are generated, so this block runs on the real clock.
  const NOW = new Date(Date.now() + 90_000); // after the certificates are generated
  let dir: string;
  let chain: string;
  let leafKey: crypto.KeyObject;
  let root: X509Certificate;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-alexa-certs-"));
    const run = (...args: string[]) =>
      execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });
    run(
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "ca.key",
      "-out",
      "ca.pem",
      "-days",
      "3650",
      "-subj",
      "/CN=HELEN Test Root",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
      "-addext",
      "keyUsage=critical,keyCertSign,cRLSign",
    );
    run(
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "leaf.key",
      "-out",
      "leaf.csr",
      "-subj",
      "/CN=echo-api.amazon.com",
    );
    fs.writeFileSync(
      path.join(dir, "ext.cnf"),
      "subjectAltName=DNS:echo-api.amazon.com\nbasicConstraints=CA:FALSE\n",
    );
    run(
      "x509",
      "-req",
      "-in",
      "leaf.csr",
      "-CA",
      "ca.pem",
      "-CAkey",
      "ca.key",
      "-CAcreateserial",
      "-out",
      "leaf.pem",
      "-days",
      "3650",
      "-extfile",
      "ext.cnf",
    );
    run(
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "other.key",
      "-out",
      "other.csr",
      "-subj",
      "/CN=evil.example.com",
    );
    fs.writeFileSync(
      path.join(dir, "other.cnf"),
      "subjectAltName=DNS:evil.example.com\n",
    );
    run(
      "x509",
      "-req",
      "-in",
      "other.csr",
      "-CA",
      "ca.pem",
      "-CAkey",
      "ca.key",
      "-CAcreateserial",
      "-out",
      "other.pem",
      "-days",
      "3650",
      "-extfile",
      "other.cnf",
    );
    chain = `${fs.readFileSync(path.join(dir, "leaf.pem"), "utf8")}${fs.readFileSync(path.join(dir, "ca.pem"), "utf8")}`;
    leafKey = crypto.createPrivateKey(
      fs.readFileSync(path.join(dir, "leaf.key")),
    );
    root = new X509Certificate(fs.readFileSync(path.join(dir, "ca.pem")));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const body = (
    overrides: Partial<AlexaRequestEnvelope["request"]> = {},
    skill = SKILL,
  ) =>
    Buffer.from(
      JSON.stringify({
        version: "1.0",
        context: {
          System: {
            application: { applicationId: skill },
            user: { userId: USER },
          },
        },
        request: {
          type: "LaunchRequest",
          requestId: "r1",
          timestamp: NOW.toISOString(),
          locale: "es-ES",
          ...overrides,
        },
      }),
    );
  const sign = (raw: Buffer, key = leafKey) =>
    crypto.sign("sha256", raw, key).toString("base64");
  const verifier = (
    options: Partial<Parameters<typeof createAlexaVerifier>[0]> = {},
  ) => {
    let downloads = 0;
    const verify = createAlexaVerifier({
      skillIds: [SKILL],
      roots: [root],
      now: () => NOW,
      fetcher: (async () => {
        downloads += 1;
        return new Response(chain);
      }) as typeof fetch,
      ...options,
    });
    return { verify, downloads: () => downloads };
  };

  it("accepts a correctly signed, fresh request for an allowed skill, and caches the certificate", async () => {
    const { verify, downloads } = verifier();
    const raw = body();
    expect(
      (await verify(raw, { certUrl: CERT_URL, signature256: sign(raw) }))
        .request.type,
    ).toBe("LaunchRequest");
    await verify(raw, { certUrl: CERT_URL, signature256: sign(raw) });
    expect(downloads()).toBe(1);
  });

  it("rejects a body changed after signing, a foreign key, missing headers and bad URLs", async () => {
    const { verify } = verifier();
    const raw = body();
    const tampered = Buffer.from(
      raw.toString().replace("LaunchRequest", "IntentRequest"),
    );
    await expect(
      verify(tampered, { certUrl: CERT_URL, signature256: sign(raw) }),
    ).rejects.toThrow(/signature does not match/);
    const other = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    }).privateKey;
    await expect(
      verify(raw, { certUrl: CERT_URL, signature256: sign(raw, other) }),
    ).rejects.toThrow(/signature does not match/);
    await expect(verify(raw, { certUrl: CERT_URL })).rejects.toThrow(
      AlexaVerificationError,
    );
    await expect(
      verify(raw, {
        certUrl: "https://evil.example.com/echo.api/cert.pem",
        signature256: sign(raw),
      }),
    ).rejects.toThrow(/not an Amazon certificate URL/);
  });

  it("rejects old or future requests (150 seconds) and unknown skills or accounts", async () => {
    const { verify } = verifier();
    const old = body({
      timestamp: new Date(NOW.getTime() - 151_000).toISOString(),
    });
    await expect(
      verify(old, { certUrl: CERT_URL, signature256: sign(old) }),
    ).rejects.toThrow(/too old/);
    const ok = body({
      timestamp: new Date(NOW.getTime() - 149_000).toISOString(),
    });
    await expect(
      verify(ok, { certUrl: CERT_URL, signature256: sign(ok) }),
    ).resolves.toBeTruthy();
    const foreign = body(
      {},
      "amzn1.ask.skill.99999999-0000-0000-0000-000000000000",
    );
    await expect(
      verify(foreign, { certUrl: CERT_URL, signature256: sign(foreign) }),
    ).rejects.toThrow(/skill id is not allowed/);
    const pinned = verifier({
      userIds: ["amzn1.ask.account.SOMEONEELSE"],
    }).verify;
    await expect(
      pinned(ok, { certUrl: CERT_URL, signature256: sign(ok) }),
    ).rejects.toThrow(/account is not allowed/);
    const unset = verifier({ skillIds: [] }).verify;
    await expect(
      unset(ok, { certUrl: CERT_URL, signature256: sign(ok) }),
    ).rejects.toThrow(/No skill id is allowed yet/);
  });

  it("checks the chain itself: right name, trusted root, valid dates", () => {
    expect(verifyChain(chain, NOW, [root]).subject).toContain(
      "echo-api.amazon.com",
    );
    expect(() => verifyChain(chain, NOW, [])).toThrow(/trusted root/);
    expect(() =>
      verifyChain(chain, new Date("2100-01-01T00:00:00Z"), [root]),
    ).toThrow(/expired/);
    const wrongName = `${fs.readFileSync(path.join(dir, "other.pem"), "utf8")}${fs.readFileSync(path.join(dir, "ca.pem"), "utf8")}`;
    expect(() => verifyChain(wrongName, NOW, [root])).toThrow(
      /not for echo-api.amazon.com/,
    );
    expect(() => verifyChain("", NOW, [root])).toThrow(/empty/);
  });
});

describe("the skill", () => {
  let home: string;
  let config: AssistantConfig;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-alexa-"));
    config = writeConfig(
      {
        owner: "Eneko",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        alexa: { skillIds: [SKILL] },
      },
      home,
    );
  });

  const envelope = (
    request: Partial<AlexaRequestEnvelope["request"]>,
  ): AlexaRequestEnvelope => ({
    version: "1.0",
    context: {
      System: {
        application: { applicationId: SKILL },
        user: { userId: USER },
        apiEndpoint: "https://api.eu.amazonalexa.com",
        apiAccessToken: "token-abc",
      },
    },
    request: {
      type: "IntentRequest",
      timestamp: NOW.toISOString(),
      locale: "es-ES",
      ...request,
    },
  });
  const intent = (name: string, slots: Record<string, string> = {}) =>
    envelope({
      intent: {
        name,
        slots: Object.fromEntries(
          Object.entries(slots).map(([slot, value]) => [
            slot,
            { name: slot, value },
          ]),
        ),
      },
    });

  /** A stand-in for the Alexa Reminders API that records every call. */
  function remindersApi(status = 201) {
    const calls: Array<{
      url: string;
      method: string;
      body?: Record<string, unknown>;
      auth?: string;
    }> = [];
    const fetcher = (async (url: string | URL, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method ?? "GET",
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
        auth: new Headers(init?.headers).get("authorization") ?? undefined,
      });
      if (init?.method === "DELETE") return new Response(null, { status: 200 });
      return status === 201
        ? new Response(
            JSON.stringify({ alertToken: "alert-1", status: "ON" }),
            { status: 201 },
          )
        : new Response(
            JSON.stringify({ code: "UNAUTHORIZED", message: "no permission" }),
            { status },
          );
    }) as typeof fetch;
    return { calls, fetcher };
  }

  it("greets on launch and keeps the session open", async () => {
    const response = await handleAlexa(envelope({ type: "LaunchRequest" }), {
      home,
      config,
      now: NOW,
      model: null,
    });
    expect(response.response.outputSpeech?.text).toContain("Hola, Eneko");
    expect(response.response.shouldEndSession).toBe(false);
  });

  it("turns a voice reminder into a HELEN reminder and a native Echo reminder", async () => {
    const api = remindersApi();
    const response = await handleAlexa(
      intent("RemindIntent", { texto: "mañana a las nueve llamar a mamá" }),
      { home, config, now: NOW, model: null, fetcher: api.fetcher },
    );
    expect(response.response.outputSpeech?.text).toMatch(
      /llamar a mamá.*Sonará en tu Echo/,
    );
    const [reminder] = listReminders(home);
    expect(reminder).toMatchObject({
      text: "llamar a mamá",
      due: "2026-10-21T07:00:00.000Z",
      alexaAlertToken: "alert-1",
      source: "alexa",
    });
    expect(api.calls[0]).toMatchObject({
      url: "https://api.eu.amazonalexa.com/v1/alerts/reminders",
      method: "POST",
      auth: "Bearer token-abc",
    });
    expect(api.calls[0]!.body).toMatchObject({
      trigger: {
        type: "SCHEDULED_ABSOLUTE",
        scheduledTime: "2026-10-21T09:00:00.000",
        timeZoneId: "Europe/Madrid",
      },
      alertInfo: {
        spokenInfo: { content: [{ locale: "es-ES", text: "llamar a mamá" }] },
      },
    });
  });

  it("asks for the reminders permission when missing, finishes the job when granted, and does not nag after a no", async () => {
    const denied = remindersApi(401);
    const ask = await handleAlexa(
      intent("RemindIntent", { texto: "mañana a las nueve llamar a mamá" }),
      { home, config, now: NOW, model: null, fetcher: denied.fetcher },
    );
    const directive = ask.response.directives?.[0] as {
      type: string;
      name: string;
      token: string;
      payload: { permissionScopes: Array<{ permissionScope: string }> };
    };
    expect(directive).toMatchObject({
      type: "Connections.SendRequest",
      name: "AskFor",
    });
    expect(directive.payload.permissionScopes[0]!.permissionScope).toBe(
      REMINDERS_SCOPE,
    );
    const reminderId = directive.token;
    expect(listReminders(home)[0]!.id).toBe(reminderId);

    const granted = remindersApi();
    const done = await handleAlexa(
      envelope({
        type: "Connections.Response",
        name: "AskFor",
        token: reminderId,
        payload: { status: "ACCEPTED" },
      }),
      { home, config, now: NOW, fetcher: granted.fetcher },
    );
    expect(done.response.outputSpeech?.text).toMatch(
      /sonará en tu Echo mañana/,
    );
    expect(listReminders(home)[0]!.alexaAlertToken).toBe("alert-1");

    const no = await handleAlexa(
      envelope({
        type: "Connections.Response",
        name: "AskFor",
        token: reminderId,
        payload: { status: "DENIED" },
      }),
      { home, config, now: NOW, fetcher: granted.fetcher },
    );
    expect(no.response.outputSpeech?.text).toContain("Sin permiso");
    const again = await handleAlexa(
      intent("RemindIntent", {
        texto: "el viernes a las cinco ir al dentista",
      }),
      {
        home,
        config,
        now: NOW,
        model: null,
        fetcher: remindersApi(401).fetcher,
      },
    );
    expect(again.response.directives).toBeUndefined();
    expect(again.response.outputSpeech?.text).toContain("ir al dentista");
  });

  it("cancelling by voice also removes the native reminder", async () => {
    const api = remindersApi();
    await handleAlexa(
      intent("RemindIntent", { texto: "mañana a las nueve llamar a mamá" }),
      { home, config, now: NOW, model: null, fetcher: api.fetcher },
    );
    const response = await handleAlexa(
      intent("CancelReminderIntent", { texto: "mamá" }),
      { home, config, now: NOW, model: null, fetcher: api.fetcher },
    );
    expect(response.response.outputSpeech?.text).toContain("Cancelado");
    expect(api.calls.at(-1)).toMatchObject({
      method: "DELETE",
      url: "https://api.eu.amazonalexa.com/v1/alerts/reminders/alert-1",
    });
  });

  it("never reads private notes aloud", async () => {
    const { addMemory } = await import("../src/assistant/memory.js");
    addMemory(home, { text: "El código del portal es 4532", source: "cli" });
    const response = await handleAlexa(
      intent("AskIntent", { texto: "el código del portal" }),
      { home, config, now: NOW, model: null },
    );
    expect(response.response.outputSpeech?.text).not.toContain("4532");
    expect(response.response.outputSpeech?.text).toContain("privado");
  });

  it("keeps the microphone open when HELEN asks back", async () => {
    const response = await handleAlexa(
      intent("RemindIntent", { texto: "comprar un regalo para Ana" }),
      { home, config, now: NOW, model: null },
    );
    expect(response.response.outputSpeech?.text).toBe(
      "¿Cuándo te lo recuerdo?",
    );
    expect(response.response.shouldEndSession).toBe(false);
  });

  it("answers stop, fallback and session end like Alexa expects", async () => {
    expect(
      (
        await handleAlexa(intent("AMAZON.StopIntent"), {
          home,
          config,
          now: NOW,
        })
      ).response.shouldEndSession,
    ).toBe(true);
    expect(
      (
        await handleAlexa(intent("AMAZON.FallbackIntent"), {
          home,
          config,
          now: NOW,
        })
      ).response.shouldEndSession,
    ).toBe(false);
    expect(
      (
        await handleAlexa(envelope({ type: "SessionEndedRequest" }), {
          home,
          config,
          now: NOW,
        })
      ).response,
    ).toEqual({});
  });

  it("builds the Reminders API body for schedules, including recurrence rules", () => {
    const reminder = addReminder(
      home,
      { text: "sacar la basura los martes y jueves a las 21" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    const body = nativeReminderBody(
      reminder,
      "Europe/Madrid",
      "es-ES",
      NOW,
    ) as {
      trigger: {
        recurrence: { recurrenceRules: string[]; startDateTime: string };
      };
    };
    expect(body.trigger.recurrence.recurrenceRules).toEqual([
      "FREQ=WEEKLY;BYDAY=TU,TH;BYHOUR=21;BYMINUTE=0;BYSECOND=0;INTERVAL=1;",
    ]);
    expect(body.trigger.recurrence.startDateTime).toBe(
      "2026-10-20T21:00:00.000",
    );
  });

  it("rebuilds sentences from intents and slots", () => {
    expect(
      utteranceFor(
        {
          name: "RemindIntent",
          slots: { texto: { name: "texto", value: "mañana a las 9 llamar" } },
        },
        "es",
      ),
    ).toBe("recuérdame mañana a las 9 llamar");
    expect(
      utteranceFor(
        {
          name: "AgendaIntent",
          slots: {
            cuando: {
              name: "cuando",
              value: "para mañana",
              resolutions: {
                resolutionsPerAuthority: [
                  {
                    status: { code: "ER_SUCCESS_MATCH" },
                    values: [{ value: { name: "mañana" } }],
                  },
                ],
              },
            },
          },
        },
        "es",
      ),
    ).toBe("qué tengo mañana");
    expect(utteranceFor({ name: "AgendaIntent" }, "en")).toBe(
      "what do I have today",
    );
    expect(utteranceFor({ name: "RemindIntent", slots: {} }, "es")).toBeNull();
  });
});

describe("interaction model", () => {
  for (const locale of ["es-ES", "en-US"]) {
    it(`is valid for ${locale}: carrier phrases, declared slots, no punctuation`, () => {
      const model = interactionModel(locale) as {
        interactionModel: {
          languageModel: {
            invocationName: string;
            intents: Array<{
              name: string;
              slots?: Array<{ name: string; type: string }>;
              samples: string[];
            }>;
            types: Array<{ name: string }>;
          };
        };
      };
      const language = model.interactionModel.languageModel;
      expect(language.invocationName).toMatch(/^[a-záéíóúñ ]+$/);
      expect(language.invocationName.split(" ").length).toBeGreaterThanOrEqual(
        2,
      );
      const types = new Set(language.types.map((type) => type.name));
      for (const intent of language.intents) {
        const slots = new Set((intent.slots ?? []).map((slot) => slot.name));
        for (const slot of intent.slots ?? [])
          if (!slot.type.startsWith("AMAZON."))
            expect(types.has(slot.type)).toBe(true);
        for (const sample of intent.samples) {
          expect(sample).not.toMatch(/[?¿!¡.,]/);
          for (const used of sample.match(/\{(\w+)\}/g) ?? [])
            expect(slots.has(used.slice(1, -1))).toBe(true);
          // A search query slot always needs words around it.
          if (/\{(texto|text)\}/.test(sample))
            expect(sample.replace(/\{\w+\}/, "").trim().length).toBeGreaterThan(
              0,
            );
        }
        expect(new Set(intent.samples).size).toBe(intent.samples.length);
      }
    });
  }
});
