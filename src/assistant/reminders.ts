import crypto from "node:crypto";
import { z } from "zod";
import { findSecrets, looksSensitive, secretRefusal } from "../core/secrets.js";
import { readCollection, updateCollection } from "./store.js";
import { oneLine, tokens } from "./text.js";
import { isValidTimeZone } from "./time.js";
import {
  nextOccurrence,
  parseWhen,
  stripWhen,
  type Recurrence,
} from "./when.js";

/**
 * Reminders: something to say at a given time, once or on a schedule. Times are stored in UTC and computed
 * from wall-clock time in the owner's time zone, so "every Monday at 8" stays at 8 across DST changes.
 */
const RecurrenceSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(366),
  byDay: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  month: z.number().int().min(1).max(12).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ReminderSchema = z.object({
  id: z.string().regex(/^r[0-9a-f]{6}$/),
  text: z.string().min(1).max(500),
  /** Next time it fires (UTC). */
  due: z.string().datetime(),
  recurrence: RecurrenceSchema.optional(),
  timezone: z.string().refine(isValidTimeZone).optional(),
  leadMinutes: z.number().int().min(0).max(525600).optional(),
  urgent: z.boolean().default(false),
  status: z.enum(["pending", "done", "cancelled"]),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  source: z.string().max(20),
  sensitive: z.boolean(),
  /** How many times it was delivered. */
  fired: z.number().int().min(0),
  lastFired: z.string().datetime().optional(),
  /** Delivery attempts that reached no channel (retried on the next tick). */
  failedAttempts: z.number().int().min(0).default(0),
  /** Native reminder created on an Alexa device for this one, so cancelling can remove it too. */
  alexaAlertToken: z.string().max(200).optional(),
});

export type Reminder = z.infer<typeof ReminderSchema>;

const NAME = "reminders";

export interface ReminderContext {
  timezone: string;
  locale: string;
  defaultTime: string;
  now?: Date;
}

export class WhenNotUnderstoodError extends Error {
  constructor(readonly lang: "es" | "en") {
    super(
      lang === "es"
        ? "No entiendo cuándo. Prueba con «mañana a las 9», «en 2 horas», «el viernes por la tarde» o «cada lunes a las 8»."
        : 'I do not understand when. Try "tomorrow at 9am", "in 2 hours", "on Friday afternoon" or "every Monday at 8".',
    );
    this.name = "WhenNotUnderstoodError";
  }
}

function newId(existing: Reminder[]): string {
  let id = "";
  do id = `r${crypto.randomBytes(3).toString("hex")}`;
  while (existing.some((reminder) => reminder.id === id));
  return id;
}

function cleanText(text: string): string {
  return oneLine(text).replace(/^(?:que|to|that)\s+/i, "");
}

export interface AddReminderInput {
  leadMinutes?: number;
  urgent?: boolean;
  /** The whole sentence ("llamar a mamá mañana a las 9") or just the task when `when` is given. */
  text: string;
  /** When, if not inside the text ("mañana a las 9"). */
  when?: string;
  source?: string;
  sensitive?: boolean;
}

