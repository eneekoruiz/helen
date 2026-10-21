import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateAgentName, validateItemId } from "./claims.js";
import { appendEvent, appendJsonLine, cleanText } from "./events.js";
import { withLockSync } from "./fileLock.js";
import { isSafeProjectPath } from "./fs.js";

/**
 * Handoffs: structured messages between agents or roles.
 *
 * They live in their own file (.helen/handoffs.jsonl), not in the event log: the event log rotates,
 * and a rotation must never empty somebody's inbox. Unread handoffs survive compaction; the event log
 * only keeps a short audit record (who wrote to whom, who read it).
 */
export type HandoffRole =
  "planner" | "researcher" | "implementer" | "reviewer" | "verifier";

export interface Handoff {
  id: string;
  ts: string;
  from: string;
  /** An agent name or `role:<role>`. */
  to: string;
  item?: string;
  message: string;
  files: string[];
  next?: string;
  acked: boolean;
  ackedBy?: string;
  ackedAt?: string;
}

interface HandoffLine {
  kind: "handoff";
  id: string;
  ts: string;
  from: string;
  to: string;
  item?: string;
  message: string;
  files: string[];
  next?: string;
}

interface AckLine {
  kind: "ack";
  handoff: string;
  agent: string;
  ts: string;
}

const ROLE_RECIPIENT =
  /^role:(?:planner|researcher|implementer|reviewer|verifier)$/;
const AGENT_RECIPIENT = /^(?!role:)[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const MAX_FILE_BYTES = 1024 * 1024;
/** Read handoffs kept after a compaction, so recent context stays visible with --all. */
const KEEP_ACKED = 200;

export function handoffsFile(cwd: string): string {
  return path.join(cwd, ".helen", "handoffs.jsonl");
}

function safeFile(cwd: string): string {
  const file = handoffsFile(cwd);
  if (!isSafeProjectPath(cwd, file))
    throw new Error(
      "Handoffs must stay inside the project directory (no symbolic links in .helen).",
    );
  return file;
}

function withHandoffLock<T>(cwd: string, action: () => T): T {
  return withLockSync(path.join(cwd, ".helen", "handoffs.lock"), action);
}

function readLines(cwd: string): Array<HandoffLine | AckLine> {
  const file = safeFile(cwd);
  if (!fs.existsSync(file)) return [];
  const lines: Array<HandoffLine | AckLine> = [];
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    if (!raw.trim()) continue;
    try {
      const value = JSON.parse(raw) as HandoffLine | AckLine;
      if (
        value?.kind === "handoff" &&
        typeof value.id === "string" &&
        typeof value.to === "string" &&
        typeof value.message === "string"
      )
        lines.push(value);
      else if (
        value?.kind === "ack" &&
        typeof value.handoff === "string" &&
        typeof value.agent === "string"
      )
        lines.push(value);
    } catch {
      // A torn line must not hide every other handoff.
    }
  }
  return lines;
}

function materialize(lines: Array<HandoffLine | AckLine>): Handoff[] {
  const acks = new Map<string, AckLine>();
  for (const line of lines)
    if (line.kind === "ack" && !acks.has(line.handoff))
      acks.set(line.handoff, line);
  return lines
    .filter((line): line is HandoffLine => line.kind === "handoff")
    .map((line) => ({
      id: line.id,
      ts: line.ts,
      from: line.from,
      to: line.to,
      ...(line.item ? { item: line.item } : {}),
      message: line.message,
      files: Array.isArray(line.files)
        ? line.files.filter((file) => typeof file === "string")
        : [],
      ...(typeof line.next === "string" ? { next: line.next } : {}),
      acked: acks.has(line.id),
      ...(acks.has(line.id)
        ? { ackedBy: acks.get(line.id)!.agent, ackedAt: acks.get(line.id)!.ts }
        : {}),
    }));
}

