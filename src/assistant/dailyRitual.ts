import { listReminders, type Reminder } from "./reminders.js";
import {
  getLastDoneByList,
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
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function runDailyShutdown(
  home: string,
  options: DailyRitualOptions,
): DailyRitualResult {
  const now = options.now ?? new Date();
  const lang = options.lang;
  const es = lang === "es";
  const allTasks = listTasks(home, { status: "all" });

  const todayStr = formatDateInTz(now, options.timezone);

  // 1. Tareas completadas hoy
  const completedToday = allTasks.filter((t) => {
    if (t.status !== "done" || !t.done) return false;
    return formatDateInTz(new Date(t.done), options.timezone) === todayStr;
  });

  // 2. Tareas vencidas o programadas para hoy que quedaron abiertas
  const openOverdue = allTasks.filter((t) => {
    if (t.status !== "open" || !t.due) return false;
    return Date.parse(t.due) <= now.getTime();
  });

  // 3. Desatención / Starvation por categoría (> 7 días sin completar tareas)
  const lastDoneByList = getLastDoneByList(allTasks);
  const nowMs = now.getTime();
  const neglectedLists: Array<{ list: string; daysSinceDone: number }> = [];
  const knownLists = new Set([
    "compra",
    "limpieza",
    "cuidado",
    ...allTasks.map((t) => t.list),
  ]);

  for (const list of knownLists) {
    if (list === "inbox") continue;
    const hasOpen = allTasks.some(
      (t) => t.list === list && t.status === "open",
    );
    if (!hasOpen) continue;
    const lastDoneMs = lastDoneByList.get(list);
    if (lastDoneMs !== undefined) {
      const days = Math.round((nowMs - lastDoneMs) / 86_400_000);
      if (days >= 7) neglectedLists.push({ list, daysSinceDone: days });
    } else {
      neglectedLists.push({ list, daysSinceDone: 30 });
    }
  }
  neglectedLists.sort((a, b) => b.daysSinceDone - a.daysSinceDone);

  // 4. Próximos avisos para mañana
  const tomorrow = new Date(nowMs + 86_400_000);
  const tomorrowStr = formatDateInTz(tomorrow, options.timezone);
  const reminders = listReminders(home);
  const tomorrowReminders = reminders.filter((r) => {
    return formatDateInTz(new Date(r.due), options.timezone) === tomorrowStr;
  });

  // 5. Top 3 recomendaciones para mañana
  const openTasks = allTasks.filter((t) => t.status === "open");
  const urgencyCtx: UrgencyContext = { now, lastDoneByList };
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
      es ? "Cierre del día registrado." : "Daily shutdown recorded.",
    );
  }
  if (top3Tomorrow.length > 0) {
    const first = top3Tomorrow[0]!;
    speechParts.push(
      es
        ? `Para mañana tu prioridad principal es ${first.text}.`
        : `For tomorrow your top priority is ${first.text}.`,
    );
  }
  if (neglectedLists.length > 0) {
    const worst = neglectedLists[0]!;
    speechParts.push(
      es
        ? `Recuerda que la lista de ${worst.list} lleva ${worst.daysSinceDone} días sin tocarse.`
        : `Remember that your ${worst.list} list has been untouched for ${worst.daysSinceDone} days.`,
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
        text: es ? "📅 Posponer vencidas a mañana" : "📅 Postpone overdue to tomorrow",
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
  const allTasks = listTasks(home, { status: "all" });

  const todayStr = formatDateInTz(now, options.timezone);

  // Avisos de hoy
  const reminders = listReminders(home);
  const todayReminders = reminders.filter((r) => {
    return formatDateInTz(new Date(r.due), options.timezone) === todayStr;
  });

  const lastDoneByList = getLastDoneByList(allTasks);
  const nowMs = now.getTime();
  const neglectedLists: Array<{ list: string; daysSinceDone: number }> = [];
  const knownLists = new Set([
    "compra",
    "limpieza",
    "cuidado",
    ...allTasks.map((t) => t.list),
  ]);

  for (const list of knownLists) {
    if (list === "inbox") continue;
    const hasOpen = allTasks.some(
      (t) => t.list === list && t.status === "open",
    );
    if (!hasOpen) continue;
    const lastDoneMs = lastDoneByList.get(list);
    if (lastDoneMs !== undefined) {
      const days = Math.round((nowMs - lastDoneMs) / 86_400_000);
      if (days >= 7) neglectedLists.push({ list, daysSinceDone: days });
    } else {
      neglectedLists.push({ list, daysSinceDone: 30 });
    }
  }
  neglectedLists.sort((a, b) => b.daysSinceDone - a.daysSinceDone);

  const openTasks = allTasks.filter((t) => t.status === "open");
  const urgencyCtx: UrgencyContext = { now, lastDoneByList };
  const scored = openTasks
    .map((task) => ({ task, score: scoreTaskUrgency(task, urgencyCtx) }))
    .sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3).map((s) => s.task);

  const lines: string[] = [];
  lines.push(
    es ? "🌅 *Plan de arranque del día*" : "🌅 *Daily Kickoff Plan*",
  );

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
  speechParts.push(
    es ? "Buenos días." : "Good morning.",
  );
  if (top3.length > 0) {
    speechParts.push(
      es
        ? `Tu prioridad número uno hoy es ${top3[0]!.text}.`
        : `Your number one priority today is ${top3[0]!.text}.`,
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