/** Parse "what" and "when" from natural language and store the reminder. */
export function addReminder(
  home: string,
  input: AddReminderInput,
  context: ReminderContext,
): Reminder {
  const now = context.now ?? new Date();
  const leadPattern =
    /\b(\d+)\s*(minutos?|minutes?|horas?|hours?)\s+(?:antes(?:\s+de)?|before)\b/i;
  const leadMatch = leadPattern.exec(input.when ?? input.text);
  const naturalLead = leadMatch
    ? Number(leadMatch[1]) * (/^(hora|hour)/i.test(leadMatch[2]!) ? 60 : 1)
    : 0;
  if (
    leadMatch &&
    input.leadMinutes !== undefined &&
    input.leadMinutes !== naturalLead
  )
    throw new Error("Conflicting advance notice times");
  const leadMinutes = z
    .number()
    .int()
    .min(0)
    .max(525600)
    .parse(input.leadMinutes ?? naturalLead);
  if (!isValidTimeZone(context.timezone))
    throw new Error("Invalid reminder timezone");
  const lang = context.locale.startsWith("es") ? "es" : "en";
  const options = {
    now,
    timezone: context.timezone,
    defaultTime: context.defaultTime,
    locale: context.locale,
  };
  const sentence = (input.when ?? input.text).replace(leadPattern, " ");
  const parsed = parseWhen(sentence, options);
  if (!parsed) throw new WhenNotUnderstoodError(lang);
  const due = new Date(parsed.due.getTime() - leadMinutes * 60_000);
  const text = cleanText(
    input.when ? input.text : stripWhen(sentence, parsed.spans),
  );
  if (!text)
    throw new Error(
      lang === "es"
        ? "¿Qué quieres que te recuerde?"
        : "What should I remind you about?",
    );
  if (text.length > 500)
    throw new Error(
      lang === "es"
        ? "Es demasiado largo para un recordatorio; guárdalo como nota."
        : "Too long for a reminder; save it as a note.",
    );
  const secrets = findSecrets(text);
  if (secrets.length > 0) throw new Error(secretRefusal(secrets, lang));
  if (due.getTime() <= now.getTime()) {
    throw new Error(
      lang === "es"
        ? "Esa hora ya ha pasado. Dime otra."
        : "That time has already passed. Give me another one.",
    );
  }
  return updateCollection(home, NAME, ReminderSchema, (items) => {
    const stamp = now.toISOString();
    const reminder: Reminder = {
      id: newId(items),
      text,
      due: due.toISOString(),
      timezone: context.timezone,
      leadMinutes,
      urgent: input.urgent ?? false,
      ...(parsed.recurrence ? { recurrence: parsed.recurrence } : {}),
      status: "pending",
      created: stamp,
      updated: stamp,
      source:
        (input.source ?? "cli").replace(/[^a-z0-9-]/gi, "").slice(0, 20) ||
        "cli",
      sensitive: input.sensitive ?? looksSensitive(text),
      fired: 0,
      failedAttempts: 0,
    };
    items.push(reminder);
    return reminder;
  });
}

