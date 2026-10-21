import crypto from "node:crypto";
import http from "node:http";
import { buildAgenda, formatAgenda, type AgendaRange } from "./agenda.js";
import {
  AlexaVerificationError,
  handleAlexa,
  type AlexaHeaders,
  type AlexaRequestEnvelope,
} from "./alexa.js";
import { handleMessage } from "./brain.js";
import type { AssistantConfig } from "./home.js";
import type { LanguageModel } from "./llm.js";
import { addMemory } from "./memory.js";
import { addReminder, listReminders } from "./reminders.js";
import { listTasks } from "./tasks.js";
import { chatPage } from "./web.js";

/**
 * HELEN's HTTP server: the chat page, a small JSON API for scripts and shortcuts (bearer token), and the
 * Alexa endpoint (Amazon's request signature instead of the token). It listens on localhost unless told
 * otherwise; to reach it from Alexa, put an HTTPS tunnel in front of it.
 */
export interface ServerOptions {
  home: string;
  config: AssistantConfig;
  token: string;
  verifyAlexa?: (
    rawBody: Buffer,
    headers: AlexaHeaders,
  ) => Promise<AlexaRequestEnvelope>;
  model?: LanguageModel | null;
  fetcher?: typeof fetch;
  log?: (message: string) => void;
  /** Requests per minute per client address (Alexa is exempt: Amazon signs those). */
  rateLimit?: number;
}

const MAX_BODY = 64 * 1024;
const FAILED_AUTH_LIMIT = 10;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

function digest(value: string): Buffer {
  return crypto.createHash("sha256").update(value).digest();
}

/** Constant-time comparison of the bearer token. */
export function tokenMatches(
  header: string | undefined,
  token: string,
): boolean {
  const presented = /^Bearer\s+(\S+)$/i.exec(header ?? "")?.[1];
  if (!presented) return false;
  return crypto.timingSafeEqual(digest(presented), digest(token));
}

function readBody(request: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, "Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function jsonBody(raw: Buffer): Record<string, unknown> {
  try {
    const value = JSON.parse(raw.toString("utf8") || "{}") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "The body must be a JSON object.");
  }
}

function text(value: unknown, name: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim())
    throw new HttpError(400, `"${name}" must be a non-empty string.`);
  if (value.length > max)
    throw new HttpError(400, `"${name}" is too long (max ${max}).`);
  return value;
}

interface Bucket {
  tokens: number;
  updated: number;
  failures: number[];
}

