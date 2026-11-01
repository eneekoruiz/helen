import { occurrencesBetween, type Occurrence } from "./reminders.js";
import { listTasks, SHOPPING, isTaskSensitive, type Task } from "./tasks.js";
import { addDays, localParts, zonedTimeToUtc } from "./time.js";

/** What the day (or the week) holds: reminders that fire, tasks that are due or overdue, and the shopping list. */
export type AgendaRange = "today" | "tomorrow" | "week";

export interface Agenda {
  range: AgendaRange;
  from: Date;
  to: Date;
  occurrences: Occurrence[];
  dueTasks: Task[];
  overdueTasks: Task[];
  openTasks: number;
  shopping: Task[];
  workflows?: Array<{ title: string; next?: string }>;
}

export interface AgendaOptions {
  now?: Date;
  timezone: string;
  workflows?: Array<{ title: string; next?: string }>;
}

function localMidnight(now: Date, timezone: string, daysAhead: number): Date {
  const today = localParts(now, timezone);
  const day = addDays(today.year, today.month, today.day, daysAhead);
  return zonedTimeToUtc(day.year, day.month, day.day, 0, 0, timezone);
}

export function rangeBounds(
  range: AgendaRange,
  options: AgendaOptions,
): { from: Date; to: Date } {
  const now = options.now ?? new Date();
  if (range === "today")
    return { from: now, to: localMidnight(now, options.timezone, 1) };
  if (range === "tomorrow")
    return {
      from: localMidnight(now, options.timezone, 1),
      to: localMidnight(now, options.timezone, 2),
    };
  return { from: now, to: localMidnight(now, options.timezone, 8) };
}

export function buildAgenda(
  home: string,
  range: AgendaRange,
  options: AgendaOptions,
): Agenda {
  const now = options.now ?? new Date();
  const { from, to } = rangeBounds(range, options);
  const open = listTasks(home);
  const dueAt = (task: Task): number =>
    task.due ? Date.parse(task.due) : Number.NaN;
  return {
    range,
    from,
    to,
    occurrences: occurrencesBetween(home, from, to, options.timezone),
    dueTasks: open.filter(
      (task) =>
        dueAt(task) >= Math.max(from.getTime(), now.getTime()) &&
        dueAt(task) < to.getTime(),
    ),
    overdueTasks: open.filter((task) => dueAt(task) < now.getTime()),
    openTasks: open.filter((task) => task.list !== SHOPPING).length,
    shopping: open.filter((task) => task.list === SHOPPING),
    ...(options.workflows ? { workflows: options.workflows } : {}),
  };
}

export interface FormatOptions {
  lang: "es" | "en";
  locale: string;
  timezone: string;
  /** Spoken by a smart speaker: short, no private content. */
  speaker?: boolean;
  /** Show the text of reminders marked sensitive (never on a speaker). */
  showSensitive?: boolean;
}

