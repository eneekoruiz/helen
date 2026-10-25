import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { updateCollection } from "./store.js";
import { buildAgenda, formatAgenda } from "./agenda.js";
import {
  ensureHome,
  readConfig,
  withHomeLock,
  writePrivate,
  type AssistantConfig,
} from "./home.js";
import {
  deliver,
  wasDelivered,
  type DeliveryChannel,
  type DeliveryResult,
  type Notification,
} from "./notify.js";
import {
  dueReminders,
  markDelivered,
  markDeliveryFailed,
  type Reminder,
} from "./reminders.js";
import { localDateKey, localParts, shortInstant } from "./time.js";
import { describeRecurrence } from "./when.js";
import { runDailyShutdown } from "./dailyRitual.js";

/**
 * The scheduler delivers reminders when they are due and the optional daily briefing. One scheduler runs per
 * home (a lease file guards it); per-channel claims also protect direct concurrent ticks.
 */
const LATE_MS = 5 * 60_000;

export const DeliverySchema = z.object({
  key: z.string(),
  occurrence: z.string(),
  channel: z.string(),
  state: z.enum(["inflight", "sent", "failed", "uncertain"]),
  updated: z.string().datetime(),
  error: z.string().optional(),
});
export type DeliveryStatus = z.infer<typeof DeliverySchema>;

export function deliveryStatus(home: string): DeliveryStatus[] {
  const file = path.join(home, "deliveries.json");
  if (!fs.existsSync(file)) return [];
  try {
    return z
      .object({ version: z.literal(1), items: z.array(DeliverySchema) })
      .parse(JSON.parse(fs.readFileSync(file, "utf8"))).items;
  } catch {
    throw new Error(
      "Invalid delivery ledger; repair it before sending notifications",
    );
  }
}

/** Resolve only after checking the destination: retry explicitly accepts duplicate risk. */
export function resolveDelivery(
  home: string,
  key: string,
  action: "sent" | "retry",
): void {
  updateCollection(home, "deliveries", DeliverySchema, (items) => {
    const item = items.find((entry) => entry.key === key);
    if (!item || !["inflight", "uncertain"].includes(item.state))
      throw new Error("No unresolved delivery with that key");
    item.state = action === "sent" ? "sent" : "failed";
    item.updated = new Date().toISOString();
  });
}

async function deliverOccurrence(
  home: string,
  occurrence: string,
  notification: Notification,
  channels: DeliveryChannel[],
  now: Date,
): Promise<DeliveryResult[]> {
  if (new Set(channels.map((channel) => channel.name)).size !== channels.length)
    throw new Error("Delivery channel names must be unique");
  deliveryStatus(home); // A corrupt ledger must never reset deduplication.
  return Promise.all(
    channels.map(async (channel) => {
      const key = JSON.stringify([occurrence, channel.name]);
      const previous = updateCollection(
        home,
        "deliveries",
        DeliverySchema,
        (items) => {
          const existing = items.find((item) => item.key === key);
          if (existing && existing.state !== "failed") return { ...existing };
          const entry: DeliveryStatus = {
            key,
            occurrence,
            channel: channel.name,
            state: "inflight",
            updated: now.toISOString(),
          };
          if (existing) Object.assign(existing, entry);
          else items.push(entry);
          return null;
        },
      );
      if (previous)
        return previous.state === "sent"
          ? { channel: channel.name, ok: true }
          : {
              channel: channel.name,
              ok: false,
              uncertain: true,
              error: `Delivery ${previous.state}; verify destination and resolve ${key}`,
            };
      const result = (await deliver(notification, [channel]))[0]!;
      updateCollection(home, "deliveries", DeliverySchema, (items) => {
        const item = items.find((entry) => entry.key === key)!;
        item.state = result.ok
          ? "sent"
          : result.uncertain
            ? "uncertain"
            : "failed";
        item.error = result.error;
        item.updated = now.toISOString();
      });
      return result;
    }),
  );
}

export function inQuietHours(config: AssistantConfig, now: Date): boolean {
  if (!config.quietHours) return false;
  const { hour, minute } = localParts(now, config.timezone);
  const clock = hour * 60 + minute;
  const minutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h! * 60 + m!;
  };
  const start = minutes(config.quietHours.start),
    end = minutes(config.quietHours.end);
  return start < end
    ? clock >= start && clock < end
    : clock >= start || clock < end;
}

