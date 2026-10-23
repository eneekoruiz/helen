import crypto, { X509Certificate } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { handleMessage, whenText, type BrainReply } from "./brain.js";
import { attachAlexaToken, listReminders, type Reminder } from "./reminders.js";
import { writePrivate, type AssistantConfig } from "./home.js";
import type { LanguageModel } from "./llm.js";
import { localParts } from "./time.js";

/**
 * Alexa custom skill endpoint ("Alexa, pídele a asistente helen que...").
 *
 * Every request is verified as Amazon documents it for skills hosted as a web service: the certificate chain
 * URL, the signing certificate (dates, echo-api.amazon.com, chain to a trusted root), the Signature-256 of the
 * exact body, a timestamp within 150 seconds and an allowed skill id. Reminders made by voice are mirrored as
 * native Alexa reminders, so the Echo itself rings at the time.
 */
export const REMINDERS_SCOPE = "alexa::alerts:reminders:skill:readwrite";
const TOLERANCE_MS = 150_000;
const CERT_HOST = "s3.amazonaws.com";
const CERT_SAN = "echo-api.amazon.com";

export class AlexaVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlexaVerificationError";
  }
}

/** Amazon's rules for SignatureCertChainUrl, after normalizing dot segments and duplicate slashes. */
export function validCertUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const path = url.pathname.replace(/\/{2,}/g, "/");
  return (
    url.protocol === "https:" &&
    url.hostname === CERT_HOST &&
    (url.port === "" || url.port === "443") &&
    path.startsWith("/echo.api/") &&
    !url.username &&
    !url.password
  );
}

function splitPem(pem: string): X509Certificate[] {
  const blocks =
    pem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    ) ?? [];
  return blocks.map((block) => new X509Certificate(block));
}

let systemRoots: X509Certificate[] | null = null;
function trustedRoots(): X509Certificate[] {
  systemRoots ??= tls.rootCertificates.map((pem) => new X509Certificate(pem));
  return systemRoots;
}

function current(cert: X509Certificate, now: Date): boolean {
  return (
    Date.parse(cert.validFrom) <= now.getTime() &&
    now.getTime() <= Date.parse(cert.validTo)
  );
}

/** Check the signing certificate and its chain; returns the leaf whose key signs requests. */
export function verifyChain(
  pem: string,
  now: Date,
  roots: X509Certificate[] = trustedRoots(),
): X509Certificate {
  const chain = splitPem(pem);
  const leaf = chain[0];
  if (!leaf)
    throw new AlexaVerificationError("The certificate chain is empty.");
  if (!chain.every((cert) => current(cert, now)))
    throw new AlexaVerificationError(
      "A certificate in the chain is expired or not yet valid.",
    );
  const names = (leaf.subjectAltName ?? "").split(/,\s*/);
  if (!names.includes(`DNS:${CERT_SAN}`))
    throw new AlexaVerificationError(
      `The signing certificate is not for ${CERT_SAN}.`,
    );
  for (let index = 0; index < chain.length - 1; index += 1) {
    const cert = chain[index]!;
    const issuer = chain[index + 1]!;
    if (!cert.checkIssued(issuer) || !cert.verify(issuer.publicKey))
      throw new AlexaVerificationError("The certificate chain is broken.");
  }
  const top = chain.at(-1)!;
  const anchored = roots.some(
    (root) =>
      root.fingerprint256 === top.fingerprint256 ||
      (top.checkIssued(root) &&
        top.verify(root.publicKey) &&
        current(root, now)),
  );
  if (!anchored)
    throw new AlexaVerificationError(
      "The certificate chain does not lead to a trusted root.",
    );
  return leaf;
}

export interface VerifierOptions {
  skillIds: string[];
  userIds?: string[];
  fetcher?: typeof fetch;
  roots?: X509Certificate[];
  now?: () => Date;
}

export interface AlexaHeaders {
  certUrl?: string;
  signature256?: string;
}

