import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { redact } from "../core/secrets.js";

/**
 * Bridge to the ai-ecosystem queue (Orca). HELEN only READS the queue and quota files; every change goes
 * through `orca-queue.ps1` with validated arguments, so the engine keeps its own locking and rules.
 */

export type OrcaAgent = "claude" | "codex" | "agy";
export interface OrcaTask {
  id: string;
  status: string;
  agent: string;
  goal: string;
  targetIso?: string;
  scheduledTime?: string;
  waitingReason?: string;
  conversationId?: string;
}
export interface OrcaReset {
  platform: string;
  title: string;
  at: Date;
}
export interface OrcaState {
  tasks: OrcaTask[];
  resets: OrcaReset[];
  warnings: string[];
}
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}
export type OrcaExec = (file: string, args: string[]) => Promise<ExecResult>;

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TASK_ID = /^task-[0-9a-f]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WAITING = ["PENDING", "WAITING_AUTH", "WAITING_QUOTA", "WAITING_RUNTIME"];
const RUNNING = ["DISPATCHING", "DISPATCHED"];
const CANCELLABLE = [...WAITING, "FAILED"];
const LABEL: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  agy: "Antigravity",
};
const STATUS_ES: Record<string, string> = {
  PENDING: "pendiente",
  WAITING_AUTH: "espera inicio de sesión",
  WAITING_QUOTA: "espera cuota",
  WAITING_RUNTIME: "espera a Orca",
  DISPATCHING: "arrancando",
  DISPATCHED: "en curso",
  FAILED: "falló",
};
const STATUS_EN: Record<string, string> = {
  PENDING: "pending",
  WAITING_AUTH: "waiting for sign-in",
  WAITING_QUOTA: "waiting for quota",
  WAITING_RUNTIME: "waiting for Orca",
  DISPATCHING: "starting",
  DISPATCHED: "running",
  FAILED: "failed",
};