export function listReminders(
  home: string,
  filter: { status?: Reminder["status"] | "all"; from?: Date; to?: Date } = {},
): Reminder[] {
  const status = filter.status ?? "pending";
  return readCollection(home, NAME, ReminderSchema)
    .items.filter(
      (reminder) =>
        (status === "all" || reminder.status === status) &&
        (!filter.from || Date.parse(reminder.due) >= filter.from.getTime()) &&
        (!filter.to || Date.parse(reminder.due) < filter.to.getTime()),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
}

export interface Occurrence {
  reminder: Reminder;
  at: Date;
}

/** Every time a pending reminder fires within [from, to), recurring ones expanded. */
export function occurrencesBetween(
  home: string,
  from: Date,
  to: Date,
  timezone: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const reminder of listReminders(home)) {
    let at: Date | null = new Date(reminder.due);
    let guard = 0;
    while (at && at < to && guard < 400) {
      if (at >= from) out.push({ reminder, at });
      at = reminder.recurrence
        ? nextReminderOccurrence(reminder, at, timezone)
        : null;
      guard += 1;
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Find a reminder by id or by what it says ("cancela el recordatorio de mamá"). Throws when nothing or
 * several equally good matches are found, so a voice command never cancels the wrong one.
 */
export function findReminder(
  home: string,
  ref: string,
  lang: "es" | "en" = "es",
): Reminder {
  const pending = listReminders(home);
  const byId = pending.find((reminder) => reminder.id === ref.trim());
  if (byId) return byId;
  return bestMatch(
    pending,
    ref,
    (reminder) => reminder.text,
    lang === "es" ? "recordatorio" : "reminder",
    lang,
  );
}

export function bestMatch<T>(
  candidates: T[],
  ref: string,
  text: (item: T) => string,
  noun: string,
  lang: "es" | "en",
): T {
  const wanted = new Set(tokens(ref));
  const scored = candidates
    .map((item) => {
      const words = tokens(text(item));
      const hits = words.filter((word) => wanted.has(word)).length;
      return {
        item,
        score:
          hits === 0
            ? 0
            : hits / Math.max(wanted.size, 1) +
              hits / Math.max(words.length, 1),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0)
    throw new Error(
      lang === "es"
        ? `No encuentro ningún ${noun} que encaje con «${ref}».`
        : `I cannot find a ${noun} matching "${ref}".`,
    );
  if (scored.length > 1 && scored[1]!.score === scored[0]!.score) {
    const options = scored
      .filter((entry) => entry.score === scored[0]!.score)
      .slice(0, 4)
      .map((entry) => `«${text(entry.item)}»`)
      .join(", ");
    throw new Error(
      lang === "es"
        ? `Hay varios: ${options}. ¿Cuál?`
        : `There are several: ${options}. Which one?`,
    );
  }
  return scored[0]!.item;
}

function mutate(
  home: string,
  id: string,
  change: (reminder: Reminder) => void,
): Reminder {
  return updateCollection(home, NAME, ReminderSchema, (items) => {
    const reminder = items.find((candidate) => candidate.id === id);
    if (!reminder) throw new Error(`No reminder with id ${id}.`);
    change(reminder);
    reminder.updated = new Date().toISOString();
    return { ...reminder };
  });
}

export function cancelReminder(home: string, id: string): Reminder {
  return mutate(home, id, (reminder) => {
    reminder.status = "cancelled";
  });
}

export function completeReminder(home: string, id: string): Reminder {
  return mutate(home, id, (reminder) => {
    reminder.status = "done";
  });
}

/** "10", "una hora", "2 días" are offsets from now: spell them as "en …" so the date parser reads them. */
export function relativeWhen(when: string, lang: "es" | "en"): string {
  const inWord = lang === "es" ? "en" : "in";
  const text = when.trim();
  if (/^\d+$/.test(text))
    return `${inWord} ${text} ${lang === "es" ? "minutos" : "minutes"}`;
  if (
    /^(?:\d+|un|una|media|an?|half)\s*(?:min|minutos?|minutes?|h|horas?|hours?|hora|hour|d[ií]as?|days?)\b/i.test(
      text,
    )
  )
    return `${inWord} ${text}`;
  return text;
}

/** Move a reminder: "10 minutos", "en una hora", "mañana a las 9". A bare number means minutes. */
export function snoozeReminder(
  home: string,
  id: string,
  when: string,
  context: ReminderContext,
): Reminder {
  const now = context.now ?? new Date();
  const lang = context.locale.startsWith("es") ? "es" : "en";
  const text = relativeWhen(when, lang);
  const existing = listReminders(home, { status: "all" }).find(
    (item) => item.id === id,
  );
  const parsed = parseWhen(text, {
    now,
    timezone: existing?.timezone ?? context.timezone,
    defaultTime: context.defaultTime,
    locale: context.locale,
  });
  if (!parsed || parsed.due <= now) throw new WhenNotUnderstoodError(lang);
  return mutate(home, id, (reminder) => {
    reminder.due = parsed.due.toISOString();
    reminder.status = "pending";
    reminder.failedAttempts = 0;
  });
}

export function attachAlexaToken(
  home: string,
  id: string,
  alertToken: string,
): Reminder {
  return mutate(home, id, (reminder) => {
    reminder.alexaAlertToken = alertToken;
  });
}

/** Pending reminders whose time has come. */
export function dueReminders(home: string, now: Date = new Date()): Reminder[] {
  return listReminders(home).filter(
    (reminder) => Date.parse(reminder.due) <= now.getTime(),
  );
}

/**
 * Record a delivery. A one-off reminder is done; a recurring one moves to its next occurrence after now,
 * so occurrences missed while HELEN was off are announced once, not one by one.
 */
export function markDelivered(
  home: string,
  id: string,
  timezone: string,
  now: Date = new Date(),
  expectedDue?: string,
): Reminder {
  return mutate(home, id, (reminder) => {
    if (
      expectedDue &&
      (reminder.due !== expectedDue || reminder.status !== "pending")
    )
      return;
    reminder.fired += 1;
    reminder.lastFired = now.toISOString();
    reminder.failedAttempts = 0;
    const next = reminder.recurrence
      ? nextReminderOccurrence(reminder, now, timezone)
      : null;
    if (next) reminder.due = next.toISOString();
    else reminder.status = "done";
  });
}

/** Recurrence is the event's wall time; the lead is subtracted on every occurrence. */
function nextReminderOccurrence(
  reminder: Reminder,
  after: Date,
  timezone: string,
): Date | null {
  const lead = (reminder.leadMinutes ?? 0) * 60_000;
  const next = nextOccurrence(
    reminder.recurrence as Recurrence,
    new Date(after.getTime() + lead),
    reminder.timezone ?? timezone,
  );
  return next ? new Date(next.getTime() - lead) : null;
}

export function markDeliveryFailed(home: string, id: string): Reminder {
  return mutate(home, id, (reminder) => {
    reminder.failedAttempts += 1;
  });
}
