import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { clearActions } from "./actions.js";
import { CalendarImportLinkSchema } from "./calendar.js";
import { clearConversations } from "./conversation.js";
import {
  AssistantConfigSchema,
  ensureHome,
  readConfig,
  withHomeLock,
  writePrivate,
} from "./home.js";
import { exportMemory, MEMORY_KINDS } from "./memory.js";
import { ReminderSchema } from "./reminders.js";
import {
  acquireSchedulerLease,
  DeliverySchema,
  type DeliveryStatus,
} from "./scheduler.js";
import { TaskSchema } from "./tasks.js";
import { WorkflowSchema } from "./workflows.js";
import { AppModeStateSchema } from "./appMode.js";

const MemorySchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{2,60}$/),
    kind: z.enum(MEMORY_KINDS),
    title: z
      .string()
      .min(1)
      .max(500)
      .regex(/^[^\r\n]+$/),
    body: z.string().max(512 * 1024),
    tags: z.array(z.string().regex(/^[a-z0-9-]{1,30}$/)).max(100),
    visibility: z.enum(["private", "agents"]),
    sensitive: z.boolean(),
    source: z.string().regex(/^[a-z0-9_-]{1,30}$/i),
    created: z.string().datetime(),
    updated: z.string().datetime(),
    expires: z.string().datetime().optional(),
    project: z
      .string()
      .max(500)
      .regex(/^[^\r\n]+$/)
      .optional(),
  })
  .strict();

const BackupSchema = z
  .object({
    version: z.literal(1),
    created: z.string().datetime(),
    config: AssistantConfigSchema,
    memory: z.array(MemorySchema).max(10000),
    tasks: z.array(TaskSchema).max(100000),
    reminders: z.array(ReminderSchema).max(100000),
    calendarImports: z.array(CalendarImportLinkSchema).max(100000).default([]),
    deliveries: z.array(DeliverySchema).max(100000).default([]),
    workflows: z.array(WorkflowSchema).max(10000).default([]),
    appMode: z.array(AppModeStateSchema).max(1).default([]),
  })
  .strict();
type Backup = z.infer<typeof BackupSchema>;

const RESTORE_MARKER = ".restore-transaction.json";
const RESTORE_NAMES = [
  "config.json",
  "tasks.json",
  "reminders.json",
  "memory",
  "calendar-imports.json",
  "deliveries.json",
  "workflows.json",
  "app-mode.json",
] as const;
const TransactionSchema = z
  .object({
    version: z.literal(1),
    stage: z.string().regex(/^\.restore-[0-9a-f-]{36}$/),
    previous: z.string().regex(/^restore-previous-[0-9a-f-]{36}$/),
    originals: z.array(z.enum(RESTORE_NAMES)).max(RESTORE_NAMES.length),
  })
  .strict();

function recoverLocked(home: string): boolean {
  const marker = safePath(path.join(home, RESTORE_MARKER));
  if (!fs.existsSync(marker)) return false;
  const transaction = TransactionSchema.parse(
    JSON.parse(fs.readFileSync(marker, "utf8")),
  );
  const stage = safePath(path.join(home, transaction.stage));
  const previous = safePath(path.join(home, transaction.previous));
  if (!fs.statSync(stage).isDirectory() || !fs.statSync(previous).isDirectory())
    throw new Error("Restore recovery directories missing");
  // Validate the complete transaction before changing any file; never follow paths supplied by a snapshot.
  for (const name of RESTORE_NAMES) {
    const current = safePath(path.join(home, name));
    const staged = safePath(path.join(stage, name));
    const original = safePath(path.join(previous, name));
    if (
      fs.existsSync(original) &&
      fs.existsSync(staged) &&
      fs.existsSync(current)
    )
      throw new Error(
        "Ambiguous interrupted restore; retain all copies and inspect manually",
      );
    if (
      transaction.originals.includes(name) &&
      !fs.existsSync(original) &&
      !fs.existsSync(current)
    )
      throw new Error(
        "Original restore data missing; inspect recovery directories",
      );
  }
  for (const name of [...RESTORE_NAMES].reverse()) {
    const current = path.join(home, name);
    const staged = path.join(stage, name);
    const original = path.join(previous, name);
    if (fs.existsSync(original)) {
      if (fs.existsSync(current)) fs.renameSync(current, staged);
      fs.renameSync(original, current);
    } else if (
      !transaction.originals.includes(name) &&
      fs.existsSync(current) &&
      !fs.existsSync(staged)
    )
      fs.renameSync(current, staged);
  }
  fs.unlinkSync(marker);
  clearConversations(home);
  clearActions(home);
  return true;
}