export function createAssistantServer(options: ServerOptions): http.Server {
  const buckets = new Map<string, Bucket>();
  const seenAlexaAccounts = new Set<string>();
  const perMinute = options.rateLimit ?? 60;
  const log = options.log ?? (() => undefined);
  const lang = options.config.locale.startsWith("es") ? "es" : "en";

  const bucketFor = (address: string): Bucket => {
    let bucket = buckets.get(address);
    if (!bucket) {
      if (buckets.size > 5000) buckets.clear();
      bucket = { tokens: perMinute, updated: Date.now(), failures: [] };
      buckets.set(address, bucket);
    }
    return bucket;
  };

  const limit = (address: string): void => {
    const bucket = bucketFor(address);
    const now = Date.now();
    bucket.tokens = Math.min(
      perMinute,
      bucket.tokens + ((now - bucket.updated) / 60_000) * perMinute,
    );
    bucket.updated = now;
    if (bucket.tokens < 1)
      throw new HttpError(429, "Too many requests.", { "Retry-After": "10" });
    bucket.tokens -= 1;
  };

  const authenticate = (
    request: http.IncomingMessage,
    address: string,
  ): void => {
    const bucket = bucketFor(address);
    const now = Date.now();
    bucket.failures = bucket.failures.filter((at) => now - at < 10 * 60_000);
    if (bucket.failures.length >= FAILED_AUTH_LIMIT)
      throw new HttpError(429, "Too many failed attempts; wait ten minutes.", {
        "Retry-After": "600",
      });
    if (!tokenMatches(request.headers.authorization, options.token)) {
      bucket.failures.push(now);
      throw new HttpError(401, "Missing or wrong bearer token.", {
        "WWW-Authenticate": "Bearer",
      });
    }
  };

  const route = async (
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<void> => {
    const url = new URL(request.url ?? "/", "http://helen.local");
    const address = request.socket.remoteAddress ?? "unknown";
    const method = request.method ?? "GET";
    const send = (
      status: number,
      body: unknown,
      headers: Record<string, string> = {},
    ): void => {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
      });
      response.end(JSON.stringify(body));
    };

    if (url.pathname === "/health" && method === "GET")
      return send(200, { ok: true, name: "helen-assistant" });

    if (url.pathname === "/alexa" && method === "POST") {
      const raw = await readBody(request);
      if (!options.verifyAlexa)
        throw new HttpError(404, "Alexa is not enabled on this server.");
      let envelope: AlexaRequestEnvelope;
      try {
        envelope = await options.verifyAlexa(raw, {
          certUrl: String(request.headers.signaturecertchainurl ?? ""),
          signature256: String(request.headers["signature-256"] ?? ""),
        });
      } catch (error) {
        // Amazon requires 400 for anything that fails verification.
        log(`Alexa request rejected: ${(error as Error).message}`);
        throw new HttpError(
          400,
          error instanceof AlexaVerificationError
            ? "Request verification failed."
            : "Bad request.",
        );
      }
      const account =
        envelope.context?.System?.user?.userId ??
        envelope.session?.user?.userId;
      if (
        account &&
        options.config.alexa.userIds.length === 0 &&
        !seenAlexaAccounts.has(account)
      ) {
        seenAlexaAccounts.add(account);
        log(
          `Alexa account: ${account} (to allow only this one: helen assistant config set alexa.userIds '["${account}"]')`,
        );
      }
      return send(
        200,
        await handleAlexa(envelope, {
          home: options.home,
          config: options.config,
          ...(options.model !== undefined ? { model: options.model } : {}),
          ...(options.fetcher ? { fetcher: options.fetcher } : {}),
          log,
        }),
      );
    }

    limit(address);

    if (url.pathname === "/" && method === "GET") {
      const nonce = crypto.randomBytes(16).toString("base64");
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
        "X-Frame-Options": "DENY",
      });
      response.end(chatPage(nonce, lang));
      return;
    }

    authenticate(request, address);
    const home = options.home;
    const config = options.config;
    const model = options.model !== undefined ? { model: options.model } : {};

    if (url.pathname === "/chat" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const channel =
        request.headers["x-helen-client"] === "web" ? "web" : "http";
      const conversation =
        typeof body.conversation === "string"
          ? body.conversation.slice(0, 100)
          : undefined;
      const answer = await handleMessage(text(body.text, "text"), {
        home,
        channel,
        config,
        ...(conversation ? { conversation } : {}),
        ...(body.speaker === true ? { speaker: true } : {}),
        ...model,
      });
      return send(200, {
        text: answer.text,
        speech: answer.speech,
        intent: answer.intent,
        lang: answer.lang,
        endSession: answer.endSession,
      });
    }
    if (url.pathname === "/agenda" && method === "GET") {
      const range = (
        ["today", "tomorrow", "week"].includes(
          url.searchParams.get("range") ?? "",
        )
          ? url.searchParams.get("range")
          : "today"
      ) as AgendaRange;
      const agenda = buildAgenda(home, range, { timezone: config.timezone });
      return send(200, {
        range,
        text: formatAgenda(agenda, {
          lang,
          locale: config.locale,
          timezone: config.timezone,
          showSensitive: config.privacy.showSensitiveOn.includes("http"),
        }),
      });
    }
    if (url.pathname === "/reminders" && method === "GET")
      return send(200, { reminders: listReminders(home) });
    if (url.pathname === "/tasks" && method === "GET")
      return send(200, {
        tasks: listTasks(
          home,
          url.searchParams.get("list")
            ? { list: url.searchParams.get("list")! }
            : {},
        ),
      });
    if (url.pathname === "/remember" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const { file: _file, ...item } = addMemory(home, {
        text: text(body.text, "text", 20_000),
        source: "http",
        lang,
      });
      return send(201, { memory: item });
    }
    if (url.pathname === "/remind" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const reminder = addReminder(
        home,
        {
          text: text(body.text, "text", 500),
          ...(typeof body.when === "string" ? { when: body.when } : {}),
          source: "http",
        },
        {
          timezone: config.timezone,
          locale: config.locale,
          defaultTime: config.defaultTime,
        },
      );
      return send(201, { reminder });
    }
    throw new HttpError(404, "Not found.");
  };

  const server = http.createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    route(request, response).catch((error) => {
      const status = error instanceof HttpError ? error.status : 400;
      const message =
        error instanceof HttpError || status === 400
          ? (error as Error).message
          : "Internal error.";
      if (!response.headersSent) {
        response.writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
          ...(error instanceof HttpError ? error.headers : {}),
        });
        response.end(JSON.stringify({ error: message }));
      } else {
        response.end();
      }
      if (!(error instanceof HttpError))
        log(`Request failed: ${(error as Error).message}`);
    });
  });
  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
