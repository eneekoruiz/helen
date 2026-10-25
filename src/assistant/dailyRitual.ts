import { occurrencesBetween, type Reminder } from "./reminders.js";
import { findSecrets, looksSensitive } from "../core/secrets.js";
import { rangeBounds } from "./agenda.js";
import {
  getAppMode,
  getAppModeState,
  shouldDispatchReminder,
  type AppMode,
} from "./appMode.js";
import { localDateKey } from "./time.js";
import {
  getLastDoneByList,
  getNeglectedLists,
  isTaskSensitive,
  listTasks,
  scoreTaskUrgency,
  type Task,
  type UrgencyContext,
} from "./tasks.js";

export interface DailyRitualOptions {
  now?: Date;
  timezone: string;
  locale: string;
  lang: "es" | "en";
  showSensitive?: boolean;
  speaker?: boolean;
  mode?: AppMode;
}

export interface DailyRitualResult {
  completedToday: Task[];
  openOverdue: Task[];
  neglectedLists: Array<{ list: string; daysSinceDone: number }>;
  tomorrowReminders: Reminder[];
  top3Tomorrow: Task[];
  text: string;
  speech: string;
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
}

function formatDateInTz(date: Date, timezone: string): string {
  return localDateKey(date, timezone);
}

function visibleTasks(home: string, options: DailyRitualOptions, now: Date) {
  return listTasks(home, { status: "all" }).filter(
    (task) =>
      Date.parse(task.created) <= now.getTime() &&
      findSecrets(task.text).length === 0 &&
      ((options.showSensitive && !options.speaker) ||
        !isTaskSensitive(task)),
  );
}

function visibleOccurrences(
  home: string,
  from: Date,
  to: Date,
  options: DailyRitualOptions,
) {
  const state = getAppModeState(home);
  return occurrencesBetween(home, from, to, options.timezone)
    .filter(
      ({ reminder, at }) =>
        findSecrets(reminder.text).length === 0 &&
        ((options.showSensitive && !options.speaker) ||
          (!reminder.sensitive && !looksSensitive(reminder.text))) &&
        shouldDispatchReminder(
          reminder,
          options.mode ??
            (state.until && Date.parse(state.until) <= at.getTime()
              ? "normal"
              : state.mode),
        ),
    )
    .map(({ reminder, at }) => ({ ...reminder, due: at.toISOString() }));
}

function spokenTask(task: Task, es: boolean): string {
  return isTaskSensitive(task)
    ? es
      ? "una tarea privada"
      : "a private task"
    : task.text;
}