/** Builds a verifier that caches certificate chains by URL until they expire. */
export function createAlexaVerifier(
  options: VerifierOptions,
): (rawBody: Buffer, headers: AlexaHeaders) => Promise<AlexaRequestEnvelope> {
  const cache = new Map<string, { leaf: X509Certificate; until: number }>();
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  return async (rawBody, headers) => {
    if (!headers.certUrl || !headers.signature256)
      throw new AlexaVerificationError(
        "Missing SignatureCertChainUrl or Signature-256.",
      );
    if (!validCertUrl(headers.certUrl))
      throw new AlexaVerificationError(
        "SignatureCertChainUrl is not an Amazon certificate URL.",
      );
    const at = now();
    let entry = cache.get(headers.certUrl);
    if (!entry || entry.until < at.getTime()) {
      const response = await fetcher(headers.certUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok)
        throw new AlexaVerificationError(
          `Could not download the signing certificate (HTTP ${response.status}).`,
        );
      const pem = await response.text();
      if (pem.length > 64 * 1024)
        throw new AlexaVerificationError("The certificate chain is too large.");
      const leaf = verifyChain(pem, at, options.roots);
      entry = {
        leaf,
        until: Math.min(Date.parse(leaf.validTo), at.getTime() + 24 * 3600_000),
      };
      if (cache.size > 20) cache.clear();
      cache.set(headers.certUrl, entry);
    }
    const signature = Buffer.from(headers.signature256, "base64");
    if (!crypto.verify("sha256", rawBody, entry.leaf.publicKey, signature))
      throw new AlexaVerificationError(
        "The request signature does not match its body.",
      );
    let envelope: AlexaRequestEnvelope;
    try {
      envelope = JSON.parse(rawBody.toString("utf8")) as AlexaRequestEnvelope;
    } catch {
      throw new AlexaVerificationError("The body is not JSON.");
    }
    const timestamp = Date.parse(envelope?.request?.timestamp ?? "");
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(at.getTime() - timestamp) > TOLERANCE_MS
    )
      throw new AlexaVerificationError(
        "The request is too old or from the future.",
      );
    const skill =
      envelope.context?.System?.application?.applicationId ??
      envelope.session?.application?.applicationId;
    if (options.skillIds.length === 0)
      throw new AlexaVerificationError(
        "No skill id is allowed yet: run helen assistant config set alexa.skillIds '[\"amzn1.ask.skill....\"]'.",
      );
    if (!skill || !options.skillIds.includes(skill))
      throw new AlexaVerificationError("This skill id is not allowed.");
    const user =
      envelope.context?.System?.user?.userId ?? envelope.session?.user?.userId;
    if (
      options.userIds &&
      options.userIds.length > 0 &&
      (!user || !options.userIds.includes(user))
    )
      throw new AlexaVerificationError("This Alexa account is not allowed.");
    return envelope;
  };
}

// ---------------------------------------------------------------------------------------------
// Requests and responses
// ---------------------------------------------------------------------------------------------

export interface AlexaSlot {
  name: string;
  value?: string;
  resolutions?: {
    resolutionsPerAuthority?: Array<{
      status?: { code?: string };
      values?: Array<{ value?: { name?: string } }>;
    }>;
  };
}

export interface AlexaRequestEnvelope {
  version?: string;
  session?: {
    sessionId?: string;
    new?: boolean;
    application?: { applicationId?: string };
    user?: { userId?: string };
  };
  context?: {
    System?: {
      application?: { applicationId?: string };
      user?: { userId?: string; permissions?: { consentToken?: string } };
      apiEndpoint?: string;
      apiAccessToken?: string;
      device?: { deviceId?: string };
    };
  };
  request: {
    type: string;
    requestId?: string;
    timestamp: string;
    locale?: string;
    intent?: { name: string; slots?: Record<string, AlexaSlot> };
    name?: string;
    token?: string;
    payload?: { status?: string };
    status?: { code?: string };
    reason?: string;
  };
}

export interface AlexaResponse {
  version: "1.0";
  sessionAttributes?: Record<string, unknown>;
  response: {
    outputSpeech?: { type: "PlainText"; text: string };
    reprompt?: { outputSpeech: { type: "PlainText"; text: string } };
    card?: { type: "Simple"; title: string; content: string };
    directives?: unknown[];
    shouldEndSession?: boolean;
  };
}

function speak(
  text: string,
  options: { end?: boolean; reprompt?: string; card?: string } = {},
): AlexaResponse {
  return {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: text.slice(0, 7000) },
      ...(options.reprompt
        ? {
            reprompt: {
              outputSpeech: { type: "PlainText", text: options.reprompt },
            },
          }
        : {}),
      ...(options.card
        ? {
            card: {
              type: "Simple",
              title: "HELEN",
              content: options.card.slice(0, 7000),
            },
          }
        : {}),
      shouldEndSession: options.end ?? true,
    },
  };
}

