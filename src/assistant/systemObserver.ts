import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { isSafeProjectPath } from "../core/fs.js";
import { findSecrets, looksSensitive } from "../core/secrets.js";
import { readConfig, type ChannelName } from "./home.js";

type Actor = {
  owner: string;
  verified: boolean;
  private: boolean;
  channel: ChannelName;
};
function settings(
  home: string,
  actor: Actor,
  permission: "system:read" | "automation:queue",
) {
  const config = readConfig(home);
  if (
    !actor.verified ||
    !actor.private ||
    actor.owner !== config.owner ||
    !config.observer?.allowedChannels.includes(actor.channel) ||
    !config.observer.permissions.includes(permission)
  )
    throw new Error(
      "Observer requires the private verified owner and the local operation permission.",
    );
  const project = fs.realpathSync(config.observer.projectRoot);
  const normalize = (value: string) =>
    os.platform() === "win32" ? value.toLowerCase() : value;
  if (
    [
      path.parse(project).root,
      fs.realpathSync(os.homedir()),
      fs.realpathSync(home),
    ]
      .map(normalize)
      .includes(normalize(project)) ||
    !fs.statSync(project).isDirectory()
  )
    throw new Error(
      "Choose an existing project directory, not a home or filesystem root.",
    );
  return config.observer;
}
const queuePath = (root: string) =>
  path.join(root, "ai-ecosystem", "orca_nightly_queue.json");
function queue(root: string): {
  exists: boolean;
  tasks: Array<Record<string, unknown>>;
} {
  const file = queuePath(root);
  if (!isSafeProjectPath(root, file))
    throw new Error("Unsafe Observer queue path.");
  let fd: number;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { exists: false, tasks: [] };
    throw error;
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024)
      throw new Error("Observer queue is not a bounded regular file.");
    const buffer = Buffer.alloc(2 * 1024 * 1024 + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(fd, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > 2 * 1024 * 1024)
      throw new Error("Observer queue exceeds its read limit.");
    return {
      exists: true,
      tasks: z
        .object({
          tasks: z.array(z.record(z.string(), z.unknown())).max(10000),
        })
        .parse(
          JSON.parse(
            buffer
              .subarray(0, size)
              .toString("utf8")
              .replace(/^\uFEFF/, ""),
          ),
        ).tasks,
    };
  } finally {
    fs.closeSync(fd);
  }
}
const iso = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : undefined;

