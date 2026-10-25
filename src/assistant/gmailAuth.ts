import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { withHomeLock, writePrivate } from "./home.js";
import {
  GmailConfigSchema,
  type GmailConfig,
  clearGmailTokenCache,
} from "./gmail.js";

export const GMAIL_AUTH_ENV = {
  clientId: "HELEN_GOOGLE_CLIENT_ID",
  clientSecret: "HELEN_GOOGLE_CLIENT_SECRET",
  refreshToken: "HELEN_GOOGLE_REFRESH_TOKEN",
  accessToken: "HELEN_GOOGLE_ACCESS_TOKEN",
} as const;
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;
const secret = z
  .string()
  .min(1)
  .max(8192)
  .regex(/^[^\r\n]+$/);
const PendingSchema = z.object({
  state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  clientId: secret,
  clientSecret: secret.optional(),
  redirectUri: z.string(),
  owner: z.string().min(1).max(256),
  expiresAt: z.number(),
  consumed: z.boolean().default(false),
});
const ConnectionSchema = z.object({
  account: z.email(),
  clientId: secret,
  clientSecret: secret.optional(),
  accessToken: secret,
  refreshToken: secret.optional(),
  scopes: z.array(z.string()),
  expiresAt: z.number(),
  connectedAt: z.string(),
});
export interface GmailAuthOptions {
  fetch?: typeof fetch;
  now?: () => number;
}
export interface GmailAuthStart {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  owner: string;
}
const pendingFile = (home: string) =>
  path.join(home, "gmail-oauth-pending.json");
const authFile = (home: string) => path.join(home, "gmail-auth.json");
function load<T>(file: string, schema: z.ZodType<T>): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  let descriptor: number | undefined;
  try {
    const before = fs.lstatSync(file);
    if (before.isSymbolicLink() || !before.isFile() || before.size > 128_000)
      throw new Error();
    descriptor = fs.openSync(
      file,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    const stat = fs.fstatSync(descriptor);
    if (
      !stat.isFile() ||
      stat.ino !== before.ino ||
      stat.dev !== before.dev ||
      stat.size > 128_000
    )
      throw new Error();
    const buffer = Buffer.alloc(128_001);
    const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
    if (bytes > 128_000) throw new Error();
    return schema.parse(JSON.parse(buffer.subarray(0, bytes).toString("utf8")));
  } catch {
    throw new Error("Gmail OAuth state is invalid; reconnect Gmail");
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
function persist(file: string, value: unknown): void {
  writePrivate(file, `${JSON.stringify(value)}\n`);
  const descriptor = fs.openSync(file, "r+");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}
function redirect(value: string): string {
  const url = new URL(value);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Gmail callback must be HTTPS or loopback HTTP, without credentials, query or fragment",
    );
  return url.href;
}
async function request(
  url: string,
  init: RequestInit,
  options: GmailAuthOptions,
): Promise<Record<string, unknown>> {
  try {
    const response = await (options.fetch ?? fetch)(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error();
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (size <= 64_000) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 64_000) throw new Error();
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new Error(
      "Google OAuth request failed; start a new Gmail connection without sharing credentials",
    );
  }
}

export function startGmailAuth(
  home: string,
  input: GmailAuthStart,
  options: GmailAuthOptions = {},
): { url: string; state: string; expiresAt: number } {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const pending = PendingSchema.parse({
    ...input,
    redirectUri: redirect(input.redirectUri),
    state,
    verifier,
    expiresAt: (options.now?.() ?? Date.now()) + 10 * 60_000,
  });
  withHomeLock(home, () => persist(pendingFile(home), pending));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: pending.clientId,
    redirect_uri: pending.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  }).toString();
  return { url: url.href, state, expiresAt: pending.expiresAt };
}

