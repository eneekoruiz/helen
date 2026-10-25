import type http from "node:http";
import { z } from "zod";
import { withHomeLock, writeConfig } from "./home.js";
import {
  RecordatoriosConfigSchema,
  RecordatoriosHttpError,
  recordatoriosRequest,
  saveRecordatoriosAuthorization,
  disconnectRecordatoriosAuthorization,
  assertRecordatoriosAccount,
  recordatoriosStatus,
} from "./recordatorios.js";
import type { ServerOptions } from "./server.js";

const generations = new WeakMap<ServerOptions, number>();
const ConnectSchema = z
  .object({
    url: z.string().url().default("https://eneko-ruiz.com"),
    email: z.email().max(254).optional(),
    password: z.string().min(1).max(1000).optional(),
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    token: z
      .string()
      .min(1)
      .max(16000)
      .regex(/^[^\r\n]+$/)
      .optional(),
    speaker: z.literal(false).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.token
        ? !input.email && !input.password && !input.code
        : Boolean(input.email && input.password),
    "Provide a token or email and password",
  );
async function body(request: http.IncomingMessage): Promise<unknown> {
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
async function json(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 64000) throw new Error();
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

/** Called only after the assistant's bearer authentication. Never returns remote task content. */
export async function handleRecordatoriosRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  url: URL,
  options: ServerOptions,
  channel: "http" | "web",
): Promise<boolean> {
  if (!url.pathname.startsWith("/recordatorios/")) return false;
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(value));
  };
  if (
    !options.config.privacy.showSensitiveOn.includes(channel) ||
    url.searchParams.get("speaker") === "true"
  ) {
    send(403, { error: "Usa un canal privado autorizado." });
    return true;
  }
  const controller = new AbortController();
  const aborted = () => {
    if (!response.writableEnded) controller.abort();
  };
  request.once("aborted", aborted);
  response.once("close", aborted);
  try {
    if (url.pathname === "/recordatorios/status" && request.method === "GET") {
      const config = options.config.recordatorios;
      const local = recordatoriosStatus(options.home, config);
      if (!config || !local.connected) {
        send(200, local);
        return true;
      }
      const remote = await recordatoriosRequest(
        options.home,
        config,
        "/api/helen/sync",
        undefined,
        { fetcher: options.fetcher, signal: controller.signal },
      );
      const accountId = z.string().min(1).max(200).parse(remote.accountId);
      assertRecordatoriosAccount(options.home, config, accountId);
      send(200, {
        ...local,
        connected: true,
        url: new URL(config.url).origin,
        accountId,
      });
      return true;
    }
    if (
      url.pathname === "/recordatorios/connect" &&
      request.method === "POST"
    ) {
      const raw = await body(request);
      if (
        raw &&
        typeof raw === "object" &&
        (raw as { speaker?: unknown }).speaker === true
      ) {
        send(403, { error: "Usa un canal privado autorizado." });
        return true;
      }
      const input = ConnectSchema.parse(raw);
      const config = RecordatoriosConfigSchema.parse({ url: input.url });
      const generation = (generations.get(options) ?? 0) + 1;
      generations.set(options, generation);
      let token = input.token;
      let loginAccount: string | undefined;
      if (!token) {
        const response = await (options.fetcher ?? fetch)(
          new URL("/api/auth/login", config.url),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: input.email,
              password: input.password,
              ...(input.code ? { code: input.code } : {}),
            }),
            redirect: "error",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        const result = await json(response);
        if (response.status === 401 && result.twoFactorRequired === true) {
          send(409, {
            twoFactorRequired: true,
            error:
              "Introduce el código de verificación y vuelve a escribir tu contraseña.",
          });
          return true;
        }
        if (!response.ok) throw new Error();
        token = z
          .string()
          .min(1)
          .max(16000)
          .regex(/^[^\r\n]+$/)
          .parse(result.token);
        loginAccount = z
          .object({ id: z.string().min(1).max(200) })
          .parse(result.user).id;
      }
      const remote = await recordatoriosRequest(
        options.home,
        config,
        "/api/helen/sync",
        undefined,
        {
          fetcher: options.fetcher,
          env: { [config.tokenEnv]: token },
          signal: controller.signal,
        },
      );
      const accountId = z.string().min(1).max(200).parse(remote.accountId);
      if (loginAccount && loginAccount !== accountId) throw new Error();
      controller.signal.throwIfAborted();
      if (generations.get(options) !== generation) throw new Error();
      withHomeLock(options.home, () => {
        saveRecordatoriosAuthorization(options.home, config, token, accountId);
        Object.assign(
          options.config,
          writeConfig(
            { ...options.config, recordatorios: config },
            options.home,
          ),
        );
      });
      send(200, {
        connected: true,
        url: new URL(config.url).origin,
        accountId,
      });
      return true;
    }
    if (
      url.pathname === "/recordatorios/disconnect" &&
      request.method === "POST"
    ) {
      z.object({ confirm: z.literal(true) })
        .strict()
        .parse(await body(request));
      generations.set(options, (generations.get(options) ?? 0) + 1);
      withHomeLock(options.home, () => {
        disconnectRecordatoriosAuthorization(options.home);
        delete options.config.recordatorios;
        writeConfig(options.config, options.home);
      });
      send(200, { disconnected: true });
      return true;
    }
    send(404, { error: "Recordatorios route not found" });
    return true;
  } catch (error) {
    if (controller.signal.aborted || response.destroyed) return true;
    if (error instanceof RecordatoriosHttpError && error.status === 404)
      send(409, {
        connected: false,
        pendingDeployment: true,
        error:
          "La integración de Recordatorios está pendiente de desplegar. No se ha guardado una conexión nueva.",
      });
    else
      send(400, {
        error:
          "No se pudo verificar la conexión con Recordatorios. Revisa la dirección, las credenciales y la cuenta autorizada.",
      });
    return true;
  } finally {
    request.removeListener("aborted", aborted);
    response.removeListener("close", aborted);
  }
}
