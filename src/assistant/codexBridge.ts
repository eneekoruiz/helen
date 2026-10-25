import fs from "node:fs";
import path from "node:path";

export interface CodexSessionSummary {
  sessionId: string;
  updatedAt: string;
  lastGoal: string;
  source: string;
}

export function getAntigravityBrainDir(override?: string): string {
  if (override) return override;
  if (process.env.ANTIGRAVITY_BRAIN_DIR) return process.env.ANTIGRAVITY_BRAIN_DIR;
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return path.join(home, ".gemini", "antigravity", "brain");
}

export function listRecentCodexSessions(
  brainDir?: string,
  limit = 3,
): CodexSessionSummary[] {
  const root = getAntigravityBrainDir(brainDir);
  if (!fs.existsSync(root)) return [];

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const fullPath = path.join(root, e.name);
      try {
        const stat = fs.statSync(fullPath);
        return { name: e.name, fullPath, mtime: stat.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(
      (item): item is { name: string; fullPath: string; mtime: number } =>
        item !== null,
    )
    .sort((a, b) => b.mtime - a.mtime);

  const results: CodexSessionSummary[] = [];

  for (const dir of dirs) {
    if (results.length >= limit) break;

    // Check transcript locations
    const candidatePaths = [
      path.join(dir.fullPath, ".system_generated", "logs", "transcript.jsonl"),
      path.join(dir.fullPath, "transcript.jsonl"),
    ];

    let transcriptFile: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        transcriptFile = p;
        break;
      }
    }

    if (!transcriptFile) continue;

    try {
      const content = fs.readFileSync(transcriptFile, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) continue;

      let lastGoal = "";
      let updatedAt = new Date(dir.mtime).toISOString();

      // Read from end towards beginning to find the last user goal
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]!) as {
            source?: string;
            type?: string;
            content?: string;
            created_at?: string;
          };
          if (parsed.created_at && !lastGoal) updatedAt = parsed.created_at;

          if (
            parsed.type === "USER_INPUT" ||
            parsed.source === "USER_EXPLICIT" ||
            parsed.source === "USER_INPUT"
          ) {
            const raw = parsed.content ?? "";
            const match = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
            const goalText = match ? match[1]!.trim() : raw.trim();
            if (goalText) {
              // Clean out internal tags or metadata
              const cleanGoal = goalText
                .split("\n")[0]!
                .replace(/<[^>]+>/g, "")
                .trim()
                .slice(0, 140);
              if (cleanGoal) {
                lastGoal = cleanGoal;
                break;
              }
            }
          }
        } catch {
          // ignore malformed line
        }
      }

      if (lastGoal) {
        results.push({
          sessionId: dir.name,
          updatedAt,
          lastGoal,
          source: transcriptFile,
        });
      }
    } catch {
      // ignore read error
    }
  }

  return results;
}

export function summarizeCodexWork(options?: {
  brainDir?: string;
  lang?: "es" | "en";
  now?: Date;
}): { text: string; speech: string } {
  const lang = options?.lang ?? "es";
  const es = lang === "es";
  const now = options?.now ?? new Date();
  const sessions = listRecentCodexSessions(options?.brainDir, 3);

  if (sessions.length === 0) {
    return {
      text: es
        ? "No se han encontrado sesiones recientes de Codex o Antigravity."
        : "No recent Codex or Antigravity sessions found.",
      speech: es
        ? "No encontré sesiones recientes de programación en el sistema."
        : "I found no recent coding sessions in the system.",
    };
  }

  const latest = sessions[0]!;
  const diffMinutes = Math.max(
    0,
    Math.round(
      (now.getTime() - new Date(latest.updatedAt).getTime()) / 60_000,
    ),
  );

  const timeDesc =
    diffMinutes < 60
      ? es
        ? `hace ${diffMinutes} min`
        : `${diffMinutes}m ago`
      : diffMinutes < 1440
        ? es
          ? `hace ${Math.round(diffMinutes / 60)}h`
          : `${Math.round(diffMinutes / 60)}h ago`
        : es
          ? `hace ${Math.round(diffMinutes / 1440)}d`
          : `${Math.round(diffMinutes / 1440)}d ago`;

  const lines: string[] = [];
  lines.push(
    es
      ? `💻 *Última actividad en Antigravity / Codex (${timeDesc}):*`
      : `💻 *Recent activity in Antigravity / Codex (${timeDesc}):*`,
  );
  lines.push(`• *Objetivo activo:* "${latest.lastGoal}"`);
  lines.push(`• *Sesión:* \`${latest.sessionId.slice(0, 8)}...\``);

  if (sessions.length > 1) {
    lines.push(
      es ? "\n*Sesiones anteriores recientes:*" : "\n*Other recent sessions:*",
    );
    for (const s of sessions.slice(1)) {
      lines.push(`• "${s.lastGoal}" (\`${s.sessionId.slice(0, 8)}\`)`);
    }
  }

  const speech = es
    ? `En la última sesión de Codex estábamos con: "${latest.lastGoal}", ${timeDesc}.`
    : `In the latest Codex session we were working on: "${latest.lastGoal}", ${timeDesc}.`;

  return {
    text: lines.join("\n"),
    speech,
  };
}
