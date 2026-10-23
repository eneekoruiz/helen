/** Time-zone arithmetic with Intl only: wall-clock times in an IANA zone, converted exactly across DST changes. */
export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, value);
  }
  return value;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday as string] ?? 0,
  };
}

function offsetAt(instant: number, timeZone: string): number {
  const p = localParts(new Date(instant), timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(instant / 1000) * 1000
  );
}

/** DST policy: choose the earlier fold instant; move nonexistent times forward by the gap. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsets = new Set(
    [-2, -1, 0, 1, 2].map((days) =>
      offsetAt(guess + days * 86_400_000, timeZone),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => guess - offset)
    .sort((a, b) => a - b);
  const exact = candidates.filter((candidate) => {
    const p = localParts(new Date(candidate), timeZone);
    return (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    );
  });
  return new Date(exact[0] ?? candidates.at(-1)!);
}

/** Calendar arithmetic on local dates, independent of any zone. */
export function addDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number; weekday: number } {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function localDateKey(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "martes, 21 de octubre, 9:00" / "Tuesday, October 21, 9:00" with today/tomorrow when it applies. */
export function describeInstant(
  instant: Date,
  timeZone: string,
  locale: string,
  now: Date = new Date(),
): string {
  const lang = locale.startsWith("es") ? "es" : "en";
  const day = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instant);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  const today = localDateKey(now, timeZone);
  const target = localDateKey(instant, timeZone);
  const n = localParts(now, timeZone);
  const tomorrowParts = addDays(n.year, n.month, n.day, 1);
  const tomorrow = `${tomorrowParts.year}-${String(tomorrowParts.month).padStart(2, "0")}-${String(tomorrowParts.day).padStart(2, "0")}`;
  const relative =
    target === today
      ? lang === "es"
        ? "hoy"
        : "today"
      : target === tomorrow
        ? lang === "es"
          ? "mañana"
          : "tomorrow"
        : "";
  const at = lang === "es" ? "a las" : "at";
  if (relative) return `${relative} (${day}) ${at} ${time}`;
  return lang === "es" ? `el ${day}, ${at} ${time}` : `on ${day} ${at} ${time}`;
}

/** The short form for lists: "hoy a las 21:00", "el jueves 22 a las 21:00", "el 3 de marzo a las 09:00". */
export function shortInstant(
  instant: Date,
  timeZone: string,
  locale: string,
  now: Date = new Date(),
): string {
  const lang = locale.startsWith("es") ? "es" : "en";
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  const at = lang === "es" ? "a las" : "at";
  const n = localParts(now, timeZone);
  const keyOf = (offset: number): string => {
    const d = addDays(n.year, n.month, n.day, offset);
    return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  };
  const target = localDateKey(instant, timeZone);
  if (target === keyOf(0))
    return `${lang === "es" ? "hoy" : "today"} ${at} ${time}`;
  if (target === keyOf(1))
    return `${lang === "es" ? "mañana" : "tomorrow"} ${at} ${time}`;
  const withinWeek =
    instant.getTime() - now.getTime() < 6.5 * 86_400_000 && instant >= now;
  const day = withinWeek
    ? new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: "long",
        day: "numeric",
      }).format(instant)
    : new Intl.DateTimeFormat(locale, {
        timeZone,
        day: "numeric",
        month: "long",
      }).format(instant);
  return lang === "es" ? `el ${day} ${at} ${time}` : `${day} ${at} ${time}`;
}