export function readGmailConnection(home: string):
  | {
      account: string;
      scopes: string[];
      connectedAt: string;
      expiresAt: number;
      refreshable: boolean;
    }
  | undefined {
  const connection = load(authFile(home), ConnectionSchema);
  if (!connection) return undefined;
  return {
    account: connection.account,
    scopes: connection.scopes,
    connectedAt: connection.connectedAt,
    expiresAt: connection.expiresAt,
    refreshable: Boolean(connection.refreshToken),
  };
}
export function gmailAuthEnvironment(
  home: string,
  now = Date.now(),
): NodeJS.ProcessEnv {
  const connection = load(authFile(home), ConnectionSchema);
  if (!connection) return {};
  if (connection.refreshToken)
    return {
      [GMAIL_AUTH_ENV.clientId]: connection.clientId,
      ...(connection.clientSecret
        ? { [GMAIL_AUTH_ENV.clientSecret]: connection.clientSecret }
        : {}),
      [GMAIL_AUTH_ENV.refreshToken]: connection.refreshToken,
    };
  if (connection.expiresAt <= now)
    throw new Error("Gmail authorization expired; reconnect Gmail");
  return { [GMAIL_AUTH_ENV.accessToken]: connection.accessToken };
}
export function savedGmailConfig(home: string): GmailConfig | undefined {
  const connection = load(authFile(home), ConnectionSchema);
  if (!connection) return undefined;
  return GmailConfigSchema.parse({
    account: connection.account,
    ...(connection.refreshToken
      ? {
          clientIdEnv: GMAIL_AUTH_ENV.clientId,
          ...(connection.clientSecret
            ? { clientSecretEnv: GMAIL_AUTH_ENV.clientSecret }
            : {}),
          refreshTokenEnv: GMAIL_AUTH_ENV.refreshToken,
        }
      : { accessTokenEnv: GMAIL_AUTH_ENV.accessToken }),
  });
}
export async function completeGmailAuth(
  home: string,
  input: { state: string; code: string; redirectUri: string },
  options: GmailAuthOptions = {},
): Promise<NonNullable<ReturnType<typeof readGmailConnection>>> {
  const code = secret.parse(input.code);
  const now = options.now?.() ?? Date.now();
  const pending = withHomeLock(home, () => {
    const value = load(pendingFile(home), PendingSchema);
    if (
      !value ||
      value.consumed ||
      value.state !== input.state ||
      value.expiresAt <= now ||
      value.redirectUri !== redirect(input.redirectUri)
    )
      throw new Error(
        "Gmail OAuth state is invalid, expired or already consumed",
      );
    // Persist consumption before exchanging the code, including after a process restart.
    persist(pendingFile(home), { ...value, consumed: true });
    return value;
  });
  try {
    const token = await request(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: pending.clientId,
          ...(pending.clientSecret
            ? { client_secret: pending.clientSecret }
            : {}),
          code,
          code_verifier: pending.verifier,
          redirect_uri: pending.redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      },
      options,
    );
    const accessToken = secret.parse(token.access_token);
    const scopes = z.string().parse(token.scope).split(/\s+/);
    if (!GMAIL_SCOPES.every((scope) => scopes.includes(scope)))
      throw new Error();
    const profile = await request(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } },
      options,
    );
    const connection = ConnectionSchema.parse({
      account: profile.emailAddress,
      clientId: pending.clientId,
      clientSecret: pending.clientSecret,
      accessToken,
      refreshToken: token.refresh_token,
      scopes,
      expiresAt:
        now +
        z.number().int().min(1).max(86_400).parse(token.expires_in) * 1000,
      connectedAt: new Date(now).toISOString(),
    });
    withHomeLock(home, () => {
      const current = load(pendingFile(home), PendingSchema);
      if (!current || current.state !== pending.state || !current.consumed)
        throw new Error();
      persist(authFile(home), connection);
      fs.rmSync(pendingFile(home), { force: true });
    });
    return readGmailConnection(home)!;
  } catch {
    throw new Error(
      "Gmail connection could not be verified; reconnect from HELEN. No credentials were displayed.",
    );
  }
}
export async function disconnectGmail(
  home: string,
  input: { revoke: boolean },
  options: GmailAuthOptions = {},
): Promise<{ disconnected: true; revoked: boolean }> {
  const connection = withHomeLock(home, () => {
    clearGmailTokenCache();
    const saved = load(authFile(home), ConnectionSchema);
    fs.rmSync(authFile(home), { force: true });
    fs.rmSync(pendingFile(home), { force: true });
    return saved;
  });
  let revoked = false;
  if (input.revoke && connection) {
    try {
      const response = await (options.fetch ?? fetch)(
        "https://oauth2.googleapis.com/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: connection.refreshToken ?? connection.accessToken,
          }).toString(),
          signal: AbortSignal.timeout(15_000),
          redirect: "error",
        },
      );
      revoked = response.ok;
      await response.body?.cancel().catch(() => {});
    } catch {
      revoked = false;
    }
  }
  return { disconnected: true, revoked };
}