function askForRemindersPermission(reminderId: string): AlexaResponse {
  return {
    version: "1.0",
    response: {
      directives: [
        {
          type: "Connections.SendRequest",
          name: "AskFor",
          payload: {
            "@type": "AskForPermissionsConsentRequest",
            "@version": "2",
            permissionScopes: [
              { permissionScope: REMINDERS_SCOPE, consentLevel: "ACCOUNT" },
            ],
          },
          token: reminderId,
        },
      ],
      shouldEndSession: true,
    },
  };
}

/** The words the owner said, rebuilt as a sentence HELEN's brain understands. */
const INTENT_PREFIX: Record<string, Record<"es" | "en", string>> = {
  RemindIntent: { es: "recuérdame", en: "remind me" },
  RememberIntent: { es: "recuerda que", en: "remember that" },
  AskIntent: { es: "", en: "" },
  AddToListIntent: { es: "añade", en: "add" },
  DoneIntent: { es: "ya he hecho", en: "done" },
  CancelReminderIntent: {
    es: "cancela el recordatorio de",
    en: "cancel the reminder about",
  },
  SnoozeIntent: { es: "pospónlo", en: "snooze it" },
  ForgetIntent: { es: "olvida", en: "forget" },
};

function slotValue(slot: AlexaSlot | undefined): string | undefined {
  const resolved = slot?.resolutions?.resolutionsPerAuthority?.find(
    (authority) => authority.status?.code === "ER_SUCCESS_MATCH",
  )?.values?.[0]?.value?.name;
  return (resolved ?? slot?.value)?.trim() || undefined;
}

export function utteranceFor(
  intent: NonNullable<AlexaRequestEnvelope["request"]["intent"]>,
  lang: "es" | "en",
): string | null {
  const slots = intent.slots ?? {};
  if (intent.name in INTENT_PREFIX) {
    const text = slotValue(slots.texto) ?? slotValue(slots.text);
    if (!text) return null;
    return `${INTENT_PREFIX[intent.name]![lang]} ${text}`.trim();
  }
  if (intent.name === "AgendaIntent") {
    const when = slotValue(slots.cuando) ?? slotValue(slots.when);
    return lang === "es"
      ? `qué tengo ${when ?? "hoy"}`
      : `what do I have ${when ?? "today"}`;
  }
  if (intent.name === "ReadListIntent") {
    const list = slotValue(slots.lista) ?? slotValue(slots.list);
    if (!list)
      return lang === "es" ? "qué tengo pendiente" : "what do I need to do";
    return lang === "es"
      ? `qué hay en la lista de ${list}`
      : `what's on my ${list} list`;
  }
  if (intent.name === "RemindersIntent")
    return lang === "es"
      ? "qué recordatorios tengo"
      : "what reminders do I have";
  if (intent.name === "AMAZON.HelpIntent")
    return lang === "es" ? "ayuda" : "help";
  if (intent.name === "AMAZON.YesIntent") return lang === "es" ? "sí" : "yes";
  if (intent.name === "AMAZON.NoIntent") return "no";
  return null;
}