export interface TickOptions {
  now?: Date;
  config?: AssistantConfig;
  channels: DeliveryChannel[];
}

export interface TickResult {
  delivered: Array<{ reminder: Reminder; results: DeliveryResult[] }>;
  failed: Array<{ reminder: Reminder; results: DeliveryResult[] }>;
  briefing?: DeliveryResult[];
}

function lang(config: AssistantConfig): "es" | "en" {
  return config.locale.startsWith("es") ? "es" : "en";
}

/** "Recordatorio: llamar a mamá" (+ "con retraso: era para las 09:00" when HELEN was off at the time). */
export function reminderNotification(
  reminder: Reminder,
  config: AssistantConfig,
  now: Date,
): Notification {
  const es = lang(config) === "es";
  const late = now.getTime() - Date.parse(reminder.due) > LATE_MS;
  const when = late
    ? es
      ? ` (con retraso: era para ${shortInstant(new Date(reminder.due), reminder.timezone ?? config.timezone, config.locale, now)})`
      : ` (late: it was due ${shortInstant(new Date(reminder.due), reminder.timezone ?? config.timezone, config.locale, now)})`
    : "";
  const every = reminder.recurrence
    ? ` · ${describeRecurrence(reminder.recurrence, es ? "es" : "en")}`
    : "";
  return {
    title: "HELEN",
    text: `${es ? "Recordatorio" : "Reminder"}: ${reminder.text}${when}${every}`,
    sensitive: reminder.sensitive,
    kind: "reminder",
    lang: es ? "es" : "en",
  };
}

interface SchedulerState {
  lastBriefing?: string;
  lastShutdown?: string;
}

function stateFile(home: string): string {
  return path.join(home, "scheduler-state.json");
}

function readState(home: string): SchedulerState {
  try {
    return JSON.parse(
      fs.readFileSync(stateFile(home), "utf8"),
    ) as SchedulerState;
  } catch {
    return {};
  }
}

/** Deliver what is due now. Safe to call often: it does nothing when nothing is due. */
export async function tick(
  home: string,
  options: TickOptions,
): Promise<TickResult> {
  const now = options.now ?? new Date();
  const config = options.config ?? readConfig(home);
  const result: TickResult = { delivered: [], failed: [] };

  for (const reminder of dueReminders(home, now)) {
    if (!reminder.urgent && inQuietHours(config, now)) continue;
    const results = await deliverOccurrence(
      home,
      `reminder:${reminder.id}:${reminder.due}`,
      reminderNotification(reminder, config, now),
      options.channels,
      now,
    );
    if (
      wasDelivered(results) &&
      results.every((entry) => entry.ok || entry.skipped)
    ) {
      result.delivered.push({
        reminder: markDelivered(
          home,
          reminder.id,
          config.timezone,
          now,
          reminder.due,
        ),
        results,
      });
    } else {
      markDeliveryFailed(home, reminder.id);
      result.failed.push({ reminder, results });
    }
  }

  const briefingTime = config.briefing.time;
  if (briefingTime) {
    const today = localDateKey(now, config.timezone);
    const local = localParts(now, config.timezone);
    const [hour, minute] = briefingTime.split(":").map(Number) as [
      number,
      number,
    ];
    const due =
      local.hour > hour || (local.hour === hour && local.minute >= minute);
    if (
      due &&
      !inQuietHours(config, now) &&
      readState(home).lastBriefing !== today
    ) {
      const es = lang(config) === "es";
      const agenda = formatAgenda(
        buildAgenda(home, "today", { now, timezone: config.timezone }),
        {
          lang: es ? "es" : "en",
          locale: config.locale,
          timezone: config.timezone,
          showSensitive: false,
        },
      );
      const results = await deliverOccurrence(
        home,
        `briefing:${today}`,
        {
          title: "HELEN",
          text: `${es ? "Buenos días" : "Good morning"}, ${config.owner}.\n${agenda}`,
          sensitive: false,
          kind: "briefing",
          lang: es ? "es" : "en",
        },
        options.channels,
        now,
      );
      if (
        wasDelivered(results) &&
        results.every((entry) => entry.ok || entry.skipped)
      )
        withHomeLock(home, () =>
          writePrivate(
            stateFile(home),
            `${JSON.stringify({ ...readState(home), lastBriefing: today })}\n`,
          ),
        );
      result.briefing = results;
    }
  }

  const shutdownTime = config.briefing.shutdownTime;
  if (shutdownTime) {
    const today = localDateKey(now, config.timezone);
    const local = localParts(now, config.timezone);
    const [hour, minute] = shutdownTime.split(":").map(Number) as [
      number,
      number,
    ];
    const due =
      local.hour > hour || (local.hour === hour && local.minute >= minute);
    if (
      due &&
      !inQuietHours(config, now) &&
      readState(home).lastShutdown !== today
    ) {
      const es = lang(config) === "es";
      const shutdown = runDailyShutdown(home, {
        now,
        timezone: config.timezone,
        locale: config.locale,
        lang: lang(config),
      });
      const notification: Notification = {
        title: es ? "HELEN · Cierre del Día" : "HELEN · Daily Shutdown",
        text: shutdown.text,
        sensitive: false,
        kind: "briefing",
        lang: lang(config),
      };
      const results = await deliverOccurrence(
        home,
        `shutdown:${today}`,
        notification,
        options.channels,
        now,
      );
      if (
        wasDelivered(results) &&
        results.every((entry) => entry.ok || entry.skipped)
      ) {
        withHomeLock(home, () =>
          writePrivate(
            stateFile(home),
            `${JSON.stringify({ ...readState(home), lastShutdown: today })}\n`,
          ),
        );
      }
    }
  }
  return result;
}

