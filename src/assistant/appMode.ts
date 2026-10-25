import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { readCollection, updateCollection } from "./store.js";
import { fold } from "./text.js";

export const AppModeSchema = z.enum(["normal", "examenes", "vacaciones"]);
export type AppMode = z.infer<typeof AppModeSchema>;
export const AppModeStateSchema = z
  .object({
    id: z.literal("current"),
    mode: AppModeSchema,
    updatedAt: z.string().datetime(),
    until: z.string().datetime().optional(),
    reason: z.string().trim().min(1).max(300).optional(),
  })
  .strict();
const NAME = "app-mode";

function loadMode(home: string) {
  const loaded = readCollection(home, NAME, AppModeStateSchema);
  if (loaded.invalid.length || loaded.items.length > 1)
    throw new Error(
      "Repair invalid or duplicate app-mode records before using seasonal mode.",
    );
  return loaded.items[0];
}

export function getAppModeState(home: string) {
  return (
    loadMode(home) ?? {
      id: "current" as const,
      mode: "normal" as AppMode,
      updatedAt: "1970-01-01T00:00:00.000Z",
    }
  );
}

export function getAppMode(home: string, now = new Date()): AppMode {
  const state = getAppModeState(home);
  return state.until && Date.parse(state.until) <= now.getTime()
    ? "normal"
    : state.mode;
}

export function setAppMode(
  home: string,
  raw: unknown,
  now = new Date(),
  options: { until?: string; reason?: string } = {},
) {
  const mode = AppModeSchema.parse(raw);
  const limits = AppModeStateSchema.pick({ until: true, reason: true }).parse(
    options,
  );
  const state = AppModeStateSchema.parse({
    id: "current",
    mode,
    updatedAt: now.toISOString(),
    ...limits,
  });
  if (findSecrets(state.reason ?? "").length)
    throw new Error("Do not store credentials in the mode reason.");
  return updateCollection(home, NAME, AppModeStateSchema, (items) => {
    loadMode(home);
    items.splice(0, items.length, state);
    return state;
  });
}

export function isAcademicText(text: string): boolean {
  const value = fold(text);
  // Medical examinations must never be silenced by an academic mode heuristic.
  if (
    /\b(?:medic[oa]s?|sangre|analisis|hospital|clinica|health|medical|blood|doctor|conducir|driving|dentista|vacuna|analitica)\b/.test(
      value,
    )
  )
    return false;
  return /\b(?:estudiar|estudio|estudios|repasar|deberes|asignatura|asignaturas|examen|examenes|parcial|parciales|universidad|study|studying|homework|exam|exams|coursework|lecture|lectures)\b/.test(
    value,
  );
}

export function scoreForAppMode(
  score: number,
  task: { text: string; list: string },
  mode: AppMode = "normal",
): number {
  const academic =
    /^(?:estudio|estudios|universidad|academico|academic|study)$/.test(
      task.list,
    ) || isAcademicText(task.text);
  if (mode === "examenes") {
    if (academic) return score + Math.abs(score) * 0.5 + 200;
    if (/^(?:compra|limpieza|hogar|casa|domestic|shopping)$/.test(task.list))
      return score - Math.abs(score) * 0.35;
  }
  if (mode === "vacaciones" && academic) return score - Math.abs(score) * 0.75;
  return score;
}

/** A dispatch decision only: existing reminders retain their due dates and statuses. */
export function shouldDispatchReminder(
  reminder: { text: string; source?: string },
  mode: AppMode,
  options: { academic?: boolean } = {},
): boolean {
  const academic =
    options.academic ??
    (["academic", "study"].includes(reminder.source ?? "") ||
      isAcademicText(reminder.text));
  return mode !== "vacaciones" || !academic;
}
