import http from "node:http";
import { z } from "zod";
import {
  startGmailAuth,
  completeGmailAuth,
  readGmailConnection,
  disconnectGmail,
  savedGmailConfig,
} from "./gmailAuth.js";
import { writeConfig, AssistantConfigSchema } from "./home.js";
import type { ServerOptions } from "./server.js";

function body(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 65536) {
        failed = true;
        reject(new Error("Request too large"));
      } else if (!failed) chunks.push(chunk);
    });
    request.on("error", reject);
    request.on("end", () => {
      if (!failed)
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(new Error("Invalid JSON"));
        }
    });
  });
}
function redirect(
  request: http.IncomingMessage,
  options: ServerOptions,
): string {
  return (
    options.config.gmailRedirectUri ??
    options.config.gmailAuth?.redirectUri ??
    `http://127.0.0.1:${request.socket.localPort}/gmail/callback`
  );
}
export async function handleGmailRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  url: URL,
  options: ServerOptions,
  channel: "http" | "web",
  _conversation: string | undefined,
): Promise<boolean> {
  if (!url.pathname.startsWith("/gmail/")) return false;
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(JSON.stringify(value));
  };
  const fetchOptions = options.fetcher ? { fetch: options.fetcher } : {};
  try {
    if (url.pathname === "/gmail/callback" && request.method === "GET") {
      if (url.searchParams.has("error"))
        throw new Error(
          "Autorización de Google cancelada. Puedes iniciar una conexión nueva.",
        );
      const connection = await completeGmailAuth(
        options.home,
        {
          state: url.searchParams.get("state") ?? "",
          code: url.searchParams.get("code") ?? "",
          redirectUri: redirect(request, options),
        },
        fetchOptions,
      );
      send(200, {
        connected: true,
        account: connection.account,
        message: "Gmail conectado. Vuelve al chat de HELEN.",
      });
      return true;
    }
    if (!options.config.privacy.showSensitiveOn.includes(channel)) {
      send(403, { error: "Usa un canal privado autorizado." });
      return true;
    }
    if (url.pathname === "/gmail/status" && request.method === "GET") {
      send(200, {
        connection: readGmailConnection(options.home) ?? null,
        configured: Boolean(
          options.config.gmail ?? savedGmailConfig(options.home),
        ),
        contacts: options.config.gmail?.contacts ?? {},
      });
      return true;
    }
    if (url.pathname === "/gmail/connect" && request.method === "POST") {
      const input = z
        .object({
          conversation: z.string().min(1).max(100),
          clientId: z.string().min(1).max(500).optional(),
          clientSecret: z.string().min(1).max(1000).optional(),
          redirectUri: AssistantConfigSchema.shape.gmailRedirectUri,
        })
        .strict()
        .parse(await body(request));
      const config = options.config.gmailAuth;
      const clientId =
        input.clientId ??
        (config ? process.env[config.clientIdEnv] : undefined);
      const clientSecret =
        input.clientSecret ??
        (config?.clientSecretEnv
          ? process.env[config.clientSecretEnv]
          : undefined);
      if (!clientId)
        throw new Error(
          "Añade el ID de cliente OAuth de Google en Ajustes. Esta conexión inicial necesita la autorización de tu cuenta.",
        );
      if (input.redirectUri) {
        options.config.gmailRedirectUri = input.redirectUri;
        writeConfig(options.config, options.home);
      }
      const started = startGmailAuth(
        options.home,
        {
          clientId,
          ...(clientSecret ? { clientSecret } : {}),
          redirectUri: redirect(request, options),
          owner: `${channel}:${input.conversation}`,
        },
        fetchOptions,
      );
      send(200, started);
      return true;
    }
    if (url.pathname === "/gmail/disconnect" && request.method === "POST") {
      z.object({ confirm: z.literal(true) })
        .strict()
        .parse(await body(request));
      const disconnected = await disconnectGmail(
        options.home,
        { revoke: true },
        fetchOptions,
      );
      delete options.config.gmail;
      writeConfig(options.config, options.home);
      send(200, disconnected);
      return true;
    }
    if (url.pathname === "/gmail/contacts" && request.method === "POST") {
      const input = z
        .object({
          name: z.string().trim().min(1).max(100),
          email: z.email().max(254),
        })
        .strict()
        .parse(await body(request));
      const config = options.config.gmail ?? savedGmailConfig(options.home);
      if (!config) throw new Error("Conecta Gmail antes de añadir contactos.");
      const next = writeConfig(
        {
          ...options.config,
          gmail: {
            ...config,
            contacts: { ...config.contacts, [input.name]: input.email },
          },
        },
        options.home,
      );
      Object.assign(options.config, next);
      send(200, { saved: input.name });
      return true;
    }
    send(404, { error: "Gmail route not found" });
    return true;
  } catch (error) {
    send(400, {
      error:
        error instanceof z.ZodError
          ? "Revisa los campos de conexión de Gmail."
          : error instanceof Error
            ? error.message
            : "No se pudo completar la conexión de Gmail.",
    });
    return true;
  }
}