// ---------------------------------------------------------------------------------------------
// Native Alexa reminders
// ---------------------------------------------------------------------------------------------

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function localStamp(instant: Date, timezone: string): string {
  const p = localParts(instant, timezone);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00.000`;
}

/** The body Amazon's Reminders API expects, recurring rules included. */
export function nativeReminderBody(
  reminder: Reminder,
  timezone: string,
  locale: string,
  now: Date,
): Record<string, unknown> {
  timezone = reminder.timezone ?? timezone;
  const trigger: Record<string, unknown> = {
    type: "SCHEDULED_ABSOLUTE",
    scheduledTime: localStamp(new Date(reminder.due), timezone),
    timeZoneId: timezone,
  };
  const rule = reminder.recurrence;
  if (rule) {
    const [hour, minute] = rule.time.split(":").map(Number) as [number, number];
    const freq = rule.freq.toUpperCase();
    const parts = [`FREQ=${freq}`];
    if (rule.freq === "weekly" && rule.byDay?.length)
      parts.push(`BYDAY=${rule.byDay.map((day) => RRULE_DAYS[day]).join(",")}`);
    if ((rule.freq === "monthly" || rule.freq === "yearly") && rule.dayOfMonth)
      parts.push(`BYMONTHDAY=${rule.dayOfMonth}`);
    parts.push(
      `BYHOUR=${hour}`,
      `BYMINUTE=${minute}`,
      "BYSECOND=0",
      `INTERVAL=${rule.interval}`,
    );
    trigger.recurrence = {
      startDateTime: localStamp(new Date(reminder.due), timezone),
      recurrenceRules: [`${parts.join(";")};`],
    };
  }
  return {
    requestTime: localStamp(now, timezone),
    trigger,
    alertInfo: {
      spokenInfo: {
        content: [
          {
            locale,
            text: reminder.sensitive
              ? locale.startsWith("es")
                ? "Tienes un recordatorio privado. Consúltalo en un canal privado."
                : "You have a private reminder. Check it on a private channel."
              : reminder.text.slice(0, 250),
          },
        ],
      },
    },
    pushNotification: { status: "ENABLED" },
  };
}

export type NativeResult =
  | { ok: true; alertToken: string }
  | { ok: false; needsPermission: boolean; error: string };

export async function createNativeReminder(
  envelope: AlexaRequestEnvelope,
  reminder: Reminder,
  config: AssistantConfig,
  now: Date,
  fetcher: typeof fetch = fetch,
): Promise<NativeResult> {
  if (
    (!reminder.urgent && config.quietHours) ||
    (reminder.recurrence && reminder.leadMinutes)
  )
    return {
      ok: false,
      needsPermission: false,
      error:
        "This reminder needs HELEN's scheduler to respect quiet hours or recurring advance notices",
    };
  const system = envelope.context?.System;
  if (!system?.apiEndpoint || !system.apiAccessToken)
    return {
      ok: false,
      needsPermission: false,
      error: "no API access in this request",
    };
  if (
    !/^https:\/\/api(?:\.(?:eu|fe))?\.amazonalexa\.com$|^https:\/\/api\.fe\.amazon\.com$/.test(
      system.apiEndpoint,
    )
  )
    return {
      ok: false,
      needsPermission: false,
      error: "unexpected Alexa API endpoint",
    };
  const locale = envelope.request.locale ?? config.locale;
  const response = await fetcher(`${system.apiEndpoint}/v1/alerts/reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${system.apiAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      nativeReminderBody(reminder, config.timezone, locale, now),
    ),
    signal: AbortSignal.timeout(3000),
  });
  if (response.ok) {
    const body = (await response.json()) as { alertToken?: string };
    if (body.alertToken) return { ok: true, alertToken: body.alertToken };
    return {
      ok: false,
      needsPermission: false,
      error: "no alert token in the answer",
    };
  }
  let code = "";
  try {
    code = String(((await response.json()) as { code?: string }).code ?? "");
  } catch {
    // No JSON body.
  }
  // Amazon answers 401 UNAUTHORIZED when the token is fine but the reminders permission was not granted.
  return {
    ok: false,
    needsPermission:
      response.status === 401 && (code === "" || code === "UNAUTHORIZED"),
    error: `HTTP ${response.status}${code ? ` ${code}` : ""}`,
  };
}

export async function deleteNativeReminder(
  envelope: AlexaRequestEnvelope,
  alertToken: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const system = envelope.context?.System;
  if (!system?.apiEndpoint || !system.apiAccessToken) return false;
  const response = await fetcher(
    `${system.apiEndpoint}/v1/alerts/reminders/${encodeURIComponent(alertToken)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${system.apiAccessToken}` },
      signal: AbortSignal.timeout(3000),
    },
  );
  return response.ok;
}

// ---------------------------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------------------------

export interface AlexaHandlerOptions {
  home: string;
  config: AssistantConfig;
  now?: Date;
  fetcher?: typeof fetch;
  model?: LanguageModel | null;
  log?: (message: string) => void;
}

const ASK_AGAIN_AFTER_MS = 30 * 24 * 3600_000;

function stateFile(home: string): string {
  return path.join(home, "alexa-state.json");
}

/** After the owner said no to the reminders permission, do not ask again for a month. */
function permissionRecentlyDenied(home: string, now: Date): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(home), "utf8")) as {
      remindersDeniedAt?: string;
    };
    return Boolean(
      state.remindersDeniedAt &&
      now.getTime() - Date.parse(state.remindersDeniedAt) < ASK_AGAIN_AFTER_MS,
    );
  } catch {
    return false;
  }
}