export function runDailyShutdown(
  home: string,
  options: DailyRitualOptions,
): DailyRitualResult {
  const now = options.now ?? new Date();
  const lang = options.lang;
  const es = lang === "es";
  const allTasks = visibleTasks(home, options, now);

  const todayStr = formatDateInTz(now, options.timezone);

  // 1. Tareas completadas hoy
  const completedToday = allTasks.filter((t) => {
    if (t.status !== "done" || !t.done || Date.parse(t.done) > now.getTime())
      return false;
    return formatDateInTz(new Date(t.done), options.timezone) === todayStr;
  });

  // 2. Tareas vencidas o programadas para hoy que quedaron abiertas
  const openOverdue = allTasks.filter((t) => {
    if (t.status !== "open" || !t.due) return false;
    return Date.parse(t.due) <= now.getTime();
  });

  // 3. Desatención / Starvation por categoría (> 7 días sin completar tareas)
  const lastDoneByList = getLastDoneByList(allTasks);
  const neglectedLists = getNeglectedLists(allTasks, now, 7);

  // 4. Próximos avisos para mañana
  const tomorrow = rangeBounds("tomorrow", { now, timezone: options.timezone });
  const tomorrowReminders = visibleOccurrences(
    home,
    tomorrow.from,
    tomorrow.to,
    options,
  );

  // 5. Top 3 recomendaciones para mañana
  const openTasks = allTasks.filter((t) => t.status === "open");
  const urgencyCtx: UrgencyContext = {
    now: tomorrow.from,
    lastDoneByList,
    mode: options.mode ?? getAppMode(home, tomorrow.from),
  };
  const scored = openTasks
    .map((task) => ({ task, score: scoreTaskUrgency(task, urgencyCtx) }))
    .sort((a, b) => b.score - a.score);
  const top3Tomorrow = scored.slice(0, 3).map((s) => s.task);

  // Formatear texto detallado (Telegram/Web)
  const lines: string[] = [];
  lines.push(
    es ? "🌙 *Cierre del día completado*" : "🌙 *Daily Shutdown Complete*",
  );

  if (completedToday.length > 0) {
    lines.push(
      es
        ? `✅ *Completadas hoy (${completedToday.length}):*`
        : `✅ *Completed today (${completedToday.length}):*`,
    );
    for (const task of completedToday) {
      lines.push(`  • ~${task.text}~`);
    }
  } else {
    lines.push(
      es
        ? "ℹ️ Hoy no has marcado tareas completadas."
        : "ℹ️ No tasks marked as done today.",
    );
  }

  if (openOverdue.length > 0) {
    lines.push(
      es
        ? `⚠️ *Quedaron pendientes/vencidas (${openOverdue.length}):*`
        : `⚠️ *Pending/overdue today (${openOverdue.length}):*`,
    );
    for (const task of openOverdue.slice(0, 3)) {
      lines.push(`  • ${task.text}`);
    }
  }

  if (neglectedLists.length > 0) {
    const listWarnings = neglectedLists
      .map(
        (n) =>
          `*${n.list}* (${es ? `hace ${n.daysSinceDone}d sin completar` : `${n.daysSinceDone}d untouched`})`,
      )
      .join(", ");
    lines.push(
      es
        ? `🚨 *Atención a secciones desatendidas:* ${listWarnings}.`
        : `🚨 *Neglected areas:* ${listWarnings}.`,
    );
  }

  if (top3Tomorrow.length > 0) {
    lines.push(
      es
        ? "🎯 *Top 3 prioridades para arrancar mañana:*"
        : "🎯 *Top 3 priorities to kick off tomorrow:*",
    );
    top3Tomorrow.forEach((task, idx) => {
      const tag = task.list !== "inbox" ? `[${task.list}] ` : "";
      lines.push(`  ${idx + 1}. ${tag}${task.text}`);
    });
  }

  if (tomorrowReminders.length > 0) {
    lines.push(
      es
        ? `⏰ *Avisos programados para mañana:* ${tomorrowReminders.length}`
        : `⏰ *Reminders scheduled for tomorrow:* ${tomorrowReminders.length}`,
    );
  }

  // Formato conciso de voz para altavoz (Alexa / Audio)
  const speechParts: string[] = [];
  if (completedToday.length > 0) {
    speechParts.push(
      es
        ? `Buen trabajo, hoy completaste ${completedToday.length} tareas.`
        : `Good job, you completed ${completedToday.length} tasks today.`,
    );
  } else {
    speechParts.push(
      es ? "Resumen del cierre del día." : "Daily shutdown summary.",
    );
  }
  if (top3Tomorrow.length > 0) {
    const first = top3Tomorrow[0]!;
    speechParts.push(
      es
        ? `Para mañana tu prioridad principal es ${spokenTask(first, es)}.`
        : `For tomorrow your top priority is ${spokenTask(first, es)}.`,
    );
  }
  if (neglectedLists.length > 0) {
    const worst = neglectedLists[0]!;
    speechParts.push(
      es
        ? `Recuerda que una de tus listas lleva ${worst.daysSinceDone} días sin una tarea completada.`
        : `One of your lists has gone ${worst.daysSinceDone} days without a completed task.`,
    );
  }

  // Botones inline para Telegram
  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
  if (top3Tomorrow.length > 0) {
    const row = top3Tomorrow.slice(0, 2).map((t) => ({
      text: `✓ ${t.text.slice(0, 16)}`,
      callback_data: `done:${t.id}`,
    }));
    buttons.push(row);
  }
  if (openOverdue.length > 0) {
    buttons.push([
      {
        text: es
          ? "📅 Posponer vencidas a mañana"
          : "📅 Postpone overdue to tomorrow",
        callback_data: "snooze_overdue",
      },
    ]);
  }

  return {
    completedToday,
    openOverdue,
    neglectedLists,
    tomorrowReminders,
    top3Tomorrow,
    text: lines.join("\n"),
    speech: speechParts.join(" "),
    buttons,
  };
}