/** Snapshot only: never runs -List, which reconciles receipts and writes the queue. */
export function readSystemObserver(home: string, actor: Actor) {
  const config = settings(home, actor, "system:read");
  const snapshot = queue(config.profileRoot);
  const counts: Record<string, number> = {};
  const statuses = [
    "PENDING",
    "DISPATCHING",
    "DISPATCHED",
    "COMPLETED",
    "FAILED",
    "SUBMITTED_UNCONFIRMED",
  ];
  for (const task of snapshot.tasks) {
    const status = statuses.includes(String(task.status))
      ? String(task.status)
      : "UNKNOWN";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  const queued = snapshot.tasks
    .map((task) => iso(task.queuedAt))
    .filter((date): date is string => Boolean(date))
    .sort();
  const due = snapshot.tasks
    .filter((task) => task.status === "PENDING")
    .map((task) => iso(task.targetIso))
    .filter((date): date is string => Boolean(date))
    .sort();
  const script = path.join(config.profileRoot, "system-observer.ps1");
  return {
    queueExists: snapshot.exists,
    total: snapshot.tasks.length,
    counts,
    lastQueuedAt: queued.at(-1) ?? null,
    nextTargetAt: due[0] ?? null,
    observerAvailable:
      isSafeProjectPath(config.profileRoot, script) && fs.existsSync(script),
    verification: "recorded-state-only; no provider or execution verification",
  };
}

export const ObserverRequestSchema = z
  .object({
    goal: z
      .string()
      .trim()
      .min(1)
      .max(3000)
      .refine(
        (value) =>
          !/^[-@]/.test(value) &&
          !findSecrets(value).length &&
          !looksSensitive(value) &&
          !/\b\d+(?:[.,]\d{1,2})?\s*(?:euros?|d[oó]lares?|USD|EUR)\b|[€$]\s*\d|\d\s*[€$]|\.xlsx\b|\b(?:abrir|leer|enviar|open|read|send)\b.{0,50}\b(?:libro|extracto|datos bancarios|bank statement|workbook)\b/i.test(
            value,
          ),
        "Do not embed routing overrides, credentials or personal financial data in goals",
      ),
    in: z
      .string()
      .regex(/^[1-9]\d{0,3}[mh]$/)
      .refine(
        (value) =>
          Number(value.slice(0, -1)) * (value.endsWith("h") ? 60 : 1) <= 10080,
        "Choose a delay of at most seven days",
      ),
    agent: z.enum(["codex", "claude", "orca", "antigravity"]).optional(),
  })
  .strict();

/** Explicit approved request only; the existing Observer owns scheduling and provider execution. */
export async function requestSystemObserver(
  home: string,
  actor: Actor,
  raw: unknown,
  dryRun: boolean,
  signal?: AbortSignal,
) {
  const config = settings(
    home,
    actor,
    dryRun ? "system:read" : "automation:queue",
  );
  const input = ObserverRequestSchema.parse(raw);
  signal?.throwIfAborted();
  if (os.platform() !== "win32")
    throw new Error("Observer execution requires Windows.");
  const script = path.join(config.profileRoot, "system-observer.ps1");
  if (
    !isSafeProjectPath(config.profileRoot, script) ||
    !fs.statSync(script).isFile()
  )
    throw new Error("Observer script unavailable.");
  const before = queue(config.profileRoot);
  const oldIds = new Set(before.tasks.map((task) => task.id));
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-WindowStyle",
    "Hidden",
    "-File",
    script,
    "-Goal",
    input.goal,
    "-ProjectPath",
    config.projectRoot,
    "-Agent",
    input.agent || config.agent,
    "-In",
    input.in,
    "-NoNotification",
    ...(dryRun ? ["-DryRun"] : []),
  ];
  const command = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const result = await new Promise<{ ok: boolean; stdout: string }>(
    (resolve) => {
      execFile(
        command,
        args,
        {
          windowsHide: true,
          timeout: 15000,
          maxBuffer: 65536,
          encoding: "utf8",
          signal,
          env: {
            ...process.env,
            ORCA_QUEUE_PATH: queuePath(config.profileRoot),
          },
        },
        (error, stdout) => resolve({ ok: !error, stdout }),
      );
    },
  );
  if (!result.ok)
    return {
      status: "unconfirmed",
      mayHaveQueued: !dryRun,
      retry: "Inspect the queue before approving another request.",
    };
  if (dryRun) {
    const preview = z
      .object({
        scheduled: z.literal(false),
        targetIso: z.string().datetime({ offset: true }),
      })
      .parse(JSON.parse(result.stdout));
    return {
      status: "preview",
      scheduled: false,
      targetAt: preview.targetIso,
      agent: config.agent,
    };
  }
  const added = queue(config.profileRoot).tasks.filter(
    (task) =>
      !oldIds.has(task.id) &&
      task.goal === input.goal &&
      typeof task.projectPath === "string" &&
      path.resolve(task.projectPath).toLowerCase() ===
        path.resolve(config.projectRoot).toLowerCase() &&
      task.agent === config.agent &&
      task.status === "PENDING" &&
      typeof task.id === "string" &&
      /^task-[a-f0-9]{32}$/.test(task.id),
  );
  if (added.length !== 1)
    return {
      status: "unconfirmed",
      mayHaveQueued: true,
      retry: "Inspect the queue before approving another request.",
    };
  return {
    status: "queued",
    id: added[0]!.id,
    targetAt: iso(added[0]!.targetIso) ?? null,
    execution: "not-verified",
    windowsSchedule: "not-verified",
  };
}