/** Resume rollback after process death; staged replacement files are retained for inspection. */
export function recoverInterruptedRestore(home: string): boolean {
  safePath(home);
  if (!fs.existsSync(path.join(home, RESTORE_MARKER))) return false;
  const release = acquireSchedulerLease(home);
  try {
    return withHomeLock(home, () => recoverLocked(home), {
      allowRestore: true,
    });
  } finally {
    release();
  }
}

function mergeDeliveries(
  saved: DeliveryStatus[],
  current: DeliveryStatus[],
): DeliveryStatus[] {
  const merged = new Map<string, DeliveryStatus>();
  const priority = { failed: 0, inflight: 1, uncertain: 1, sent: 2 };
  for (const item of [...saved, ...current]) {
    const existing = merged.get(item.key);
    if (
      !existing ||
      priority[item.state] > priority[existing.state] ||
      (priority[item.state] === priority[existing.state] &&
        item.updated > existing.updated)
    )
      merged.set(item.key, item);
  }
  return [...merged.values()];
}

function safePath(file: string): string {
  const resolved = path.resolve(file);
  for (let cursor = resolved; ; cursor = path.dirname(cursor)) {
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink())
      throw new Error("Backup paths must not contain symlinks");
    if (path.dirname(cursor) === cursor) return resolved;
  }
}

function validate(raw: unknown): Backup {
  const backup = BackupSchema.parse(raw);
  for (const items of [
    backup.memory,
    backup.tasks,
    backup.reminders,
    backup.workflows,
  ]) {
    if (new Set(items.map((item) => item.id)).size !== items.length)
      throw new Error("Duplicate backup item ids");
  }
  for (const workflow of backup.workflows)
    if (
      new Set(workflow.items.map((item) => item.id)).size !==
      workflow.items.length
    )
      throw new Error("Duplicate workflow item ids");
  if (
    new Set(backup.deliveries.map((item) => item.key)).size !==
    backup.deliveries.length
  )
    throw new Error("Duplicate delivery keys in backup");
  if (
    backup.deliveries.some(
      (item) => item.key !== JSON.stringify([item.occurrence, item.channel]),
    )
  )
    throw new Error("Invalid delivery identity in backup");
  if (
    backup.config.channels.webhook ||
    backup.config.provider?.type === "command" ||
    backup.config.provider?.baseUrl ||
    backup.reminders.some((item) => item.alexaAlertToken) ||
    backup.calendarImports.some(
      (link) =>
        link.pending &&
        "alexaAlertToken" in link.pending &&
        link.pending.alexaAlertToken,
    ) ||
    findSecrets(JSON.stringify(backup)).length
  )
    throw new Error("Backup contains credentials or executable configuration");
  return backup;
}

function collection<T>(
  home: string,
  name: string,
  schema: z.ZodType<T, unknown>,
): T[] {
  const file = safePath(path.join(home, `${name}.json`));
  if (!fs.existsSync(file)) return [];
  return z
    .object({ version: z.literal(1), items: z.array(schema) })
    .strict()
    .parse(JSON.parse(fs.readFileSync(file, "utf8"))).items;
}

