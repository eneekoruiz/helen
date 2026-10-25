import crypto from "node:crypto";
import http from "node:http";
import { z } from "zod";
import { looksSensitive } from "../core/secrets.js";
import { exportCalendar, importCalendar } from "./calendar.js";
import { weeklyReview } from "./review.js";
import { buildAgenda, formatAgenda, type AgendaRange } from "./agenda.js";
import {
  AlexaVerificationError,
  handleAlexa,
  type AlexaHeaders,
  type AlexaRequestEnvelope,
} from "./alexa.js";
import { handleMessage } from "./brain.js";
import {
  AssistantConfigSchema,
  writeConfig,
  type AssistantConfig,
} from "./home.js";
import {
  createCapture,
  getCapture,
  editCapture,
  confirmCapture,
  type CaptureCandidate,
} from "./capture.js";
import {
  capacityPlan,
  createWorkflow,
  listWorkflows,
  updateWorkflowItem,
  workflowProgress,
} from "./workflows.js";
import { handleGmailRequest } from "./gmailWeb.js";
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

function readBody(
  request: http.IncomingMessage,
  max = MAX_BODY,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > max) {
        failed = true;
        reject(new HttpError(413, "Request body too large."));
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
    const lang = options.config.locale.startsWith("es") ? "es" : "en";
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

    const channel =
      request.headers["x-helen-client"] === "web" ? "web" : "http";
    if (url.pathname === "/gmail/callback") {
      if (
        await handleGmailRequest(
          request,
          response,
          url,
          options,
          "http",
          undefined,
        )
      )
        return;
    }
    authenticate(request, address);
    const home = options.home;
    const config = options.config;
    const model = options.model !== undefined ? { model: options.model } : {};
    if (url.pathname.startsWith("/gmail/")) {
      if (
        await handleGmailRequest(
          request,
          response,
          url,
          options,
          channel,
          url.searchParams.get("conversation") ?? undefined,
        )
      )
        return;
    }
    const privateChannel = (speaker: unknown = false): void => {
      if (speaker === true || !config.privacy.showSensitiveOn.includes(channel))
        throw new HttpError(
          403,
          "This operation requires a private authorized channel.",
        );
    };
    const captureOwner = (conversation: unknown): string => {
      const id = text(conversation, "conversation", 100);
      if (!/^[a-zA-Z0-9_-]+$/.test(id))
        throw new HttpError(400, "Invalid conversation identifier.");
      return `${channel}:${id}`;
    };
    if (url.pathname === "/capture" && method === "POST") {
      privateChannel();
      const body = jsonBody(await readBody(request, 14 * 1024 * 1024));
      privateChannel(body.speaker);
      const owner = captureOwner(body.conversation);
      if (body.extractor !== undefined)
        throw new HttpError(
          400,
          "Extractor configuration cannot be supplied by a request.",
        );
      let attachment: { data: Buffer; mime: string } | undefined;
      if (body.attachment !== undefined) {
        const media = z
          .object({
            base64: z
              .string()
              .min(4)
              .max(14 * 1024 * 1024),
            mime: z.string().min(1).max(100),
          })
          .strict()
          .parse(body.attachment);
        if (
          media.base64.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(media.base64)
        )
          throw new HttpError(400, "Malformed base64 attachment.");
        const data = Buffer.from(media.base64, "base64");
        if (data.toString("base64") !== media.base64)
          throw new HttpError(400, "Malformed base64 attachment.");
        attachment = { data, mime: media.mime };
      }
      const draft = await createCapture(
        home,
        {
          owner,
          ...(body.text !== undefined
            ? { text: text(body.text, "text", 32000) }
            : {}),
          ...(attachment ? { attachment } : {}),
          ...(config.capture?.extractor
            ? { extractor: config.capture.extractor }
            : {}),
        },
        {
          now: new Date(),
          timezone: config.timezone,
          locale: config.locale,
          defaultTime: config.defaultTime,
        },
      );
      return send(201, { draft });
    }
    const captureRoute = /^\/capture\/([0-9a-f-]+)(?:\/(edit|confirm))?$/.exec(
      url.pathname,
    );
    if (captureRoute && method === "GET" && !captureRoute[2]) {
      privateChannel(url.searchParams.get("speaker") === "true");
      return send(200, {
        draft: getCapture(
          home,
          captureRoute[1]!,
          captureOwner(url.searchParams.get("conversation")),
        ),
      });
    }
    if (captureRoute && method === "POST" && captureRoute[2]) {
      privateChannel();
      const body = jsonBody(await readBody(request));
      privateChannel(body.speaker);
      const owner = captureOwner(body.conversation);
      const version = z.number().int().positive().parse(body.version);
      if (!Array.isArray(body.items))
        throw new HttpError(400, "Reviewed capture items are required.");
      const input = {
        id: captureRoute[1]!,
        owner,
        version,
        items: body.items as CaptureCandidate[],
      };
      if (captureRoute[2] === "edit")
        return send(200, { draft: editCapture(home, input) });
      return send(200, { tasks: confirmCapture(home, input) });
    }
    if (url.pathname === "/plan" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const { speaker, ...input } = body;
      return send(
        200,
        capacityPlan(home, {
          ...input,
          showSensitive:
            speaker !== true &&
            config.privacy.showSensitiveOn.includes(channel),
        }),
      );
    }
    if (url.pathname === "/workflows" && method === "GET") {
      const workflows = listWorkflows(home, {
        showSensitive:
          url.searchParams.get("speaker") !== "true" &&
          config.privacy.showSensitiveOn.includes(channel),
      });
      return send(200, {
        workflows: workflows.map((workflow) => ({
          ...workflow,
          progress: workflowProgress(workflow),
        })),
      });
    }
    if (
      (url.pathname === "/workflows" || url.pathname === "/workflows/status") &&
      method === "POST"
    ) {
      privateChannel();
      const body = jsonBody(await readBody(request));
      if (body.speaker === true) privateChannel(true);
      const { speaker: _speaker, ...input } = body;
      return send(url.pathname === "/workflows" ? 201 : 200, {
        workflow:
          url.pathname === "/workflows"
            ? createWorkflow(home, input)
            : updateWorkflowItem(home, input, undefined, {
                showSensitive: true,
              }),
      });
    }
    if (
      url.pathname === "/preferences" &&
      (method === "GET" || method === "POST")
    ) {
      privateChannel();
      if (method === "POST") {
        const body = jsonBody(await readBody(request));
        const input = z
          .object({
            locale: AssistantConfigSchema.shape.locale.optional(),
            assistance: AssistantConfigSchema.shape.assistance.optional(),
          })
          .strict()
          .parse(body);
        Object.assign(config, writeConfig({ ...config, ...input }, home));
      }
      return send(200, {
        locale: config.locale,
        assistance: config.assistance,
      });
    }

    if (url.pathname === "/chat" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const conversation =
        typeof body.conversation === "string"
          ? body.conversation.slice(0, 100)
          : undefined;
      const answer = await handleMessage(text(body.text, "text"), {
        home,
        channel,
        config,
        requestId:
          typeof body.requestId === "string" && body.requestId.length <= 200
            ? body.requestId
            : undefined,
        ownerVerified: true,
        ...(options.fetcher ? { fetcher: options.fetcher } : {}),
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
    if (url.pathname === "/review" && method === "GET")
      return send(200, weeklyReview(home));
    if (url.pathname === "/calendar" && method === "GET") {
      response.writeHead(200, {
        "Content-Type": "text/calendar; charset=utf-8",
      });
      response.end(exportCalendar(home, { timezone: config.timezone }));
      return;
    }
    if (url.pathname === "/calendar" && method === "POST") {
      const body = jsonBody(await readBody(request));
      return send(
        201,
        importCalendar(home, text(body.calendar, "calendar", 64000), {
          timezone: config.timezone,
        }),
      );
    }
    if (url.pathname === "/reminders" && method === "GET")
      return send(200, {
        reminders: listReminders(home).map((item) =>
          item.sensitive && !config.privacy.showSensitiveOn.includes("http")
            ? { ...item, text: "(private)" }
            : item,
        ),
      });
    if (url.pathname === "/tasks" && method === "GET")
      return send(200, {
        tasks: listTasks(
          home,
          url.searchParams.get("list")
            ? { list: url.searchParams.get("list")! }
            : {},
        ).map((item) =>
          looksSensitive(item.text) &&
          !config.privacy.showSensitiveOn.includes("http")
            ? { ...item, text: "(private)" }
            : item,
        ),
      });
    if (url.pathname === "/remember" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const { file: _file, ...item } = addMemory(home, {
        text: text(body.text, "text", 20_000),
        source: "http",
        lang,
      });
      return send(201, {
        memory:
          item.sensitive && !config.privacy.showSensitiveOn.includes("http")
            ? { ...item, title: "(private)", body: "" }
            : item,
      });
    }
    if (url.pathname === "/remind" && method === "POST") {
      const body = jsonBody(await readBody(request));
      const reminder = addReminder(
        home,
        {
          text: text(body.text, "text", 500),
          ...(typeof body.when === "string" ? { when: body.when } : {}),
          source: "http",
          ...(typeof body.leadMinutes === "number"
            ? { leadMinutes: body.leadMinutes }
            : {}),
          ...(typeof body.urgent === "boolean" ? { urgent: body.urgent } : {}),
        },
        {
          timezone: config.timezone,
          locale: config.locale,
          defaultTime: config.defaultTime,
        },
      );
      return send(201, {
        reminder:
          reminder.sensitive && !config.privacy.showSensitiveOn.includes("http")
            ? { ...reminder, text: "(private)" }
            : reminder,
      });
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