function recordPermission(home: string, denied: boolean, now: Date): void {
  writePrivate(
    stateFile(home),
    `${JSON.stringify(denied ? { remindersDeniedAt: now.toISOString() } : {})}\n`,
  );
}

function langOf(
  envelope: AlexaRequestEnvelope,
  config: AssistantConfig,
): "es" | "en" {
  return (envelope.request.locale ?? config.locale).startsWith("es")
    ? "es"
    : "en";
}

/** Answer one verified Alexa request. */
export async function handleAlexa(
  envelope: AlexaRequestEnvelope,
  options: AlexaHandlerOptions,
): Promise<AlexaResponse> {
  const { config, home } = options;
  const now = options.now ?? new Date();
  const lang = langOf(envelope, config);
  const es = lang === "es";
  const conversation =
    envelope.context?.System?.user?.userId ??
    envelope.session?.user?.userId ??
    "alexa";
  const request = envelope.request;

  if (request.type === "SessionEndedRequest")
    return { version: "1.0", response: {} };
  if (request.type === "LaunchRequest") {
    return speak(
      es
        ? `Hola, ${config.owner}. ¿Qué necesitas?`
        : `Hi, ${config.owner}. What do you need?`,
      {
        end: false,
        reprompt: es
          ? "Puedes decir, por ejemplo: recuérdame mañana a las nueve llamar a mamá."
          : "You can say, for example: remind me to call mom tomorrow at nine.",
      },
    );
  }

  if (request.type === "Connections.Response" && request.name === "AskFor") {
    // The answer to the reminders permission: mirror the reminder HELEN already saved, if allowed.
    const reminder = request.token
      ? listReminders(home).find((candidate) => candidate.id === request.token)
      : undefined;
    const accepted = request.payload?.status === "ACCEPTED";
    if (request.payload?.status === "DENIED") recordPermission(home, true, now);
    if (accepted) recordPermission(home, false, now);
    if (!reminder) return speak(es ? "Hecho." : "Done.");
    const when = whenText(reminder, { config, now, lang });
    if (!accepted)
      return speak(
        es
          ? `Sin permiso no puedo hacer sonar el Echo, pero te lo recordaré por tus otros avisos ${when}.`
          : `Without permission the Echo cannot ring, but I will remind you through your other channels ${when}.`,
      );
    const native = await createNativeReminder(
      envelope,
      reminder,
      config,
      now,
      options.fetcher,
    ).catch((error) => ({
      ok: false as const,
      needsPermission: false,
      error: String(error),
    }));
    if (native.ok) {
      attachAlexaToken(home, reminder.id, native.alertToken);
      return speak(
        es
          ? `Listo: sonará en tu Echo ${when}.`
          : `Done: your Echo will ring ${when}.`,
      );
    }
    options.log?.(`Alexa reminder not created: ${native.error}`);
    return speak(
      es
        ? `Lo tengo apuntado para ${when}, pero el Echo no me ha dejado crear la alarma.`
        : `It is saved for ${when}, but the Echo did not let me create the alarm.`,
    );
  }

  if (request.type !== "IntentRequest" || !request.intent)
    return speak(es ? "No he entendido eso." : "I did not get that.");
  const intent = request.intent;
  if (
    intent.name === "AMAZON.StopIntent" ||
    intent.name === "AMAZON.CancelIntent"
  )
    return speak(es ? "Hasta luego." : "Bye.");
  if (
    intent.name === "AMAZON.FallbackIntent" ||
    intent.name === "AMAZON.NavigateHomeIntent"
  ) {
    return speak(
      es
        ? "No te he entendido. Prueba con: recuérdame..., recuerda que..., o qué tengo hoy."
        : "I did not understand. Try: remind me..., remember that..., or what do I have today.",
      { end: false, reprompt: es ? "¿Qué necesitas?" : "What do you need?" },
    );
  }
  const utterance = utteranceFor(intent, lang);
  if (!utterance)
    return speak(
      es
        ? "¿Puedes repetirlo con más detalle?"
        : "Can you say that again with more detail?",
      { end: false, reprompt: es ? "¿Qué necesitas?" : "What do you need?" },
    );

  const answer: BrainReply = await handleMessage(utterance, {
    home,
    channel: "alexa",
    conversation,
    config,
    now,
    speaker: true,
    ...(options.model !== undefined ? { model: options.model } : {}),
  });
  const card =
    answer.text && answer.text !== answer.speech ? answer.text : undefined;

  if (answer.cancelled?.alexaAlertToken) {
    await deleteNativeReminder(
      envelope,
      answer.cancelled.alexaAlertToken,
      options.fetcher,
    ).catch(() => false);
  }

  if (answer.reminder && config.alexa.nativeReminders) {
    const native = await createNativeReminder(
      envelope,
      answer.reminder,
      config,
      now,
      options.fetcher,
    ).catch((error) => ({
      ok: false as const,
      needsPermission: false,
      error: String(error),
    }));
    if (native.ok) {
      attachAlexaToken(home, answer.reminder.id, native.alertToken);
      return speak(
        `${answer.speech} ${es ? "Sonará en tu Echo." : "Your Echo will ring."}`,
        { ...(card ? { card } : {}) },
      );
    }
    if (native.needsPermission && !permissionRecentlyDenied(home, now))
      return askForRemindersPermission(answer.reminder.id);
    if (!native.needsPermission)
      options.log?.(`Alexa reminder not created: ${native.error}`);
    return speak(
      `${answer.speech} ${es ? "El Echo no tiene una alarma para este aviso; se usará el resto de canales configurados." : "The Echo has no alarm for this reminder; your other configured channels will be used."}`,
      { ...(card ? { card } : {}) },
    );
  }
  // A question back ("¿Cuándo te lo recuerdo?") keeps the microphone open for the answer.
  const keepOpen =
    answer.intent === "pending" ||
    (answer.intent === "model" && !answer.endSession);
  return speak(answer.speech || (es ? "Hecho." : "Done."), {
    end: !keepOpen,
    ...(keepOpen ? { reprompt: answer.speech } : {}),
    ...(card ? { card } : {}),
  });
}