interface Lease {
  pid: number;
  host: string;
  started: string;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Become the only scheduler of this home, or throw saying who is. A lease left by a process that died is taken over.
 * Returns the function that gives the lease back.
 */
export function acquireSchedulerLease(home: string): () => void {
  if (!fs.existsSync(path.join(home, ".restore-transaction.json")))
    ensureHome(home);
  const file = path.join(home, "scheduler.pid");
  const mine: Lease = {
    pid: process.pid,
    host: os.hostname(),
    started: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(file, JSON.stringify(mine), { flag: "wx", mode: 0o600 });
      return () => {
        try {
          const current = JSON.parse(fs.readFileSync(file, "utf8")) as Lease;
          if (current.pid === mine.pid && current.host === mine.host)
            fs.rmSync(file, { force: true });
        } catch {
          // Already gone.
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let holder: Lease | null = null;
      try {
        holder = JSON.parse(fs.readFileSync(file, "utf8")) as Lease;
      } catch {
        holder = null;
      }
      if (holder && holder.host === os.hostname() && alive(holder.pid)) {
        throw new Error(
          `Another HELEN scheduler is already running (pid ${holder.pid}, since ${holder.started}). Stop it first, or run this server with --no-scheduler.`,
        );
      }
      if (holder && holder.host !== os.hostname()) {
        throw new Error(
          `A HELEN scheduler on ${holder.host} holds this home (${file}). If it is gone, delete that file.`,
        );
      }
      fs.rmSync(file, { force: true }); // its process is gone
    }
  }
  throw new Error(`Could not take the scheduler lease (${file}).`);
}

export interface SchedulerOptions {
  home: string;
  channels: DeliveryChannel[];
  intervalMs?: number;
  signal?: AbortSignal;
  log?: (message: string) => void;
}

/** Tick until aborted. Errors are logged and the loop goes on: a bad minute must not stop the reminders. */
export async function runScheduler(options: SchedulerOptions): Promise<void> {
  const interval = options.intervalMs ?? 20_000;
  const log = options.log ?? (() => undefined);
  while (!options.signal?.aborted) {
    try {
      const result = await tick(options.home, { channels: options.channels });
      for (const entry of result.delivered)
        log(
          `Reminder ${entry.reminder.id} delivered (${
            entry.results
              .filter((r) => r.ok)
              .map((r) => r.channel)
              .join(", ") || "no channel"
          }).`,
        );
      for (const entry of result.failed)
        log(
          `Reminder ${entry.reminder.id} not delivered yet: ${entry.results.map((r) => `${r.channel}: ${r.error ?? "ok"}`).join("; ")}`,
        );
    } catch (error) {
      log(`Scheduler error: ${(error as Error).message}`);
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, interval);
      options.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
