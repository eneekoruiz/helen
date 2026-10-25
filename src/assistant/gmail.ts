import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { readCollection, updateCollection } from "./store.js";

const address = z
  .string()
  .max(254)
  .regex(
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/,
  );
const envName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
export const GmailConfigSchema = z
  .object({
    account: address,
    accessTokenEnv: envName.optional(),
    clientIdEnv: envName.optional(),
    clientSecretEnv: envName.optional(),
    refreshTokenEnv: envName.optional(),
    contacts: z.record(z.string().min(1).max(100), address).default({}),
  })
  .refine(
    (value) =>
      value.accessTokenEnv || (value.clientIdEnv && value.refreshTokenEnv),
    "Gmail requires OAuth environment references",
  );
export type GmailConfig = z.infer<typeof GmailConfigSchema>;
export function resolveGmailRecipient(
  config: GmailConfig,
  raw: string,
): string {
  const value = raw.trim();
  if (address.safeParse(value).success) return value;
  const matches = Object.entries(config.contacts).filter(
    ([name]) => name.toLocaleLowerCase() === value.toLocaleLowerCase(),
  );
  if (matches.length !== 1)
    throw new Error(
      "Gmail recipient must be an exact email or an unambiguous saved contact",
    );
  return address.parse(matches[0]![1]);
}
const InputSchema = z
  .object({
    requestId: z.string().min(1).max(128),
    to: z.array(z.string().min(1).max(254)).min(1).max(20),
    subject: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[^\r\n]+$/)
      .refine((value) => !value.includes("\0")),
    body: z
      .string()
      .min(1)
      .max(100_000)
      .refine((value) => !value.includes("\0")),
  })
  .strict();
export type GmailDraftInput = z.infer<typeof InputSchema>;
const RecordSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().min(1).max(128),
  account: address,
  to: z.array(address),
  subject: InputSchema.shape.subject,
  body: InputSchema.shape.body,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  state: z.enum([
    "preparing",
    "drafted",
    "inflight",
    "uncertain",
    "sent",
    "failed",
  ]),
  createdAt: z.string(),
  draftId: z.string().optional(),
  messageId: z.string().optional(),
  verifiedAt: z.string().optional(),
});
export type GmailDraft = z.infer<typeof RecordSchema>;
export interface GmailOptions {
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}
const collection = "gmail-drafts";
const api = "https://gmail.googleapis.com/gmail/v1/users/me";

function flushLedger(home: string): void {
  const descriptor = fs.openSync(path.join(home, `${collection}.json`), "r+");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  // Windows cannot fsync directories; the atomic replacement is still flushed above.
  if (process.platform !== "win32") {
    const directory = fs.openSync(home, "r");
    try {
      fs.fsyncSync(directory);
    } finally {
      fs.closeSync(directory);
    }
  }
}

export function listGmailDrafts(home: string): GmailDraft[] {
  const loaded = readCollection(home, collection, RecordSchema);
  if (loaded.invalid.length)
    throw new Error(
      "Gmail ledger contains invalid entries; repair it before sending",
    );
  return loaded.items;
}
export function cancelGmailDraft(home: string, id: string): GmailDraft {
  return update(home, id, (draft) => {
    if (draft.state === "drafted") draft.state = "failed";
  });
}
function update(
  home: string,
  id: string,
  change: (draft: GmailDraft) => void,
): GmailDraft {
  const result = updateCollection(home, collection, RecordSchema, (items) => {
    const draft = items.find((item) => item.id === id);
    if (!draft) throw new Error("Gmail draft not found");
    change(draft);
    return { ...draft };
  });
  flushLedger(home);
  return result;
}