/** Keep every unread handoff and the most recent read ones; called under the lock when the file grows large. */
function compact(cwd: string): void {
  const file = safeFile(cwd);
  const handoffs = materialize(readLines(cwd));
  const unread = handoffs.filter((handoff) => !handoff.acked);
  const read = handoffs.filter((handoff) => handoff.acked).slice(-KEEP_ACKED);
  const keep = new Set([...unread, ...read].map((handoff) => handoff.id));
  const lines: Array<HandoffLine | AckLine> = [];
  for (const handoff of handoffs) {
    if (!keep.has(handoff.id)) continue;
    const { acked, ackedBy, ackedAt, ...rest } = handoff;
    lines.push({ kind: "handoff", ...rest });
    if (acked)
      lines.push({
        kind: "ack",
        handoff: handoff.id,
        agent: ackedBy ?? "unknown",
        ts: ackedAt ?? handoff.ts,
      });
  }
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(
    temporary,
    lines.map((line) => JSON.stringify(line)).join("\n") +
      (lines.length ? "\n" : ""),
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

function append(cwd: string, line: HandoffLine | AckLine): void {
  const file = safeFile(cwd);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendJsonLine(file, line);
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) compact(cwd);
  } catch {
    // Compaction is housekeeping; the handoff itself is already stored.
  }
}

export function isValidRecipient(to: string): boolean {
  return ROLE_RECIPIENT.test(to) || AGENT_RECIPIENT.test(to);
}

export function createHandoff(
  cwd: string,
  input: {
    from: string;
    to: string;
    item?: string;
    message: string;
    files?: string[];
    next?: string;
  },
): Handoff {
  validateAgentName(input.from);
  if (!isValidRecipient(input.to))
    throw new Error(
      `Invalid recipient "${input.to}": use an agent name or role:<planner|researcher|implementer|reviewer|verifier>.`,
    );
  const message = cleanText(input.message.trim(), 8000);
  if (!message) throw new Error("A handoff needs a message.");
  if (input.item) validateItemId(input.item);
  const files = (input.files ?? [])
    .slice(0, 50)
    .map((file) => cleanText(file, 500).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const next = input.next ? cleanText(input.next, 1000).trim() : "";
  const line: HandoffLine = {
    kind: "handoff",
    id: `h-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    ts: new Date().toISOString(),
    from: input.from,
    to: input.to,
    ...(input.item ? { item: input.item } : {}),
    message,
    files,
    ...(next ? { next } : {}),
  };
  withHandoffLock(cwd, () => append(cwd, line));
  appendEvent(cwd, {
    type: "handoff.created",
    agent: input.from,
    ...(input.item ? { item: input.item } : {}),
    data: { id: line.id, to: input.to },
  });
  const { kind: _kind, ...handoff } = line;
  return { ...handoff, acked: false };
}

function addressedTo(
  handoff: Pick<Handoff, "to">,
  recipient: { agent: string; role?: HandoffRole },
): boolean {
  return (
    handoff.to === recipient.agent ||
    (recipient.role !== undefined && handoff.to === `role:${recipient.role}`)
  );
}

export function readInbox(
  cwd: string,
  recipient: { agent: string; role?: HandoffRole },
  includeAcked = false,
): Handoff[] {
  validateAgentName(recipient.agent);
  return materialize(readLines(cwd)).filter(
    (handoff) =>
      addressedTo(handoff, recipient) && (includeAcked || !handoff.acked),
  );
}

/** Mark a handoff read. Only its recipient may: the agent it names, or an agent working in the role it names. */
export function ackHandoff(
  cwd: string,
  handoffId: string,
  agent: string,
  role?: HandoffRole,
): Handoff {
  validateAgentName(agent);
  return withHandoffLock(cwd, () => {
    const handoff = materialize(readLines(cwd)).find(
      (candidate) => candidate.id === handoffId,
    );
    if (!handoff) throw new Error(`Unknown handoff "${handoffId}".`);
    if (!addressedTo(handoff, { agent, role })) {
      throw new Error(
        `Handoff ${handoffId} is addressed to ${handoff.to}, not to ${agent}${role ? ` (role ${role})` : ""}.`,
      );
    }
    if (handoff.acked) return handoff;
    const ts = new Date().toISOString();
    append(cwd, { kind: "ack", handoff: handoffId, agent, ts });
    appendEvent(cwd, { type: "handoff.acked", agent, data: { id: handoffId } });
    return { ...handoff, acked: true, ackedBy: agent, ackedAt: ts };
  });
}