// ---------------------------------------------------------------------------------------------
// Interaction model
// ---------------------------------------------------------------------------------------------

const SAMPLES: Record<"es" | "en", Record<string, string[]>> = {
  es: {
    RemindIntent: [
      "recuérdame {texto}",
      "recuérdame que {texto}",
      "me recuerdes {texto}",
      "me recuerde {texto}",
      "avísame {texto}",
      "me avises {texto}",
      "pon un recordatorio {texto}",
      "crea un recordatorio {texto}",
    ],
    RememberIntent: [
      "recuerda que {texto}",
      "apunta que {texto}",
      "anota que {texto}",
      "guarda que {texto}",
      "toma nota de {texto}",
      "apúntate que {texto}",
      "que recuerdes que {texto}",
    ],
    AskIntent: [
      "qué sabes de {texto}",
      "qué sabes sobre {texto}",
      "busca {texto}",
      "cuál es {texto}",
      "cuándo es {texto}",
      "dónde está {texto}",
      "dónde están {texto}",
      "dónde dejé {texto}",
      "quién es {texto}",
      "cómo se llama {texto}",
      "te acuerdas de {texto}",
    ],
    AddToListIntent: [
      "añade {texto}",
      "apunta {texto} en la lista",
      "pon {texto} en la lista",
      "agrega {texto}",
      "mete {texto} en la lista",
    ],
    DoneIntent: [
      "ya he hecho {texto}",
      "ya he comprado {texto}",
      "tacha {texto}",
      "he terminado {texto}",
      "marca {texto} como hecho",
    ],
    CancelReminderIntent: [
      "cancela el recordatorio de {texto}",
      "borra el recordatorio de {texto}",
      "quita el recordatorio de {texto}",
    ],
    SnoozeIntent: [
      "pospónlo {texto}",
      "recuérdamelo {texto}",
      "avísame otra vez {texto}",
    ],
    ForgetIntent: [
      "olvida {texto}",
      "olvida lo de {texto}",
      "borra la nota de {texto}",
    ],
    AgendaIntent: [
      "qué tengo {cuando}",
      "qué tengo para {cuando}",
      "qué hay {cuando}",
      "mi agenda de {cuando}",
      "mi agenda",
      "qué tengo",
      "resumen del día",
      "cómo es mi día",
    ],
    ReadListIntent: [
      "qué hay en la lista de {lista}",
      "lee la lista de {lista}",
      "mi lista de {lista}",
      "qué tengo pendiente",
      "mis tareas",
      "qué tengo que comprar",
    ],
    RemindersIntent: [
      "qué recordatorios tengo",
      "mis recordatorios",
      "lee mis recordatorios",
    ],
  },
  en: {
    RemindIntent: [
      "remind me {text}",
      "remind me to {text}",
      "to remind me {text}",
      "set a reminder {text}",
      "create a reminder {text}",
    ],
    RememberIntent: [
      "remember that {text}",
      "note that {text}",
      "take a note {text}",
      "save that {text}",
      "to remember {text}",
    ],
    AskIntent: [
      "what do you know about {text}",
      "search for {text}",
      "what is {text}",
      "when is {text}",
      "where is {text}",
      "where are {text}",
      "who is {text}",
    ],
    AddToListIntent: [
      "add {text}",
      "put {text} on my list",
      "add {text} to my list",
    ],
    DoneIntent: [
      "i did {text}",
      "i bought {text}",
      "check off {text}",
      "cross off {text}",
      "mark {text} as done",
    ],
    CancelReminderIntent: [
      "cancel the reminder about {text}",
      "delete the reminder about {text}",
      "cancel the reminder to {text}",
    ],
    SnoozeIntent: ["snooze it {text}", "remind me again {text}"],
    ForgetIntent: [
      "forget {text}",
      "forget about {text}",
      "delete the note about {text}",
    ],
    AgendaIntent: [
      "what do i have {when}",
      "what is on {when}",
      "my agenda for {when}",
      "my agenda",
      "what do i have",
      "my day",
    ],
    ReadListIntent: [
      "what is on my {list} list",
      "read my {list} list",
      "what is on my list",
      "my tasks",
      "what do i need to buy",
    ],
    RemindersIntent: [
      "what reminders do i have",
      "my reminders",
      "read my reminders",
    ],
  },
};

