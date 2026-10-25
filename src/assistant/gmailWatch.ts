import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { withHomeLock } from "./home.js";
import {
  GmailConfigSchema,
  gmailAccountHeaders,
  gmailRequest,
  listGmailDrafts,
  resolveGmailRecipient,
  type GmailConfig,
  type GmailOptions,
  type GmailDraft,
} from "./gmail.js";
import { ReminderSchema } from "./reminders.js";
import { readCollection, updateCollection } from "./store.js";

export interface GmailReply {
  id: string;
  recordId: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  untrusted: true;
}
export interface GmailReplyTarget {
  contact?: string;
  recordId?: string;
  threadId?: string;
}
const api = "https://gmail.googleapis.com/gmail/v1/users/me";
const HeaderSchema = z.object({
  name: z.string(),
  value: z.string().max(8192),
});
const MessageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  internalDate: z.string().regex(/^\d+$/),
  payload: z.unknown().optional(),
});
function header(payload: unknown, name: string): string {
  if (!payload || typeof payload !== "object") return "";
  const headers = z
    .array(HeaderSchema)
    .max(1000)
    .parse((payload as { headers?: unknown }).headers ?? []);
  return (
    headers.find((item) => item.name.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}
function sender(raw: string): string | undefined {
  const match = /^(?:[^<>\r\n]*<)?([^<>\s,]+@[^<>\s,]+)>?$/.exec(raw.trim());
  return match?.[1]?.toLowerCase();
}
function plainBody(payload: unknown, depth = 0): string {
  if (depth > 8 || !payload || typeof payload !== "object") return "";
  const part = payload as {
    mimeType?: unknown;
    body?: { data?: unknown };
    parts?: unknown;
  };
  if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
    const data = z.string().max(256_000).optional().parse(part.body?.data);
    if (!data) return "";
    const text = Buffer.from(data, "base64url").toString("utf8").slice(0, 8000);
    return (
      part.mimeType === "text/html"
        ? text
            .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
            .replace(/<[^<>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
        : text
    )
      .replaceAll("\0", "")
      .slice(0, 8000);
  }
  const parts = z.array(z.unknown()).max(200).optional().parse(part.parts) ?? [];
  const preferred = parts.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { mimeType?: unknown }).mimeType === "text/plain",
  );
  return (preferred.length ? preferred : parts)
    .map((item) => plainBody(item, depth + 1))
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);
}
function sentRecords(
  home: string,
  config: GmailConfig,
  target: GmailReplyTarget,
): GmailDraft[] {
  const contact = target.contact
    ? resolveGmailRecipient(config, target.contact).toLowerCase()
    : undefined;
  const records = listGmailDrafts(home).filter(
    (record) =>
      record.state === "sent" &&
      record.verifiedAt &&
      record.messageId &&
      record.account.toLowerCase() === config.account.toLowerCase() &&
      (!target.recordId || record.id === target.recordId) &&
      (!contact || record.to.some((to) => to.toLowerCase() === contact)),
  );
  if (!records.length)
    throw new Error(
      "Gmail reply checks require a known verified sent message for this account and recipient",
    );
  return records.slice(-5).reverse();
}
export async function getGmailReplies(
  home: string,
  suppliedConfig: GmailConfig,
  target: GmailReplyTarget = {},
  options: GmailOptions = {},
): Promise<GmailReply[]> {
  const config = GmailConfigSchema.parse(suppliedConfig);
  const records = sentRecords(home, config, target);
  const wanted = target.contact
    ? resolveGmailRecipient(config, target.contact).toLowerCase()
    : undefined;
  const headers = await gmailAccountHeaders(config, options);
  const replies = new Map<string, GmailReply>();
  for (const record of records) {
    options.signal?.throwIfAborted();
    const sent = MessageSchema.parse(
      await gmailRequest(
        `${api}/messages/${encodeURIComponent(record.messageId!)}?format=metadata`,
        { headers },
        options,
      ),
    );
    if (target.threadId && target.threadId !== sent.threadId) continue;
    const thread = await gmailRequest(
      `${api}/threads/${encodeURIComponent(sent.threadId)}?format=full`,
      { headers },
      options,
    );
    const messages = z
      .array(MessageSchema)
      .max(100)
      .parse(thread.messages ?? []);
    for (const message of messages) {
      const from = sender(header(message.payload, "from"));
      const received = Number(message.internalDate);
      if (
        !from ||
        from === config.account.toLowerCase() ||
        received <= Number(sent.internalDate) ||
        !record.to.some((to) => to.toLowerCase() === from) ||
        (wanted && wanted !== from) ||
        !Number.isFinite(received) ||
        message.threadId !== sent.threadId
      )
        continue;
      replies.set(message.id, {
        id: message.id,
        recordId: record.id,
        threadId: sent.threadId,
        from,
        subject: header(message.payload, "subject").slice(0, 300),
        body: plainBody(message.payload),
        receivedAt: new Date(received).toISOString(),
        untrusted: true,
      });
    }
  }
  return [...replies.values()]
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    .slice(-20);
}