export function runDailyKickoff(
  home: string,
  options: DailyRitualOptions,
): DailyRitualResult {
  const now = options.now ?? new Date();
  const lang = options.lang;
  const es = lang === "es";
  const allTasks = visibleTasks(home, options, now);

  // Avisos de hoy
  // rangeBounds(today) starts now: already elapsed notification times are not invented upcoming alerts.
  const today = rangeBounds("today", { now, timezone: options.timezone });
  const todayReminders = visibleOccurrences(
    home,
    today.from,
    today.to,
    options,
  );

  const lastDoneByList = getLastDoneByList(allTasks);
  const neglectedLists = getNeglectedLists(allTasks, now, 7);

  const openTasks = allTasks.filter((t) => t.status === "open");
  const urgencyCtx: UrgencyContext = {
    now,
    lastDoneByList,
    mode: options.mode ?? getAppMode(home, now),
  };
  const scored = openTasks
    .map((task) => ({ task, score: scoreTaskUrgency(task, urgencyCtx) }))
    .sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3).map((s) => s.task);

  const lines: string[] = [];
  lines.push(es ? "🌅 *Plan de arranque del día*" : "🌅 *Daily Kickoff Plan*");

  if (top3.length > 0) {
    lines.push(
      es ? "🎯 *Top prioridades para hoy:*" : "🎯 *Top priorities for today:*",
    );
    top3.forEach((task, idx) => {
      const tag = task.list !== "inbox" ? `[${task.list}] ` : "";
      lines.push(`  ${idx + 1}. ${tag}${task.text}`);
    });
  } else {
    lines.push(
      es
        ? "🎉 No tienes tareas pendientes acumuladas."
        : "🎉 No pending tasks queued up.",
    );
  }

  if (todayReminders.length > 0) {
    lines.push(
      es
        ? `⏰ *Avisos programados hoy (${todayReminders.length}):*`
        : `⏰ *Reminders today (${todayReminders.length}):*`,
    );
    todayReminders.slice(0, 3).forEach((r) => lines.push(`  • ${r.text}`));
  }

  if (neglectedLists.length > 0) {
    const worst = neglectedLists[0]!;
    lines.push(
      es
        ? `⚠️ *Área desatendida prioritaria:* ${worst.list} (${worst.daysSinceDone}d sin tocar).`
        : `⚠️ *Priority neglected area:* ${worst.list} (${worst.daysSinceDone}d untouched).`,
    );
  }

  const speechParts: string[] = [];
  speechParts.push(es ? "Buenos días." : "Good morning.");
  if (top3.length > 0) {
    speechParts.push(
      es
        ? `Tu prioridad número uno hoy es ${spokenTask(top3[0]!, es)}.`
        : `Your number one priority today is ${spokenTask(top3[0]!, es)}.`,
    );
  }
  if (todayReminders.length > 0) {
    speechParts.push(
      es
        ? `Tienes ${todayReminders.length} avisos programados.`
        : `You have ${todayReminders.length} reminders scheduled.`,
    );
  }

  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
  if (top3.length > 0) {
    buttons.push(
      top3.slice(0, 2).map((t) => ({
        text: `✓ ${t.text.slice(0, 16)}`,
        callback_data: `done:${t.id}`,
      })),
    );
  }

  return {
    completedToday: [],
    openOverdue: [],
    neglectedLists,
    tomorrowReminders: todayReminders,
    top3Tomorrow: top3,
    text: lines.join("\n"),
    speech: speechParts.join(" "),
    buttons,
  };
}