/** A regular file inside `dir`, not a link, small enough to read. */
function readJsonFile(dir: string, name: string): unknown | undefined {
  const file = path.join(dir, name);
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return undefined;
    // Windows PowerShell writes a BOM; JSON.parse rejects it.
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

export function readOrcaState(dir: string): OrcaState {
  const warnings: string[] = [];
  const tasks: OrcaTask[] = [];
  const resets: OrcaReset[] = [];
  const queue = readJsonFile(dir, "orca_nightly_queue.json") as
    { tasks?: unknown } | undefined;
  if (!queue || !Array.isArray(queue.tasks)) warnings.push("queue");
  else
    for (const raw of queue.tasks as Array<Record<string, unknown>>) {
      const id = str(raw?.id);
      const status = str(raw?.status);
      if (!id || !TASK_ID.test(id) || !status) continue;
      tasks.push({
        id,
        status,
        agent: str(raw.agent) ?? "claude",
        goal: str(raw.goal) ?? "",
        targetIso: str(raw.targetIso),
        scheduledTime: str(raw.scheduledTime),
        waitingReason: str(raw.waitingReason),
        conversationId: str(raw.conversationId),
      });
    }
  const quota = readJsonFile(dir, "quota_resets.json");
  if (!Array.isArray(quota)) warnings.push("quota");
  else
    for (const raw of quota as Array<Record<string, unknown>>) {
      const iso = str(raw?.resetIso);
      const at = iso ? new Date(iso) : undefined;
      if (!at || Number.isNaN(at.getTime())) continue;
      resets.push({
        platform: (str(raw.platform) ?? "").toLowerCase(),
        title: str(raw.title) ?? "",
        at,
      });
    }
  return { tasks, resets, warnings };
}

function when(date: Date, now: Date, timezone: string, locale: string): string {
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  const days = Math.round(
    (Date.parse(day(date)) - Date.parse(day(now))) / 86_400_000,
  );
  const es = locale.startsWith("es");
  if (days === 0) return `${es ? "hoy" : "today"} ${time}`;
  if (days === 1) return `${es ? "mañana" : "tomorrow"} ${time}`;
  const label = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return `${label} ${time}`;
}

const shortId = (id: string): string => id.slice(5, 13);
const clip = (text: string, max: number): string => {
  const one = redact(text).replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

export interface SummaryOptions {
  dir: string;
  lang: "es" | "en";
  now: Date;
  timezone: string;
  locale: string;
  /** The owner's verified channel. Without it nothing is read. */
  owner: boolean;
  /** Goals may be sensitive: shown only on channels allowed to show private text. */
  showGoals: boolean;
  provider?: string;
}

/** One answer to "what is pending, on which provider, and when does quota return". */
export function summarizeOrcaWork(options: SummaryOptions): {
  text: string;
  speech: string;
} {
  const es = options.lang === "es";
  if (!options.owner) {
    const text = es
      ? "Consulta la cola de automatizaciones desde el canal verificado del propietario."
      : "View the automation queue from the owner's verified channel.";
    return { text, speech: text };
  }
  const state = readOrcaState(options.dir);
  if (state.warnings.includes("queue")) {
    const text = es
      ? "No puedo leer la cola de Orca. Revisa la ruta en automation.ecosystemDir."
      : "I cannot read the Orca queue. Check automation.ecosystemDir.";
    return { text, speech: text };
  }
  const wanted = options.provider
    ? options.provider === "antigravity"
      ? "agy"
      : options.provider
    : undefined;
  const mine = state.tasks.filter((t) => !wanted || t.agent === wanted);
  const open = mine.filter((t) => [...WAITING, ...RUNNING].includes(t.status));
  const failed = mine.filter((t) => t.status === "FAILED");
  const statusText = es ? STATUS_ES : STATUS_EN;
  const lines: string[] = [];
  lines.push(
    es
      ? `Automatizaciones: ${open.length} abiertas${failed.length ? `, ${failed.length} fallidas` : ""}.`
      : `Automations: ${open.length} open${failed.length ? `, ${failed.length} failed` : ""}.`,
  );
  const providers = [...new Set([...open, ...failed].map((t) => t.agent))];
  for (const agent of providers) {
    lines.push("", LABEL[agent] ?? clip(agent, 20));
    const rows = [...open, ...failed]
      .filter((t) => t.agent === agent)
      .sort((a, b) => (a.targetIso ?? "").localeCompare(b.targetIso ?? ""));
    for (const task of rows) {
      const target = task.targetIso ? new Date(task.targetIso) : undefined;
      const at =
        target && !Number.isNaN(target.getTime())
          ? when(target, options.now, options.timezone, options.locale)
          : (task.scheduledTime ?? "—");
      const goal = options.showGoals ? ` — ${clip(task.goal, 70)}` : "";
      const reason =
        options.showGoals && task.waitingReason
          ? ` (${clip(task.waitingReason, 50)})`
          : "";
      lines.push(
        `• ${at} · ${statusText[task.status] ?? task.status}${goal}${reason} [${shortId(task.id)}]`,
      );
    }
  }
  const upcoming = state.resets
    .filter((r) => r.at.getTime() > options.now.getTime())
    .filter((r) => !wanted || r.platform === wanted)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (upcoming.length) {
    lines.push("", es ? "Cuota:" : "Quota:");
    for (const reset of upcoming.slice(0, 5)) {
      const name = LABEL[reset.platform] ?? (clip(reset.platform, 20) || "?");
      lines.push(
        es
          ? `• ${name} vuelve ${when(reset.at, options.now, options.timezone, options.locale)}`
          : `• ${name} returns ${when(reset.at, options.now, options.timezone, options.locale)}`,
      );
    }
  }
  if (open.length + failed.length === 0 && !upcoming.length)
    lines.push(es ? "No hay nada pendiente." : "Nothing pending.");
  const speech = es
    ? `Hay ${open.length} automatizaciones abiertas.`
    : `${open.length} automations are open.`;
  return { text: lines.join("\n"), speech };
}

export const defaultOrcaExec: OrcaExec = (file, args) =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        windowsHide: true,
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
        shell: false,
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? ((error as { code: number }).code as number)
            : error
              ? 1
              : 0;
        resolve({ code, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });

function engine(dir: string): { shell: string; script: string } | undefined {
  const script = path.join(dir, "orca-queue.ps1");
  try {
    if (!fs.lstatSync(script).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return {
    shell: process.platform === "win32" ? "powershell.exe" : "pwsh",
    script,
  };
}
const BASE = [
  "-NoProfile",
  "-NonInteractive",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
];

/** Resolve an id or the 6+ hex characters Helen shows to exactly one cancellable task. */
export function resolveTaskId(
  dir: string,
  input: string,
): { id: string } | { error: "not_found" | "ambiguous" | "invalid" } {
  const hex = input.toLowerCase().replace(/^task-/, "");
  if (!/^[0-9a-f]{6,32}$/.test(hex)) return { error: "invalid" };
  const matches = readOrcaState(dir).tasks.filter(
    (t) => CANCELLABLE.includes(t.status) && t.id.slice(5).startsWith(hex),
  );
  if (matches.length === 0) return { error: "not_found" };
  if (matches.length > 1) return { error: "ambiguous" };
  return { id: matches[0].id };
}

export type OrcaOutcome =
  { ok: true; message: string } | { ok: false; reason: string };

export async function cancelOrcaTask(
  dir: string,
  id: string,
  exec: OrcaExec = defaultOrcaExec,
): Promise<OrcaOutcome> {
  if (!TASK_ID.test(id)) return { ok: false, reason: "invalid" };
  const tool = engine(dir);
  if (!tool) return { ok: false, reason: "engine" };
  const run = await exec(tool.shell, [
    ...BASE,
    tool.script,
    "-Cancel",
    id,
    "-Json",
  ]);
  if (run.code === 0) return { ok: true, message: "cancelled" };
  if (run.code === 3) return { ok: false, reason: "not_found" };
  if (run.code === 4) return { ok: false, reason: "not_cancellable" };
  return { ok: false, reason: "failed" };
}

export interface QueueRequest {
  agent: "claude" | "codex";
  due: Date;
  goal: string;
  projectPath: string;
  conversationId?: string;
}
export const MAX_QUEUE_HOURS = 24;

/** The goal travels as one argument, never through a shell; still, it may not look like a switch. */
export function validateQueueRequest(
  request: QueueRequest,
  now: Date,
): string | undefined {
  const goal = request.goal.trim();
  if (goal.length < 3 || goal.length > 500) return "goal_length";
  if (/^[-/]/.test(goal) || [...goal].some((ch) => ch.charCodeAt(0) < 32))
    return "goal_chars";
  if (request.agent !== "claude" && request.agent !== "codex") return "agent";
  if (request.conversationId && !UUID.test(request.conversationId))
    return "conversation";
  const ms = request.due.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return "past";
  if (ms > MAX_QUEUE_HOURS * 3_600_000) return "too_far";
  if (
    !path.isAbsolute(request.projectPath) &&
    !/^[A-Za-z]:[\\/]/.test(request.projectPath)
  )
    return "project";
  return undefined;
}

export async function queueOrcaTask(
  dir: string,
  request: QueueRequest,
  now: Date,
  exec: OrcaExec = defaultOrcaExec,
): Promise<OrcaOutcome> {
  const invalid = validateQueueRequest(request, now);
  if (invalid) return { ok: false, reason: invalid };
  const tool = engine(dir);
  if (!tool) return { ok: false, reason: "engine" };
  const minutes = Math.max(
    1,
    Math.ceil((request.due.getTime() - now.getTime()) / 60_000),
  );
  const args = [
    ...BASE,
    tool.script,
    "-Goal",
    request.goal.trim(),
    "-Agent",
    request.agent,
    "-ProjectPath",
    request.projectPath,
    "-In",
    `${minutes}m`,
    "-ExecutionBackend",
    "provider-cli",
  ];
  if (request.conversationId)
    args.push("-ConversationId", request.conversationId);
  const run = await exec(tool.shell, args);
  return run.code === 0
    ? { ok: true, message: "queued" }
    : { ok: false, reason: "failed" };
}
