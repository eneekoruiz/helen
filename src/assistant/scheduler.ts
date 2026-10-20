import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAgenda, formatAgenda } from './agenda.js';
import { ensureHome, readConfig, withHomeLock, writePrivate, type AssistantConfig } from './home.js';
import { deliver, wasDelivered, type DeliveryChannel, type DeliveryResult, type Notification } from './notify.js';
import { dueReminders, markDelivered, markDeliveryFailed, type Reminder } from './reminders.js';
import { localDateKey, localParts, shortInstant } from './time.js';
import { describeRecurrence } from './when.js';

/**
 * The scheduler delivers reminders when they are due and the optional daily briefing. One scheduler runs per
 * home (a lease file guards it), so two servers never announce the same reminder twice.
 */
const LATE_MS = 5 * 60_000;
/** Past this, a reminder nobody could receive is closed instead of retried forever. */
const GIVE_UP_MS = 24 * 3600_000;

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

function lang(config: AssistantConfig): 'es' | 'en' {
  return config.locale.startsWith('es') ? 'es' : 'en';
}

/** "Recordatorio: llamar a mamá" (+ "con retraso: era para las 09:00" when HELEN was off at the time). */
export function reminderNotification(reminder: Reminder, config: AssistantConfig, now: Date): Notification {
  const es = lang(config) === 'es';
  const late = now.getTime() - Date.parse(reminder.due) > LATE_MS;
  const when = late ? (es ? ` (con retraso: era para ${shortInstant(new Date(reminder.due), config.timezone, config.locale, now)})` : ` (late: it was due ${shortInstant(new Date(reminder.due), config.timezone, config.locale, now)})`) : '';
  const every = reminder.recurrence ? ` · ${describeRecurrence(reminder.recurrence, es ? 'es' : 'en')}` : '';
  return {
    title: 'HELEN',
    text: `${es ? 'Recordatorio' : 'Reminder'}: ${reminder.text}${when}${every}`,
    sensitive: reminder.sensitive,
    kind: 'reminder',
    lang: es ? 'es' : 'en',
  };
}

interface SchedulerState {
  lastBriefing?: string;
}

function stateFile(home: string): string {
  return path.join(home, 'scheduler-state.json');
}

function readState(home: string): SchedulerState {
  try {
    return JSON.parse(fs.readFileSync(stateFile(home), 'utf8')) as SchedulerState;
  } catch {
    return {};
  }
}

/** Deliver what is due now. Safe to call often: it does nothing when nothing is due. */
export async function tick(home: string, options: TickOptions): Promise<TickResult> {
  const now = options.now ?? new Date();
  const config = options.config ?? readConfig(home);
  const result: TickResult = { delivered: [], failed: [] };

  for (const reminder of dueReminders(home, now)) {
    const results = await deliver(reminderNotification(reminder, config, now), options.channels);
    if (wasDelivered(results) || now.getTime() - Date.parse(reminder.due) > GIVE_UP_MS) {
      result.delivered.push({ reminder: markDelivered(home, reminder.id, config.timezone, now), results });
    } else {
      markDeliveryFailed(home, reminder.id);
      result.failed.push({ reminder, results });
    }
  }

  const briefingTime = config.briefing.time;
  if (briefingTime) {
    const today = localDateKey(now, config.timezone);
    const local = localParts(now, config.timezone);
    const [hour, minute] = briefingTime.split(':').map(Number) as [number, number];
    const due = local.hour > hour || (local.hour === hour && local.minute >= minute);
    if (due && readState(home).lastBriefing !== today) {
      const es = lang(config) === 'es';
      const agenda = formatAgenda(buildAgenda(home, 'today', { now, timezone: config.timezone }), { lang: es ? 'es' : 'en', locale: config.locale, timezone: config.timezone, showSensitive: false });
      const results = await deliver({ title: 'HELEN', text: `${es ? 'Buenos días' : 'Good morning'}, ${config.owner}.\n${agenda}`, sensitive: false, kind: 'briefing', lang: es ? 'es' : 'en' }, options.channels);
      if (wasDelivered(results)) withHomeLock(home, () => writePrivate(stateFile(home), `${JSON.stringify({ ...readState(home), lastBriefing: today })}\n`));
      result.briefing = results;
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
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Become the only scheduler of this home, or throw saying who is. A lease left by a process that died is taken over.
 * Returns the function that gives the lease back.
 */
export function acquireSchedulerLease(home: string): () => void {
  ensureHome(home);
  const file = path.join(home, 'scheduler.pid');
  const mine: Lease = { pid: process.pid, host: os.hostname(), started: new Date().toISOString() };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(file, JSON.stringify(mine), { flag: 'wx', mode: 0o600 });
      return () => {
        try {
          const current = JSON.parse(fs.readFileSync(file, 'utf8')) as Lease;
          if (current.pid === mine.pid && current.host === mine.host) fs.rmSync(file, { force: true });
        } catch {
          // Already gone.
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let holder: Lease | null = null;
      try {
        holder = JSON.parse(fs.readFileSync(file, 'utf8')) as Lease;
      } catch {
        holder = null;
      }
      if (holder && holder.host === os.hostname() && alive(holder.pid)) {
        throw new Error(`Another HELEN scheduler is already running (pid ${holder.pid}, since ${holder.started}). Stop it first, or run this server with --no-scheduler.`);
      }
      if (holder && holder.host !== os.hostname()) {
        throw new Error(`A HELEN scheduler on ${holder.host} holds this home (${file}). If it is gone, delete that file.`);
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
      for (const entry of result.delivered) log(`Reminder ${entry.reminder.id} delivered (${entry.results.filter(r => r.ok).map(r => r.channel).join(', ') || 'no channel'}).`);
      for (const entry of result.failed) log(`Reminder ${entry.reminder.id} not delivered yet: ${entry.results.map(r => `${r.channel}: ${r.error ?? 'ok'}`).join('; ')}`);
    } catch (error) {
      log(`Scheduler error: ${(error as Error).message}`);
    }
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, interval);
      options.signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
}