/** The interaction model to paste into the Alexa developer console (JSON Editor). */
export function interactionModel(
  locale: string,
  invocationName?: string,
): Record<string, unknown> {
  const lang = locale.startsWith("es") ? "es" : "en";
  const textSlot = lang === "es" ? "texto" : "text";
  const whenSlot = lang === "es" ? "cuando" : "when";
  const listSlot = lang === "es" ? "lista" : "list";
  const slotsFor = (name: string): Array<{ name: string; type: string }> => {
    if (name === "AgendaIntent")
      return [{ name: whenSlot, type: "HELEN_WHEN" }];
    if (name === "ReadListIntent")
      return [{ name: listSlot, type: "HELEN_LIST" }];
    if (name === "RemindersIntent") return [];
    return [{ name: textSlot, type: "AMAZON.SearchQuery" }];
  };
  const custom = Object.entries(SAMPLES[lang]).map(([name, samples]) => ({
    name,
    slots: slotsFor(name),
    samples,
  }));
  const builtIn = [
    "AMAZON.CancelIntent",
    "AMAZON.HelpIntent",
    "AMAZON.StopIntent",
    "AMAZON.NavigateHomeIntent",
    "AMAZON.FallbackIntent",
    "AMAZON.YesIntent",
    "AMAZON.NoIntent",
  ].map((name) => ({ name, samples: [] }));
  const when =
    lang === "es"
      ? [
          { name: { value: "hoy", synonyms: ["para hoy"] } },
          { name: { value: "mañana", synonyms: ["para mañana"] } },
          {
            name: {
              value: "esta semana",
              synonyms: ["la semana", "esta semana que viene"],
            },
          },
        ]
      : [
          { name: { value: "today" } },
          { name: { value: "tomorrow" } },
          { name: { value: "this week", synonyms: ["the week"] } },
        ];
  const lists =
    lang === "es"
      ? [
          {
            name: {
              value: "la compra",
              synonyms: ["compra", "supermercado", "mercado"],
            },
          },
          {
            name: {
              value: "tareas",
              synonyms: ["pendientes", "cosas que hacer"],
            },
          },
        ]
      : [
          { name: { value: "shopping", synonyms: ["groceries", "grocery"] } },
          { name: { value: "tasks", synonyms: ["to do", "todo"] } },
        ];
  return {
    interactionModel: {
      languageModel: {
        invocationName:
          invocationName ??
          (lang === "es" ? "asistente helen" : "helen assistant"),
        intents: [...builtIn, ...custom],
        types: [
          { name: "HELEN_WHEN", values: when },
          { name: "HELEN_LIST", values: lists },
        ],
      },
    },
  };
}
