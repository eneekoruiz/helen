import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { getAppMode, type AppMode } from "./appMode.js";
import {
  getLastDoneByList,
  getNeglectedLists,
  isTaskSensitive,
  listTasks,
  scoreTaskUrgency,
  type Task,
} from "./tasks.js";
import {
  addDays,
  isValidTimeZone,
  localParts,
  zonedTimeToUtc,
} from "./time.js";

export interface WeeklyRitualOptions {
  now?: Date;
  timezone: string;
  locale: string;
  lang: "es" | "en";
  showSensitive?: boolean;
  speaker?: boolean;
  mode?: AppMode;
}

function nextWeekdayAt(
  now: Date,
  timezone: string,
  weekday: number,
  time: string,
): Date {
  z.string().refine(isValidTimeZone).parse(timezone);
  z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .parse(time);
  const local = localParts(now, timezone);
  const [hour, minute] = time.split(":").map(Number);
  let days = (weekday - local.weekday + 7) % 7;
  let day = addDays(local.year, local.month, local.day, days);
  let candidate = zonedTimeToUtc(
    day.year,
    day.month,
    day.day,
    hour!,
    minute!,
    timezone,
  );
  if (candidate <= now) {
    days += 7;
    day = addDays(local.year, local.month, local.day, days);
    candidate = zonedTimeToUtc(
      day.year,
      day.month,
      day.day,
      hour!,
      minute!,
      timezone,
    );
  }
  return candidate;
}

/** Sunday at a local wall-clock time; DST gaps/folds follow the shared time policy. */
export function nextSundayReviewAt(
  now: Date,
  timezone: string,
  time = "18:00",
): Date {
  return nextWeekdayAt(now, timezone, 0, time);
}
export function nextMondayAt(
  now: Date,
  timezone: string,
  time = "07:30",
): Date {
  return nextWeekdayAt(now, timezone, 1, time);
}

function ordinal(instant: Date, timezone: string): number {
  const local = localParts(instant, timezone);
  return Date.UTC(local.year, local.month - 1, local.day) / 86_400_000;
}
function streak(tasks: Task[], now: Date, timezone: string) {
  const days = [
    ...new Set(
      tasks
        .flatMap(completionTimes)
        .filter((at) => Date.parse(at) <= now.getTime())
        .map((at) => ordinal(new Date(at), timezone)),
    ),
  ].sort((a, b) => a - b);
  let longest = 0;
  let count = 0;
  let previous = -Infinity;
  for (const day of days) {
    count = day === previous + 1 ? count + 1 : 1;
    longest = Math.max(longest, count);
    previous = day;
  }
  const seen = new Set(days);
  let today = ordinal(now, timezone);
  if (!seen.has(today)) today--;
  let current = 0;
  while (seen.has(today--)) current++;
  return { currentDays: current, longestDays: longest };
}

function completionTimes(task: Task): string[] {
  return [
    ...new Set([
      ...(task.completions ?? []),
      ...(task.status === "done" && task.done ? [task.done] : []),
    ]),
  ];
}

/** Observed task completions only: no invented habit tracking or automatic completion. */
export function runWeeklyReview(home: string, options: WeeklyRitualOptions) {
  const now = options.now ?? new Date();
  z.string().refine(isValidTimeZone).parse(options.timezone);
  const from = new Date(now.getTime() - 7 * 86_400_000);
  const es = options.lang === "es";
  const tasks = listTasks(home, { status: "all" }).filter(
    (task) =>
      Date.parse(task.created) <= now.getTime() &&
      findSecrets(task.text).length === 0 &&
      ((options.showSensitive && !options.speaker) || !isTaskSensitive(task)),
  );
  const completedLast7Days = tasks.filter((task) =>
    completionTimes(task).some(
      (at) =>
        Date.parse(at) >= from.getTime() && Date.parse(at) <= now.getTime(),
    ),
  );
  const completionCountLast7Days = tasks
    .flatMap(completionTimes)
    .filter(
      (at) =>
        Date.parse(at) >= from.getTime() && Date.parse(at) <= now.getTime(),
    ).length;
  const lists = [...new Set(tasks.map((task) => task.list))].sort();
  const streaksByList = lists.map((list) => ({
    list,
    completedLast7Days: completedLast7Days.filter((task) => task.list === list)
      .length,
    open: tasks.filter((task) => task.list === list && task.status === "open")
      .length,
    ...streak(
      tasks.filter((task) => task.list === list),
      now,
      options.timezone,
    ),
  }));
  const neglectedLists = getNeglectedLists(tasks, now, 14);
  const mondayAt = nextMondayAt(now, options.timezone);
  const mode = options.mode ?? getAppMode(home, mondayAt);
  const lastDoneByList = getLastDoneByList(
    tasks.filter(
      (task) => !task.done || Date.parse(task.done) <= now.getTime(),
    ),
  );
  const mondayTop3 = tasks
    .filter((task) => task.status === "open")
    .sort(
      (a, b) =>
        scoreTaskUrgency(b, { now: mondayAt, lastDoneByList, mode }) -
          scoreTaskUrgency(a, { now: mondayAt, lastDoneByList, mode }) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);
  const observedStreak = streak(tasks, now, options.timezone);
  const lines = [
    es ? "Revisión de los últimos siete días" : "Review of the last seven days",
    es
      ? `Tareas completadas: ${completedLast7Days.length}; ejecuciones registradas: ${completionCountLast7Days}. Racha observada: ${observedStreak.currentDays} días.`
      : `Completed tasks: ${completedLast7Days.length}; recorded completions: ${completionCountLast7Days}. Observed streak: ${observedStreak.currentDays} days.`,
  ];
  if (neglectedLists.length)
    lines.push(
      es
        ? `Áreas con más de 14 días sin completar: ${neglectedLists.map((area) => `${area.list} (${area.daysSinceDone} días)`).join(", ")}.`
        : `Areas without a completion for over 14 days: ${neglectedLists.map((area) => `${area.list} (${area.daysSinceDone} days)`).join(", ")}.`,
    );
  if (mondayTop3.length)
    lines.push(
      es ? "Propuesta para el lunes:" : "Suggested Monday priorities:",
      ...mondayTop3.map((task, index) => `${index + 1}. ${task.text}`),
    );
  lines.push(
    es
      ? "Las rachas usan el historial conservado; las tareas antiguas sin historial o eliminadas no permiten reconstruir todas las ejecuciones. No he cambiado fechas ni estados."
      : "Streaks use retained history; old tasks without history or deleted tasks cannot establish all completions. No dates or states were changed.",
  );
  const speech = [
    lines[1],
    mondayTop3.length
      ? es
        ? `Para el lunes, ${isTaskSensitive(mondayTop3[0]!) ? "una tarea privada" : mondayTop3[0]!.text}.`
        : `For Monday, ${isTaskSensitive(mondayTop3[0]!) ? "a private task" : mondayTop3[0]!.text}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    generated: now.toISOString(),
    from: from.toISOString(),
    to: now.toISOString(),
    completedLast7Days,
    completionCountLast7Days,
    streaksByList,
    streak: observedStreak,
    neglectedLists,
    mondayTop3,
    mondayAt: mondayAt.toISOString(),
    mode,
    text: lines.join("\n"),
    speech,
  };
}
