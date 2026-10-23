import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { withHomeLock, writePrivate } from "./home.js";
import { readCollection, updateCollection } from "./store.js";

/**
 * A little short-term memory per conversation (a Telegram chat, the terminal, an Alexa session): what HELEN
 * just asked ("¿Lo guardo?", "¿Cuándo?") so that a bare "sí" or "mañana a las 9" can complete it.
 */
const PendingSchema = z.object({
  kind: z.enum(["remember", "remind", "forget"]),
  text: z.string().max(20_000).optional(),
  id: z.string().max(40).optional(),
  expires: z.string().datetime(),
});

export const ConversationSchema = z.object({
  id: z.string().min(1).max(200),
  generation: z.string().max(40).optional(),
  pending: PendingSchema.optional(),
  /** The reminder this conversation talked about last ("cancélalo", "pospónlo"). */
  lastReminder: z.string().max(20).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
        sensitive: z.boolean(),
      }),
    )
    .max(24)
    .optional(),
  updated: z.string().datetime(),
});

export type Pending = z.infer<typeof PendingSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

const NAME = "conversations";
const PENDING_MINUTES = 10;
const FORGET_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
function generation(home: string): string {
  const file = path.join(home, "conversation-generation");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
}

export function getConversation(
  home: string,
  id: string,
  now: Date = new Date(),
): Conversation {
  const found = readCollection(home, NAME, ConversationSchema).items.find(
    (conversation) => conversation.id === id,
  );
  const conversation: Conversation =
    found && (found.generation ?? "") === generation(home)
      ? { ...found }
      : { id, generation: generation(home), updated: now.toISOString() };
  if (now.getTime() - Date.parse(conversation.updated) >= FORGET_AFTER_MS)
    return { id, generation: generation(home), updated: now.toISOString() };
  if (
    conversation.pending &&
    Date.parse(conversation.pending.expires) <= now.getTime()
  )
    delete conversation.pending;
  return conversation;
}

/** Forget ephemeral context in every channel, including copies of a forgotten note. */
export function clearConversations(home: string): void {
  withHomeLock(home, () => {
    writePrivate(
      path.join(home, "conversation-generation"),
      crypto.randomUUID(),
    );
    writePrivate(
      path.join(home, "conversations.json"),
      JSON.stringify({ version: 1, items: [] }),
    );
  });
}

export function pendingFor(
  kind: Pending["kind"],
  data: { text?: string; id?: string },
  now: Date = new Date(),
): Pending {
  return {
    kind,
    ...data,
    expires: new Date(now.getTime() + PENDING_MINUTES * 60_000).toISOString(),
  };
}

/** Store the conversation and drop the ones nobody used for two days. */
export function saveConversation(
  home: string,
  conversation: Conversation,
  now: Date = new Date(),
): void {
  updateCollection(home, NAME, ConversationSchema, (items) => {
    // A forgotten note must not reappear when an older model request finishes later.
    if ((conversation.generation ?? "") !== generation(home)) return;
    const fresh = items.filter(
      (item) =>
        item.id !== conversation.id &&
        now.getTime() - Date.parse(item.updated) < FORGET_AFTER_MS,
    );
    fresh.push({ ...conversation, updated: now.toISOString() });
    items.splice(0, items.length, ...fresh);
  });
}
