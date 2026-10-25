import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { redact } from "../core/secrets.js";

export interface CodexSessionSummary {
  sessionId: string;
  updatedAt: string;
  lastGoal: string;
  /** Relative evidence path, never the user's absolute home path. */
  source: string;
}
const MAX_ENTRIES = 1000;
const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024;
const TRANSCRIPTS = [
  ".system_generated/logs/transcript.jsonl",
  "transcript.jsonl",
];

export function getAntigravityBrainDir(override?: string): string {
  return path.resolve(
    override ||
      process.env.ANTIGRAVITY_BRAIN_DIR ||
      path.join(os.homedir(), ".gemini", "antigravity", "brain"),
  );
}
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`)
  );
}
function regularTranscript(
  root: string,
  candidate: string,
): fs.Stats | undefined {
  try {
    if (!inside(root, candidate)) return;
    let current = root;
    for (const part of path.relative(root, candidate).split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) return;
    }
    if (!inside(root, fs.realpathSync(candidate))) return;
    const stat = fs.lstatSync(candidate);
    return stat.isFile() ? stat : undefined;
  } catch {
    return;
  }
}

/** Bounded Antigravity JSONL tail scan; native Codex formats are unsupported. */
export function listRecentCodexSessions(
  brainDir?: string,
  limit = 3,
): CodexSessionSummary[] {
  if (!Number.isInteger(limit) || limit < 0 || limit > 20)
    throw new Error("Session limit must be an integer between 0 and 20.");
  if (!limit) return [];
  const requested = getAntigravityBrainDir(brainDir);
  let root: string;
  try {
    if (
      fs.lstatSync(requested).isSymbolicLink() ||
      !fs.statSync(requested).isDirectory()
    )
      return [];
    root = fs.realpathSync(requested);
  } catch {
    return [];
  }
  const candidates: Array<{ sessionId: string; file: string; stat: fs.Stats }> =
    [];
  let directory: fs.Dir;
  try {
    directory = fs.opendirSync(root);
  } catch {
    return [];
  }
  try {
    for (let count = 0; count < MAX_ENTRIES; count++) {
      const entry = directory.readSync();
      if (!entry) break;
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      for (const location of TRANSCRIPTS) {
        const file = path.join(root, entry.name, location);
        const stat = regularTranscript(root, file);
        if (stat) {
          candidates.push({ sessionId: entry.name, file, stat });
          break;
        }
      }
    }
  } finally {
    directory.closeSync();
  }
  candidates.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  const results: CodexSessionSummary[] = [];
  for (const candidate of candidates.slice(0, 20)) {
    if (results.length >= limit) break;
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(
        candidate.file,
        fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
      );
      const stat = fs.fstatSync(descriptor);
      const current = regularTranscript(root, candidate.file);
      if (
        !current ||
        !stat.isFile() ||
        stat.ino !== current.ino ||
        stat.dev !== current.dev
      )
        continue;
      const start = Math.max(0, stat.size - MAX_TRANSCRIPT_BYTES);
      const buffer = Buffer.alloc(Math.min(stat.size, MAX_TRANSCRIPT_BYTES));
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, start);
      let content = buffer.subarray(0, bytes).toString("utf8");
      if (start > 0) {
        const newline = content.indexOf("\n");
        content = newline < 0 ? "" : content.slice(newline + 1);
      }
      const lines = content.split("\n");
      for (let index = lines.length - 1; index >= 0; index--) {
        const line = lines[index]!;
        if (line.length > 65536) continue;
        try {
          const record = JSON.parse(line) as {
            type?: unknown;
            source?: unknown;
            content?: unknown;
          };
          if (
            !record ||
            typeof record.content !== "string" ||
            !(
              record.type === "USER_INPUT" ||
              record.source === "USER_EXPLICIT" ||
              record.source === "USER_INPUT"
            )
          )
            continue;
          const raw =
            /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(
              record.content,
            )?.[1] ?? record.content;
          const goal = redact(
            raw
              .trim()
              .split("\n")[0]!
              .replace(/<[^>]+>/g, "")
              .trim(),
          ).slice(0, 140);
          if (!goal) continue;
          results.push({
            sessionId: candidate.sessionId,
            updatedAt: stat.mtime.toISOString(),
            lastGoal: goal,
            source: path.relative(root, candidate.file),
          });
          break;
        } catch {
          /* Malformed records do not establish user goals. */
        }
      }
    } catch {
      /* Missing or concurrently replaced logs are not trustworthy evidence. */
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  }
  return results;
}

export function summarizeCodexWork(options?: {
  brainDir?: string;
  lang?: "es" | "en";
  now?: Date;
  authorized?: boolean;
}): { text: string; speech: string } {
  const es = options?.lang !== "en";
  const privateMessage = es
    ? "Consulta los registros de Antigravity desde un canal privado del propietario."
    : "View Antigravity logs on an authorized private owner channel.";
  if (!options?.authorized)
    return { text: privateMessage, speech: privateMessage };
  const sessions = listRecentCodexSessions(options.brainDir, 3);
  if (!sessions.length) {
    const text = es
      ? "No encontré objetivos de usuario en los registros locales compatibles de Antigravity."
      : "No user goals found in compatible local Antigravity logs.";
    return { text, speech: text };
  }
  const lines = [
    es
      ? "Objetivos encontrados en registros de Antigravity (lectura acotada; no acredita tareas terminadas ni pendientes):"
      : "Goals found in Antigravity logs (bounded scan; does not establish completed or pending work):",
  ];
  for (const session of sessions)
    lines.push(`${session.updatedAt} — ${session.lastGoal}`);
  return { text: lines.join("\n"), speech: privateMessage };
}