function clock(at: Date, options: FormatOptions, withDay: boolean): string {
  const time = new Intl.DateTimeFormat(options.locale, {
    timeZone: options.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  if (!withDay) return time;
  const day = new Intl.DateTimeFormat(options.locale, {
    timeZone: options.timezone,
    weekday: "short",
    day: "numeric",
  }).format(at);
  return `${day} ${time}`;
}

function joinList(items: string[], lang: "es" | "en"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${lang === "es" ? "y" : "and"} ${items.at(-1)}`;
}

/** The agenda as a message: a list for screens, one or two sentences for a speaker. */
export function formatAgenda(agenda: Agenda, options: FormatOptions): string {
  const taskText = (task: Task) =>
    isTaskSensitive(task) && (options.speaker || !options.showSensitive)
      ? options.lang === "es"
        ? "tarea privada"
        : "private task"
      : task.text;
  const { lang } = options;
  const es = lang === "es";
  const when =
    agenda.range === "today"
      ? es
        ? "Hoy"
        : "Today"
      : agenda.range === "tomorrow"
        ? es
          ? "Mañana"
          : "Tomorrow"
        : es
          ? "Esta semana"
          : "This week";
  const withDay = agenda.range === "week";
  const describe = (occurrence: Occurrence): string => {
    const hidden =
      occurrence.reminder.sensitive &&
      (options.speaker || !options.showSensitive);
    const text = hidden
      ? es
        ? "un recordatorio privado"
        : "a private reminder"
      : occurrence.reminder.text;
    return `${clock(occurrence.at, options, withDay)} ${text}`;
  };

  if (options.speaker) {
    const parts: string[] = [];
    const occurrences = agenda.occurrences.slice(0, 5).map((occurrence) => {
      const hidden = occurrence.reminder.sensitive;
      return `${es ? "a las" : "at"} ${clock(occurrence.at, options, false)}, ${hidden ? (es ? "algo privado" : "something private") : occurrence.reminder.text}`;
    });
    if (agenda.occurrences.length === 0)
      parts.push(
        es
          ? `${when} no tienes recordatorios.`
          : `${when} you have no reminders.`,
      );
    else
      parts.push(
        es
          ? `${when} tienes ${agenda.occurrences.length === 1 ? "un recordatorio" : `${agenda.occurrences.length} recordatorios`}: ${joinList(occurrences, lang)}.`
          : `${when} you have ${agenda.occurrences.length === 1 ? "one reminder" : `${agenda.occurrences.length} reminders`}: ${joinList(occurrences, lang)}.`,
      );
    const due = agenda.dueTasks.length + agenda.overdueTasks.length;
    if (due > 0)
      parts.push(
        es
          ? `Y ${due === 1 ? "una tarea que vence" : `${due} tareas que vencen`}.`
          : `And ${due === 1 ? "one task due" : `${due} tasks due`}.`,
      );
    if (agenda.shopping.length > 0)
      parts.push(
        es
          ? `En la lista de la compra hay ${agenda.shopping.length === 1 ? "una cosa" : `${agenda.shopping.length} cosas`}.`
          : `There ${agenda.shopping.length === 1 ? "is one item" : `are ${agenda.shopping.length} items`} on the shopping list.`,
      );
    if (agenda.workflows && agenda.workflows.length > 0) {
      const active = agenda.workflows.filter((w) => w.next);
      if (active.length > 0) {
        parts.push(
          es
            ? `En tus gestiones: ${active[0]!.title}, ${active[0]!.next}.`
            : `In your workflows: ${active[0]!.title}, ${active[0]!.next}.`,
        );
      }
    }
    return parts.join(" ");
  }

  const lines: string[] = [];
  lines.push(
    agenda.occurrences.length === 0
      ? es
        ? `${when}: sin recordatorios.`
        : `${when}: no reminders.`
      : `${when}:`,
  );
  for (const occurrence of agenda.occurrences)
    lines.push(`- ${describe(occurrence)}`);
  if (agenda.overdueTasks.length > 0) {
    lines.push(es ? "Atrasadas:" : "Overdue:");
    for (const task of agenda.overdueTasks) lines.push(`- ${taskText(task)}`);
  }
  if (agenda.dueTasks.length > 0) {
    lines.push(es ? "Vencen:" : "Due:");
    for (const task of agenda.dueTasks)
      lines.push(
        `- ${clock(new Date(task.due!), options, withDay)} ${taskText(task)}`,
      );
  }
  if (agenda.openTasks > 0)
    lines.push(
      es
        ? `Tareas abiertas: ${agenda.openTasks}.`
        : `Open tasks: ${agenda.openTasks}.`,
    );
  if (agenda.shopping.length > 0)
    lines.push(
      `${es ? "Compra" : "Shopping"}: ${agenda.shopping.map(taskText).join(", ")}.`,
    );
  if (agenda.workflows && agenda.workflows.length > 0) {
    const active = agenda.workflows.filter((w) => w.next);
    if (active.length > 0) {
      lines.push(es ? "Gestiones en curso:" : "Active workflows:");
      for (const w of active) {
        lines.push(`- ${w.title}: ${w.next}`);
      }
    }
  }
  return lines.join("\n");
}