const WatchSchema = z.object({
  id: z.string().uuid(),
  account: z.email(),
  owner: z.string().min(1).max(256),
  channel: z.string().min(1).max(30),
  conversation: z.string().min(1).max(256),
  recordId: z.string().uuid(),
  contact: z.email(),
  createdAt: z.string().datetime(),
  state: z.enum(["active", "done", "cancelled"]),
  autoReminder: z.boolean(),
  reminderMinutes: z.number().int().min(1).max(525600),
  noReplyDue: z.string().datetime().optional(),
  noReplyQueued: z.boolean().default(false),
  seen: z.array(z.string()).max(20).default([]),
  reservations: z
    .array(
      z.object({
        key: z.string(),
        id: z.string().regex(/^r[0-9a-f]{6}$/),
        due: z.string().datetime(),
        text: z.string(),
      }),
    )
    .max(42)
    .default([]),
});
export type GmailWatch = z.infer<typeof WatchSchema>;
export interface GmailWatchInput extends GmailReplyTarget {
  owner: string;
  channel: string;
  conversation: string;
  autoReminder?: boolean;
  reminderMinutes?: number;
  noReplyAfterMinutes?: number;
}
export function listGmailWatches(home: string): GmailWatch[] {
  const collection = readCollection(home, "gmail-watches", WatchSchema);
  if (collection.invalid.length)
    throw new Error(
      "Gmail watch ledger contains invalid entries; repair it before polling",
    );
  return collection.items;
}
export function createGmailWatch(
  home: string,
  suppliedConfig: GmailConfig,
  input: GmailWatchInput,
  options: { now?: Date } = {},
): GmailWatch {
  if (input.threadId)
    throw new Error(
      "Create a Gmail watch using its known local sent record or exact contact",
    );
  const config = GmailConfigSchema.parse(suppliedConfig);
  const record = sentRecords(home, config, input)[0]!;
  const contact = input.contact
    ? resolveGmailRecipient(config, input.contact)
    : record.to.length === 1
      ? record.to[0]!
      : undefined;
  if (!contact) throw new Error("Specify the exact recipient to watch");
  const now = options.now ?? new Date();
  const after =
    input.noReplyAfterMinutes === undefined
      ? undefined
      : z.number().int().min(1).max(525600).parse(input.noReplyAfterMinutes);
  const watch = WatchSchema.parse({
    ...input,
    id: randomUUID(),
    account: config.account,
    recordId: record.id,
    contact,
    state: "active",
    createdAt: now.toISOString(),
    autoReminder: input.autoReminder ?? false,
    reminderMinutes: input.reminderMinutes ?? 30,
    noReplyDue: after
      ? new Date(now.getTime() + after * 60_000).toISOString()
      : undefined,
  });
  listGmailWatches(home);
  return updateCollection(home, "gmail-watches", WatchSchema, (items) => {
    const existing = items.find(
      (item) =>
        item.state === "active" &&
        item.recordId === watch.recordId &&
        item.contact === watch.contact &&
        item.owner === watch.owner &&
        item.channel === watch.channel &&
        item.conversation === watch.conversation,
    );
    if (existing) {
      if (input.autoReminder !== undefined)
        existing.autoReminder = watch.autoReminder;
      if (input.reminderMinutes !== undefined)
        existing.reminderMinutes = watch.reminderMinutes;
      if (after !== undefined) {
        existing.noReplyDue = watch.noReplyDue;
        existing.noReplyQueued = false;
      }
      return existing;
    }
    if (items.filter((item) => item.state === "active").length >= 20)
      throw new Error("At most 20 Gmail watches can be active");
    items.push(watch);
    return watch;
  });
}
export function cancelGmailWatch(home: string, id: string): GmailWatch {
  return withHomeLock(home, () => {
    const cancelled = updateCollection(
      home,
      "gmail-watches",
      WatchSchema,
      (items) => {
        const watch = items.find((item) => item.id === id);
        if (!watch) throw new Error("Gmail watch not found");
        watch.state = "cancelled";
        return watch;
      },
    );
    updateCollection(home, "reminders", ReminderSchema, (items) => {
      for (const reminder of items)
        if (
          reminder.status === "pending" &&
          cancelled.reservations.some((held) => held.id === reminder.id)
        ) {
          reminder.status = "cancelled";
          reminder.updated = new Date().toISOString();
        }
    });
    return cancelled;
  });
}
function queue(
  home: string,
  watchId: string,
  key: string,
  due: Date,
  text: string,
): boolean {
  return withHomeLock(home, () => {
    const current = listGmailWatches(home).find(
      (watch) => watch.id === watchId,
    );
    if (!current || current.state !== "active") return false;
    const reservation = updateCollection(
      home,
      "gmail-watches",
      WatchSchema,
      (items) => {
        const watch = items.find((item) => item.id === watchId)!;
        const existing = watch.reservations.find((item) => item.key === key);
        if (existing) return existing;
        const reminders = readCollection(home, "reminders", ReminderSchema);
        if (reminders.invalid.length)
          throw new Error("Reminder ledger contains invalid entries");
        let id: string;
        do id = `r${randomBytes(3).toString("hex")}`;
        while (
          reminders.items.some((item) => item.id === id) ||
          items.some((item) => item.reservations.some((held) => held.id === id))
        );
        const held = { key, id, due: due.toISOString(), text };
        watch.reservations.push(held);
        return held;
      },
    );
    return updateCollection(home, "reminders", ReminderSchema, (items) => {
      if (items.some((item) => item.id === reservation.id)) return false;
      const stamp = new Date().toISOString();
      items.push(
        ReminderSchema.parse({
          id: reservation.id,
          text: reservation.text,
          due: reservation.due,
          status: "pending",
          created: stamp,
          updated: stamp,
          source: "gmail-watch",
          sensitive: false,
          fired: 0,
        }),
      );
      return true;
    });
  });
}
export async function runGmailWatches(
  home: string,
  suppliedConfig: GmailConfig,
  options: GmailOptions & { now?: Date } = {},
): Promise<{ checked: number; scheduled: number; errors: string[] }> {
  const config = GmailConfigSchema.parse(suppliedConfig);
  const now = options.now ?? new Date();
  const result = { checked: 0, scheduled: 0, errors: [] as string[] };
  const watches = listGmailWatches(home)
    .filter(
      (watch) =>
        watch.state === "active" &&
        watch.account.toLowerCase() === config.account.toLowerCase(),
    )
    .slice(0, 20);
  for (const watch of watches) {
    if (options.signal?.aborted) break;
    result.checked++;
    try {
      const replies = await getGmailReplies(
        home,
        config,
        { recordId: watch.recordId, contact: watch.contact },
        options,
      );
      if (options.signal?.aborted) break;
      const reply = replies.find((item) => !watch.seen.includes(item.id));
      if (reply) {
        if (
          queue(
            home,
            watch.id,
            `reply:${reply.id}`,
            now,
            "Tienes una respuesta de correo pendiente de revisar en privado.",
          )
        )
          result.scheduled++;
        if (
          watch.autoReminder &&
          queue(
            home,
            watch.id,
            `reminder:${reply.id}`,
            new Date(now.getTime() + watch.reminderMinutes * 60_000),
            "Recuerda revisar en privado la respuesta de correo pendiente.",
          )
        )
          result.scheduled++;
        updateCollection(home, "gmail-watches", WatchSchema, (items) => {
          const current = items.find((item) => item.id === watch.id)!;
          if (current.state === "active") {
            current.seen.push(reply.id);
            current.state = "done";
          }
        });
      } else if (
        watch.noReplyDue &&
        !watch.noReplyQueued &&
        new Date(watch.noReplyDue) <= now
      ) {
        if (
          queue(
            home,
            watch.id,
            "no-reply",
            now,
            "Sigue pendiente comprobar en privado la respuesta de un correo.",
          )
        )
          result.scheduled++;
        updateCollection(home, "gmail-watches", WatchSchema, (items) => {
          const current = items.find((item) => item.id === watch.id)!;
          if (current.state === "active") current.noReplyQueued = true;
        });
      }
    } catch {
      result.errors.push(
        `Gmail watch ${watch.id} could not be checked; no delivery was assumed`,
      );
    }
  }
  return result;
}