/** Credentials and ephemeral conversations/undo are deliberately excluded. */
export function createAssistantBackup(
  home: string,
  file: string,
  now = new Date(),
) {
  const target = safePath(file);
  safePath(home);
  if (fs.existsSync(target))
    throw new Error("Backup destination already exists");
  return withHomeLock(home, () => {
    safePath(path.join(home, "config.json"));
    safePath(path.join(home, "memory"));
    const config = readConfig(home);
    delete config.capture;
    delete config.gmail;
    delete config.gmailAuth;
    delete config.gmailRedirectUri;
    delete config.recordatorios;
    delete config.channels.webhook;
    if (config.provider?.type === "command") delete config.provider;
    else if (config.provider) delete config.provider.baseUrl;
    const safe = <T>(items: T[]) =>
      items.filter((item) => findSecrets(JSON.stringify(item)).length === 0);
    const tasks = collection(home, "tasks", TaskSchema);
    const reminders = collection(home, "reminders", ReminderSchema);
    const backup = validate({
      version: 1,
      created: now.toISOString(),
      config,
      memory: safe(exportMemory(home)),
      tasks: safe(tasks),
      workflows: safe(collection(home, "workflows", WorkflowSchema)),
      appMode: safe(collection(home, "app-mode", AppModeStateSchema)),
      reminders: safe(
        reminders.map(({ alexaAlertToken: _token, ...item }) => item),
      ),
      calendarImports: collection(
        home,
        "calendar-imports",
        CalendarImportLinkSchema,
      ),
      deliveries: collection(home, "deliveries", DeliverySchema).map(
        ({ error: _error, ...item }) => ({
          ...item,
          state: item.state === "inflight" ? "uncertain" : item.state,
        }),
      ),
    });
    const json = JSON.stringify(backup, null, 2) + "\n";
    if (Buffer.byteLength(json) > 32 * 1024 * 1024)
      throw new Error("Backup exceeds 32 MB");
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, json, { flag: "wx", mode: 0o600 });
    return {
      file: target,
      notes: backup.memory.length,
      tasks: backup.tasks.length,
      reminders: backup.reminders.length,
    };
  });
}

/**
 * A backup carries preferences and data, not trust. Who may reach the assistant (channels, allow-lists, privacy),
 * which program answers for it and the mail and reminder links stay as this installation has them, so a
 * tampered or borrowed backup cannot add a chat, widen privacy or swap the model command.
 */
function restoredConfig(home: string, fromBackup: Backup["config"]) {
  let local: Backup["config"] | undefined;
  try {
    local = readConfig(home);
  } catch {
    local = undefined;
  }
  const merged: Record<string, unknown> = { ...fromBackup };
  for (const key of [
    "channels",
    "alexa",
    "privacy",
    "server",
    "provider",
    "capture",
    "gmail",
    "gmailAuth",
    "gmailRedirectUri",
    "recordatorios",
  ]) {
    const kept = (local as Record<string, unknown> | undefined)?.[key];
    if (kept === undefined) delete merged[key];
    else merged[key] = kept;
  }
  // A first restore on a bare installation has no local channels: start from the safe defaults.
  if (merged.channels === undefined) merged.channels = {};
  return AssistantConfigSchema.parse(merged);
}