async function request(
  url: string,
  init: RequestInit,
  options: GmailOptions,
): Promise<Record<string, unknown>> {
  // The same deadline covers headers and the complete, bounded response body.
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, {
      ...init,
      redirect: "error",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Gmail network request failed or timed out");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Gmail request rejected (${response.status})`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Gmail returned an empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size <= 512_000) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 512_000) throw new Error("Gmail response exceeds limit");
      chunks.push(chunk.value);
    }
  } catch {
    throw new Error("Gmail response could not be read within limits");
  } finally {
    await reader.cancel().catch(() => {});
  }
  let result: unknown;
  try {
    result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Gmail returned invalid JSON");
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new Error("Gmail returned an invalid object");
  return result as Record<string, unknown>;
}
async function authorization(
  config: GmailConfig,
  options: GmailOptions,
): Promise<Record<string, string>> {
  const env = options.env ?? process.env;
  const read = (name: string | undefined): string => {
    const value = name ? env[name] : undefined;
    if (!value || /[\r\n]/.test(value))
      throw new Error("Gmail OAuth environment variable is missing or invalid");
    return value;
  };
  let token: string;
  if (config.accessTokenEnv) token = read(config.accessTokenEnv);
  else {
    const result = await request(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: read(config.clientIdEnv),
          ...(config.clientSecretEnv
            ? { client_secret: read(config.clientSecretEnv) }
            : {}),
          refresh_token: read(config.refreshTokenEnv),
        }).toString(),
      },
      options,
    );
    token = z
      .string()
      .min(1)
      .regex(/^[^\r\n]+$/)
      .parse(result.access_token);
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
async function accountHeaders(
  config: GmailConfig,
  options: GmailOptions,
): Promise<Record<string, string>> {
  const headers = await authorization(config, options);
  const profile = await request(`${api}/profile`, { headers }, options);
  if (
    typeof profile.emailAddress !== "string" ||
    profile.emailAddress.toLowerCase() !== config.account.toLowerCase()
  )
    throw new Error("Gmail OAuth account does not match configured sender");
  return headers;
}
export { request as gmailRequest, accountHeaders as gmailAccountHeaders };
function mime(
  draft: Pick<GmailDraft, "id" | "account" | "to" | "subject" | "body">,
): string {
  const body =
    Buffer.from(draft.body.replace(/\r?\n/g, "\r\n"), "utf8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") ?? "";
  const subject = Array.from(draft.subject)
    .reduce<string[]>((parts, char) => {
      const index = parts.length - 1;
      if (index < 0 || Buffer.byteLength(parts[index]! + char) > 42)
        parts.push(char);
      else parts[index] += char;
      return parts;
    }, [])
    .map((part) => `=?UTF-8?B?${Buffer.from(part).toString("base64")}?=`)
    .join("\r\n ");
  return Buffer.from(
    [
      `From: ${draft.account}`,
      `To: ${draft.to.join(",\r\n ")}`,
      `Subject: ${subject}`,
      `Message-ID: <${draft.id}@helen.local>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      body,
    ].join("\r\n"),
    "utf8",
  ).toString("base64url");
}
function hash(
  draft: Pick<GmailDraft, "account" | "to" | "subject" | "body">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([draft.account, draft.to, draft.subject, draft.body]),
    )
    .digest("hex");
}
export async function prepareGmailDraft(
  home: string,
  suppliedConfig: GmailConfig,
  input: GmailDraftInput,
  options: GmailOptions = {},
): Promise<GmailDraft> {
  const config = GmailConfigSchema.parse(suppliedConfig);
  const valid = InputSchema.parse(input);
  const to = [
    ...new Set(
      valid.to.map((recipient) => resolveGmailRecipient(config, recipient)),
    ),
  ];
  const content = {
    account: config.account,
    to,
    subject: valid.subject,
    body: valid.body,
  };
  const contentHash = hash(content);
  listGmailDrafts(home);
  const candidate: GmailDraft = {
    ...content,
    contentHash,
    id: randomUUID(),
    requestId: valid.requestId,
    state: "preparing",
    createdAt: new Date().toISOString(),
  };
  const record = updateCollection(home, collection, RecordSchema, (items) => {
    const existing = items.find((item) => item.requestId === valid.requestId);
    if (existing) {
      if (existing.contentHash !== contentHash)
        throw new Error(
          "Gmail request ID already belongs to different content",
        );
      return existing;
    }
    items.push(candidate);
    return candidate;
  });
  if (record.id !== candidate.id) return record;
  flushLedger(home);
  try {
    const headers = await accountHeaders(config, options);
    const remote = await request(
      `${api}/drafts`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ message: { raw: mime(record) } }),
      },
      options,
    );
    const draftId = z.string().min(1).max(256).parse(remote.id);
    return update(home, record.id, (draft) => {
      draft.draftId = draftId;
      draft.state = "drafted";
    });
  } catch {
    update(home, record.id, (draft) => {
      draft.state = "uncertain";
    });
    throw new Error(
      "Gmail draft creation could not be verified; no automatic retry. Check Gmail drafts and the local ledger.",
    );
  }
}

export async function sendGmailDraft(
  home: string,
  suppliedConfig: GmailConfig,
  id: string,
  consent: { ownerConfirmed: boolean; contentHash: string },
  options: GmailOptions = {},
): Promise<GmailDraft> {
  const config = GmailConfigSchema.parse(suppliedConfig);
  const record = listGmailDrafts(home).find((draft) => draft.id === id);
  if (!record || record.account !== config.account)
    throw new Error("Gmail draft not found for this account");
  if (
    !consent.ownerConfirmed ||
    consent.contentHash !== record.contentHash ||
    hash(record) !== record.contentHash
  )
    throw new Error("Owner approval must match the exact Gmail draft content");
  if (record.state === "sent") return record;
  if (record.state !== "drafted" || !record.draftId)
    throw new Error(
      "Gmail send is blocked: draft is not ready or a previous send is uncertain",
    );
  if (options.signal?.aborted) {
    cancelGmailDraft(home, id);
    throw new Error("Gmail send cancelled before delivery; draft preserved");
  }
  let headers: Record<string, string>;
  try {
    headers = await accountHeaders(config, options);
  } catch (error) {
    if (options.signal?.aborted) {
      cancelGmailDraft(home, id);
      throw new Error("Gmail send cancelled before delivery; draft preserved");
    }
    throw error;
  }
  if (options.signal?.aborted) {
    cancelGmailDraft(home, id);
    throw new Error("Gmail send cancelled before delivery; draft preserved");
  }
  const claimed = update(home, id, (draft) => {
    if (
      draft.state !== "drafted" ||
      draft.contentHash !== consent.contentHash ||
      hash(draft) !== consent.contentHash
    )
      throw new Error("Gmail draft was already claimed or changed");
    draft.state = "inflight";
  });
  try {
    const remote = await request(
      `${api}/drafts/send`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: claimed.draftId,
          message: { raw: mime(claimed) },
        }),
      },
      options,
    );
    const messageId = z.string().min(1).max(256).parse(remote.id);
    update(home, id, (draft) => {
      draft.messageId = messageId;
      draft.state = "uncertain";
    });
    return await verifySent(home, id, messageId, headers, options);
  } catch {
    update(home, id, (draft) => {
      draft.state = "uncertain";
    });
    throw new Error(
      "Gmail send awaits verification; do not resend. Reconcile the existing delivery first.",
    );
  }
}
async function verifySent(
  home: string,
  id: string,
  messageId: string,
  headers: Record<string, string>,
  options: GmailOptions,
): Promise<GmailDraft> {
  const message = await request(
    `${api}/messages/${encodeURIComponent(messageId)}?format=minimal`,
    { headers },
    options,
  );
  if (
    message.id !== messageId ||
    !Array.isArray(message.labelIds) ||
    !message.labelIds.includes("SENT")
  )
    throw new Error("Gmail Sent confirmation is missing");
  return update(home, id, (draft) => {
    draft.state = "sent";
    draft.verifiedAt = new Date().toISOString();
  });
}
export async function reconcileGmailSend(
  home: string,
  suppliedConfig: GmailConfig,
  id: string,
  options: GmailOptions = {},
): Promise<GmailDraft> {
  const config = GmailConfigSchema.parse(suppliedConfig);
  const record = listGmailDrafts(home).find((draft) => draft.id === id);
  if (!record || record.account !== config.account)
    throw new Error("Gmail draft not found for this account");
  if (record.state === "sent") return record;
  const headers = await accountHeaders(config, options);
  let messageId = record.messageId;
  if (!messageId) {
    const found = await request(
      `${api}/messages?${new URLSearchParams({ q: `in:sent rfc822msgid:${record.id}@helen.local`, maxResults: "2" })}`,
      { headers },
      options,
    );
    const matches = z
      .array(z.object({ id: z.string().min(1) }))
      .parse(found.messages ?? []);
    if (matches.length !== 1)
      throw new Error(
        "Gmail delivery remains uncertain; inspect Sent manually, without resending",
      );
    messageId = matches[0]!.id;
    update(home, id, (draft) => {
      draft.messageId = messageId;
    });
  }
  return verifySent(home, id, messageId, headers, options);
}