export function restoreAssistantBackup(
  home: string,
  file: string,
  now = new Date(),
) {
  const source = safePath(file);
  const stat = fs.statSync(source);
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024)
    throw new Error("Backup must be a JSON file smaller than 32 MB");
  const backup = validate(JSON.parse(fs.readFileSync(source, "utf8")));
  safePath(home);
  if (!fs.existsSync(path.join(home, RESTORE_MARKER))) ensureHome(home);
  const release = acquireSchedulerLease(home);
  try {
    return withHomeLock(
      home,
      () => {
        recoverLocked(home);
        const stage = path.join(home, `.restore-${crypto.randomUUID()}`);
        const previous = path.join(
          home,
          `restore-previous-${crypto.randomUUID()}`,
        );
        fs.mkdirSync(stage, { mode: 0o700 });
        fs.mkdirSync(previous, { mode: 0o700 });
        const restored = backup.reminders.map((item) => ({
          ...item,
          ...(item.status === "pending" && Date.parse(item.due) <= now.getTime()
            ? { status: "cancelled" as const, updated: now.toISOString() }
            : {}),
        }));
        const calendarImports = backup.calendarImports.map((link) => ({
          ...link,
          ...(link.pending &&
          "fired" in link.pending &&
          link.pending.status === "pending" &&
          Date.parse(link.pending.due) <= now.getTime()
            ? {
                pending: {
                  ...link.pending,
                  status: "cancelled" as const,
                  updated: now.toISOString(),
                },
              }
            : {}),
        }));
        writePrivate(
          path.join(stage, "config.json"),
          JSON.stringify(restoredConfig(home, backup.config)),
        );
        writePrivate(
          path.join(stage, "tasks.json"),
          JSON.stringify({ version: 1, items: backup.tasks }),
        );
        writePrivate(
          path.join(stage, "reminders.json"),
          JSON.stringify({ version: 1, items: restored }),
        );
        writePrivate(
          path.join(stage, "calendar-imports.json"),
          JSON.stringify({ version: 1, items: calendarImports }),
        );
        writePrivate(
          path.join(stage, "deliveries.json"),
          JSON.stringify({
            version: 1,
            items: mergeDeliveries(
              backup.deliveries,
              collection(home, "deliveries", DeliverySchema),
            ),
          }),
        );
        fs.mkdirSync(path.join(stage, "memory"), { mode: 0o700 });
        writePrivate(
          path.join(stage, "workflows.json"),
          JSON.stringify({ version: 1, items: backup.workflows }),
        );
        writePrivate(
          path.join(stage, "app-mode.json"),
          JSON.stringify({ version: 1, items: backup.appMode }),
        );
        for (const item of backup.memory) {
          const metadata = [
            "id",
            "kind",
            "visibility",
            "sensitive",
            "source",
            "created",
            "updated",
            "expires",
            "project",
          ] as const;
          const lines = metadata
            .filter((key) => item[key] !== undefined)
            .map((key) => `${key}: ${item[key]}`);
          writePrivate(
            path.join(stage, "memory", `${item.id}.md`),
            [
              "---",
              ...lines,
              `tags: [${item.tags.join(", ")}]`,
              "---",
              `# ${item.title}`,
              "",
              item.body,
              "",
            ].join("\n"),
          );
        }
        const names = RESTORE_NAMES;
        for (const name of names) safePath(path.join(home, name));
        const transaction = {
          version: 1,
          stage: path.basename(stage),
          previous: path.basename(previous),
          originals: names.filter((name) =>
            fs.existsSync(path.join(home, name)),
          ),
        };
        const marker = path.join(home, RESTORE_MARKER);
        const descriptor = fs.openSync(marker, "wx", 0o600);
        try {
          fs.writeFileSync(descriptor, JSON.stringify(transaction));
          fs.fsyncSync(descriptor);
        } finally {
          fs.closeSync(descriptor);
        }
        try {
          for (const name of names) {
            const current = path.join(home, name);
            if (fs.existsSync(current)) {
              if (fs.lstatSync(current).isSymbolicLink())
                throw new Error("Refusing restore over symlink");
              fs.renameSync(current, path.join(previous, name));
            }
            fs.renameSync(path.join(stage, name), current);
          }
        } catch (error) {
          recoverLocked(home);
          throw error;
        }
        fs.unlinkSync(marker);
        clearConversations(home);
        clearActions(home);
        fs.rmdirSync(stage);
        return {
          previous,
          restored: {
            notes: backup.memory.length,
            tasks: backup.tasks.length,
            reminders: restored.length,
          },
          cancelledPastReminders: restored.filter(
            (item, index) =>
              item.status === "cancelled" &&
              backup.reminders[index]!.status === "pending",
          ).length,
        };
      },
      { allowRestore: true },
    );
  } finally {
    release();
  }
}
