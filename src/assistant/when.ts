import { addDays, daysInMonth, localParts, zonedTimeToUtc } from './time.js';

/**
 * Dates and times in everyday Spanish and English: "mañana a las 9", "el viernes por la tarde",
 * "en 2 horas", "el 15 de noviembre a las 17:30", "cada lunes a las 8", "every weekday at 7am".
 * Everything is resolved as wall-clock time in the owner's time zone, so DST changes are handled.
 */
export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  /** For weekly: 0 = Sunday ... 6 = Saturday */
  byDay?: number[];
  dayOfMonth?: number;
  month?: number;
  /** HH:MM local time */
  time: string;
  /** YYYY-MM-DD of the first occurrence: intervals count from here. */
  anchor: string;
}

export interface ParsedWhen {
  due: Date;
  recurrence?: Recurrence;
  /** Character ranges of the input that expressed the date, so they can be removed from the text. */
  spans: Array<[number, number]>;
  hadDate: boolean;
  hadTime: boolean;
}

export interface WhenOptions {
  now: Date;
  timezone: string;
  /** Time used when only a day is given. */
  defaultTime?: string;
  /** en-US reads 3/4 as March 4; other locales as 3 April. */
  locale?: string;
}

type Part = 'morning' | 'afternoon' | 'evening' | 'night';
const PART_TIME: Record<Part, [number, number]> = { morning: [9, 0], afternoon: [16, 0], evening: [19, 0], night: [21, 0] };

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cuarenta5: 45,
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
};
const NUMBER_WORDS = 'un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|an|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty';
/** Hours as voice assistants transcribe them: "a las nueve", "at nine". */
const HOUR_WORDS = 'una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve';
/** Minutes after an hour in words: "y diez", "menos veinte", "thirty", "forty five", "en punto". */
const MINUTE_WORDS = String.raw`y\s+media|y\s+cuarto|menos\s+cuarto|(?:y|menos)\s+(?:\d{1,2}|cinco|diez|veinte|veinticinco)|en\s+punto|o'?clock|fifteen|thirty|forty[\s-]five|forty|fifty|twenty(?:[\s-]five)?`;
const MINUTE_VALUES: Record<string, number> = { cinco: 5, diez: 10, veinte: 20, veinticinco: 25, fifteen: 15, thirty: 30, forty: 40, 'forty five': 45, fifty: 50, twenty: 20, 'twenty five': 25 };
const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingos: 0, sabados: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sundays: 0, mondays: 1, tuesdays: 2, wednesdays: 3, thursdays: 4, fridays: 5, saturdays: 6,
};
const WEEKDAY = 'domingos?|lunes|martes|miercoles|jueves|viernes|sabados?|sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?';
const MONTH_NAMES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec';
const PART_WORDS = 'manana|tarde|noche|madrugada|morning|afternoon|evening|night';

/** Lower-case and strip accents without changing string length, so match positions map back to the input. */
function foldSameLength(text: string): string {
  let out = '';
  for (const char of text) {
    const folded = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += folded.length === char.length ? folded : char.toLowerCase().length === char.length ? char.toLowerCase() : char;
  }
  return out;
}

function partOf(word: string | undefined): Part | undefined {
  if (!word) return undefined;
  if (word === 'manana' || word === 'morning' || word === 'madrugada') return 'morning';
  if (word === 'tarde' || word === 'afternoon') return 'afternoon';
  if (word === 'evening') return 'evening';
  if (word === 'noche' || word === 'night' || word === 'tonight') return 'night';
  return undefined;
}

function number(word: string): number {
  return /^\d+$/.test(word) ? Number(word) : (NUMBERS[word] ?? NaN);
}

interface Time {
  hour: number;
  minute: number;
  /** am/pm or a part of day said explicitly, so no guessing. */
  explicit: boolean;
}

function to24(hour: number, minute: number, ampm: string | undefined, part: Part | undefined): Time | null {
  if (hour > 24 || minute > 59) return null;
  let h = hour === 24 ? 0 : hour;
  const marker = ampm?.replace(/[.\s]/g, '');
  if (marker === 'pm' && h < 12) h += 12;
  if (marker === 'am' && h === 12) h = 0;
  if (!marker && part) {
    if ((part === 'afternoon' || part === 'evening') && h < 12) h += 12;
    if (part === 'night') h = h === 12 ? 0 : h < 5 ? h : h < 12 ? h + 12 : h;
  }
  return { hour: h, minute, explicit: Boolean(marker || part) || hour > 12 || hour === 0 };
}

export function parseWhen(input: string, options: WhenOptions): ParsedWhen | null {
  const text = foldSameLength(input);
  const consumed = new Array<boolean>(text.length).fill(false);
  const spans: Array<[number, number]> = [];
  const free = (start: number, end: number): boolean => !consumed.slice(start, end).some(Boolean);
  const take = (pattern: RegExp, handler: (match: RegExpExecArray) => boolean): void => {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (let match = regex.exec(text); match; match = regex.exec(text)) {
      const start = match.index;
      const end = start + match[0].length;
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      if (!free(start, end)) continue;
      if (handler(match)) {
        for (let i = start; i < end; i += 1) consumed[i] = true;
        spans.push([start, end]);
      }
    }
  };
  const B = '(?<![a-z0-9])';
  const E = '(?![a-z0-9])';
  const now = options.now;
  const tz = options.timezone;
  const today = localParts(now, tz);

  // Declared with `as` so TypeScript does not narrow them to null: the matchers below assign them in callbacks.
  let dayOffset = null as number | null;
  let weekday = null as { day: number; thisWeek: boolean } | null;
  let date = null as { year?: number; month: number; day: number } | null;
  let time = null as Time | null;
  let part = null as Part | null;
  let offsetMs = null as number | null;
  let offsetDays = null as number | null;
  let offsetMonths = null as number | null;
  let recurrence = null as Omit<Recurrence, 'time' | 'anchor'> | null;

  // 1. Recurrence
  take(new RegExp(`${B}(?:los\\s+)?(?:dias\\s+)?laborables|${B}entre\\s+semana${E}|${B}de\\s+lunes\\s+a\\s+viernes${E}|${B}(?:every\\s+weekday|on\\s+weekdays|weekdays)${E}`), () => {
    recurrence = { freq: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] };
    return true;
  });
  take(new RegExp(`${B}(?:cada|todos\\s+los|todas\\s+las|every|on)\\s+((?:${WEEKDAY})(?:\\s*(?:,|y|e|and)\\s*(?:${WEEKDAY}))*)${E}|${B}los\\s+((?:${WEEKDAY})(?:\\s*(?:,|y|e)\\s*(?:los\\s+)?(?:${WEEKDAY}))*)${E}`), match => {
    const list = (match[1] ?? match[2])!;
    const days = [...list.matchAll(new RegExp(WEEKDAY, 'g'))].map(day => WEEKDAY_NAMES[day[0]]!).filter(day => day !== undefined);
    const plural = /s\b/.test(list) || /^(cada|todos|todas|every)/.test(match[0]) || match[0].startsWith('los');
    if (!plural || days.length === 0) return false;
    recurrence = { freq: 'weekly', interval: 1, byDay: [...new Set(days)].sort() };
    return true;
  });
  take(new RegExp(`${B}(?:cada|every)\\s+(\\d+|${NUMBER_WORDS})\\s+(dias|days|semanas|weeks)${E}`), match => {
    const n = number(match[1]!);
    if (!Number.isFinite(n) || n < 1 || n > 365) return false;
    recurrence = /^(dias|days)$/.test(match[2]!) ? { freq: 'daily', interval: n } : { freq: 'weekly', interval: n };
    return true;
  });
  take(new RegExp(`${B}(?:cada|todos\\s+los|todas\\s+las|every)\\s+(dias?|days?|mananas|noches|tardes|morning|evening|night|noche|tarde)${E}|${B}(?:diariamente|daily)${E}`), match => {
    recurrence = { freq: 'daily', interval: 1 };
    const word = match[1];
    if (word && !/^(dias?|days?)$/.test(word)) part = partOf(word.replace(/s$/, '').replace(/mananas?/, 'manana')) ?? null;
    return true;
  });
  take(new RegExp(`${B}el\\s+(?:dia\\s+)?(\\d{1,2})\\s+de\\s+cada\\s+mes${E}|${B}(?:on\\s+)?the\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+of\\s+(?:every|each)\\s+month${E}`), match => {
    const day = Number(match[1] ?? match[2]);
    if (day < 1 || day > 31) return false;
    recurrence = { freq: 'monthly', interval: 1, dayOfMonth: day };
    return true;
  });
  take(new RegExp(`${B}(?:cada\\s+mes|todos\\s+los\\s+meses|mensualmente|every\\s+month|monthly)${E}(?:\\s+el\\s+(?:dia\\s+)?(\\d{1,2})${E}|\\s+on\\s+the\\s+(\\d{1,2})(?:st|nd|rd|th)?${E})?`), match => {
    const day = match[1] ?? match[2];
    recurrence = { freq: 'monthly', interval: 1, ...(day ? { dayOfMonth: Number(day) } : {}) };
    return true;
  });
  take(new RegExp(`${B}(?:cada\\s+semana|todas\\s+las\\s+semanas|semanalmente|every\\s+week|weekly)${E}`), () => {
    recurrence = { freq: 'weekly', interval: 1 };
    return true;
  });
  take(new RegExp(`${B}(?:cada\\s+ano|todos\\s+los\\s+anos|anualmente|every\\s+year|yearly|annually)${E}`), () => {
    recurrence = { freq: 'yearly', interval: 1 };
    return true;
  });

  // 2. Relative offsets
  take(new RegExp(`${B}(?:en|dentro\\s+de|in|within)\\s+(?:(\\d+(?:[.,]\\d+)?|${NUMBER_WORDS})\\s+)?(media\\s+hora|half\\s+an?\\s+hour|minutos?|minutes?|mins?|horas?|hrs?|hours?|dias?|days?|semanas?|weeks?|meses|mes|months?)${E}`), match => {
    const unit = match[2]!;
    if (/media|half/.test(unit)) {
      offsetMs = 30 * 60_000 * (match[1] ? number(match[1]) || 1 : 1);
      return true;
    }
    const n = match[1] ? (/^\d/.test(match[1]) ? Number(match[1].replace(',', '.')) : number(match[1])) : 1;
    if (!Number.isFinite(n) || n <= 0 || n > 1000) return false;
    if (/^(minutos?|minutes?|mins?)$/.test(unit)) offsetMs = n * 60_000;
    else if (/^(horas?|hrs?|hours?)$/.test(unit)) offsetMs = n * 3_600_000;
    else if (/^(dias?|days?)$/.test(unit)) offsetDays = n;
    else if (/^(semanas?|weeks?)$/.test(unit)) offsetDays = n * 7;
    else offsetMonths = n;
    return true;
  });
  take(new RegExp(`${B}(?:dentro\\s+de|en)\\s+(?:un\\s+)?(?:cuarto\\s+de\\s+hora)${E}|${B}in\\s+a\\s+quarter\\s+of\\s+an\\s+hour${E}`), () => {
    offsetMs = 15 * 60_000;
    return true;
  });

  // 3. "this morning", "esta tarde", "tonight"
  take(new RegExp(`${B}(?:esta|this)\\s+(manana|tarde|noche|morning|afternoon|evening|night)${E}|${B}tonight${E}`), match => {
    dayOffset = 0;
    part = partOf(match[1] ?? 'night') ?? 'night';
    return true;
  });
  // "pasado mañana", "the day after tomorrow"
  take(new RegExp(`${B}pasado\\s+manana${E}|${B}(?:the\\s+)?day\\s+after\\s+tomorrow${E}`), () => {
    dayOffset = 2;
    return true;
  });

  // 4. Times
  take(new RegExp(`${B}(?:a\\s+las?|sobre\\s+las?|hacia\\s+las?|at|@)\\s*(\\d{1,2}|${HOUR_WORDS})(?!\\s+(?:point|of|another|least|time|way|side|hand|people|things|personas?|cosas|veces))(?:[:.h](\\d{2}))?(?:\\s+(${MINUTE_WORDS}))?\\s*(a\\.?\\s*m\\.?|p\\.?\\s*m\\.?|h|hrs|horas?)?(?:\\s+(?:de\\s+la|por\\s+la|en\\s+la|in\\s+the|at)\\s+(${PART_WORDS}))?${E}`), match => {
    let hour = number(match[1]!);
    let minute = match[2] ? Number(match[2]) : 0;
    const words = (match[3] ?? '').replace(/[\s-]+/g, ' ');
    if (words === 'y media') minute = 30;
    else if (words === 'y cuarto') minute = 15;
    else if (words === 'menos cuarto') { hour -= 1; minute = 45; }
    else if (/^y /.test(words)) minute = number(words.slice(2)) || MINUTE_VALUES[words.slice(2)] || 0;
    else if (/^menos /.test(words)) { hour -= 1; minute = 60 - (Number(words.slice(6)) || MINUTE_VALUES[words.slice(6)] || 0); }
    else if (MINUTE_VALUES[words] !== undefined) minute = MINUTE_VALUES[words]!;
    if (!Number.isFinite(hour) || minute < 0 || minute > 59) return false;
    const marker = match[4] && /[ap]/.test(match[4]) ? match[4] : undefined;
    const converted = to24(hour < 0 ? 23 : hour, minute, marker, partOf(match[5]));
    if (!converted) return false;
    time = converted;
    return true;
  });
  take(new RegExp(`${B}(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?\\s*m\\.?|p\\.?\\s*m\\.?)(?![a-z])|${B}(\\d{1,2}):(\\d{2})${E}|${B}(\\d{1,2})h(\\d{2})?${E}`), match => {
    const hour = Number(match[1] ?? match[4] ?? match[6]);
    const minute = Number(match[2] ?? match[5] ?? match[7] ?? 0);
    const converted = to24(hour, minute, match[3], undefined);
    if (!converted) return false;
    time = { ...converted, explicit: converted.explicit || Boolean(match[4]) && hour >= 13 };
    return true;
  });
  take(new RegExp(`${B}(?:al\\s+|a\\s+)?(mediodia|noon|medianoche|midnight)${E}`), match => {
    time = /mediodia|noon/.test(match[1]!) ? { hour: 12, minute: 0, explicit: true } : { hour: 0, minute: 0, explicit: true };
    if (/medianoche|midnight/.test(match[1]!) && dayOffset === null) dayOffset = 1;
    return true;
  });

  // 5. Parts of the day on their own
  take(new RegExp(`${B}(?:por|de|en)\\s+la\\s+(manana|tarde|noche|madrugada)${E}|${B}in\\s+the\\s+(morning|afternoon|evening)${E}|${B}at\\s+night${E}`), match => {
    part = partOf(match[1] ?? match[2] ?? 'night') ?? null;
    return part !== null;
  });

  // 6. Absolute dates
  take(new RegExp(`${B}(\\d{4})-(\\d{1,2})-(\\d{1,2})${E}`), match => {
    date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    return date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= daysInMonth(date.year!, date.month);
  });
  take(new RegExp(`${B}(?:el\\s+)?(\\d{1,2})\\s+de\\s+(${MONTH})(?:\\s+de(?:l)?\\s+(\\d{4}))?${E}|${B}(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH})(?:,?\\s+(\\d{4}))?${E}|${B}(?:on\\s+)?(${MONTH})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${E}`), match => {
    const day = Number(match[1] ?? match[4] ?? match[8]);
    const month = MONTH_NAMES[(match[2] ?? match[5] ?? match[7])!]!;
    const year = match[3] ?? match[6] ?? match[9];
    if (!month || day < 1 || day > 31) return false;
    date = { month, day, ...(year ? { year: Number(year) } : {}) };
    return true;
  });
  take(new RegExp(`${B}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?${E}`), match => {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const us = (options.locale ?? 'es-ES') === 'en-US';
    const [month, day] = us ? [first, second] : [second, first];
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const year = match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : undefined;
    date = { month, day, ...(year ? { year } : {}) };
    return true;
  });

  // 7. Weekdays and plain day words
  take(new RegExp(`${B}(?:el\\s+|este\\s+|this\\s+|next\\s+|on\\s+|el\\s+proximo\\s+|proximo\\s+)?(${WEEKDAY})(?:\\s+que\\s+viene|\\s+proximo)?${E}`), match => {
    const day = WEEKDAY_NAMES[match[1]!];
    if (day === undefined) return false;
    weekday = { day, thisWeek: /^(este|this)\s/.test(match[0]) };
    return true;
  });
  take(new RegExp(`${B}(manana|tomorrow)${E}`), () => {
    dayOffset = 1;
    return true;
  });
  take(new RegExp(`${B}(hoy|today)${E}`), () => {
    dayOffset = 0;
    return true;
  });

  const anything = recurrence || offsetMs !== null || offsetDays !== null || offsetMonths !== null || dayOffset !== null || weekday || date || time || part;
  if (!anything) return null;

  const [defaultHour, defaultMinute] = (options.defaultTime ?? '09:00').split(':').map(Number) as [number, number];
  const resolvedTime = (): { hour: number; minute: number } => {
    if (time) return time;
    if (part) return { hour: PART_TIME[part][0], minute: PART_TIME[part][1] };
    return { hour: defaultHour, minute: defaultMinute };
  };
  const hadTime = Boolean(time || part);
  const instant = (d: { year: number; month: number; day: number }, t: { hour: number; minute: number }): Date => zonedTimeToUtc(d.year, d.month, d.day, t.hour, t.minute, tz);
  const result = (due: Date, extra: Partial<ParsedWhen> = {}): ParsedWhen => ({ due, spans: spans.sort((a, b) => a[0] - b[0]), hadDate: Boolean(dayOffset !== null || weekday || date || offsetDays !== null || offsetMonths !== null || recurrence), hadTime, ...extra });

  // Recurring
  if (recurrence) {
    const rec = recurrence as Omit<Recurrence, 'time' | 'anchor'>;
    const t = resolvedTime();
    let anchorDate = { year: today.year, month: today.month, day: today.day };
    if (date) anchorDate = { year: date.year ?? today.year, month: date.month, day: date.day };
    const full: Recurrence = {
      ...rec,
      ...(rec.freq === 'weekly' && !rec.byDay ? { byDay: [weekday ? weekday.day : today.weekday] } : {}),
      ...(rec.freq === 'monthly' && !rec.dayOfMonth ? { dayOfMonth: date ? date.day : today.day } : {}),
      ...(rec.freq === 'yearly' ? { month: date ? date.month : today.month, dayOfMonth: date ? date.day : today.day } : {}),
      time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
      anchor: `${anchorDate.year}-${String(anchorDate.month).padStart(2, '0')}-${String(anchorDate.day).padStart(2, '0')}`,
    };
    return result(nextOccurrence(full, new Date(now.getTime() - 1), tz, true) ?? now, { recurrence: full, hadTime: true });
  }

  // Exact offsets
  if (offsetMs !== null && dayOffset === null && !weekday && !date && offsetDays === null && offsetMonths === null) {
    return result(new Date(now.getTime() + (offsetMs as number)), { hadTime: true });
  }

  let base: { year: number; month: number; day: number } | null = null;
  if (offsetDays !== null || offsetMonths !== null) {
    if (offsetMonths !== null) {
      const totalMonths = today.month - 1 + (offsetMonths as number);
      const year = today.year + Math.floor(totalMonths / 12);
      const month = (totalMonths % 12) + 1;
      base = { year, month, day: Math.min(today.day, daysInMonth(year, month)) };
    } else {
      base = addDays(today.year, today.month, today.day, offsetDays as number);
    }
    if (!hadTime) {
      // "in 3 days" without a time keeps the current time of day.
      return result(new Date(instant(base, { hour: today.hour, minute: today.minute }).getTime()), { hadTime: false });
    }
  } else if (date) {
    const d = date as { year?: number; month: number; day: number };
    let year = d.year ?? today.year;
    if (d.day > daysInMonth(year, d.month)) return null;
    if (d.year === undefined && instant({ year, month: d.month, day: d.day }, resolvedTime()) <= now) year += 1;
    base = { year, month: d.month, day: d.day };
  } else if (weekday) {
    const w = weekday as { day: number; thisWeek: boolean };
    let diff = (w.day - today.weekday + 7) % 7;
    if (diff === 0) {
      const t = resolvedTime();
      const later = instant({ year: today.year, month: today.month, day: today.day }, t) > now;
      diff = w.thisWeek && later ? 0 : 7;
    }
    base = addDays(today.year, today.month, today.day, diff);
  } else if (dayOffset !== null) {
    base = addDays(today.year, today.month, today.day, dayOffset as number);
  }

  let t = resolvedTime();
  if (time && !(time as Time).explicit && (time as Time).hour >= 1 && (time as Time).hour <= 6) t = { hour: (time as Time).hour + 12, minute: (time as Time).minute };

  if (!base) {
    // Only a time: the nearest future reading of it, today or tomorrow.
    const todayDate = { year: today.year, month: today.month, day: today.day };
    if (instant(todayDate, t) > now) return result(instant(todayDate, t));
    if (time && !(time as Time).explicit && t.hour < 12 && instant(todayDate, { hour: t.hour + 12, minute: t.minute }) > now) {
      return result(instant(todayDate, { hour: t.hour + 12, minute: t.minute }));
    }
    return result(instant(addDays(today.year, today.month, today.day, 1), t));
  }

  let due = instant(base, t);
  if (due <= now && dayOffset === 0) {
    if (!hadTime) {
      // "today" with no time after the default hour has passed: one hour from now.
      due = new Date(Math.ceil((now.getTime() + 3_600_000) / 300_000) * 300_000);
    } else if (time && !(time as Time).explicit && t.hour < 12) {
      due = instant(base, { hour: t.hour + 12, minute: t.minute });
    }
  }
  return result(due);
}

/** The next occurrence of a rule strictly after `after`. Returns null if nothing matches within ~2 years. */
export function nextOccurrence(rule: Recurrence, after: Date, timeZone: string, inclusiveOfAnchor = false): Date | null {
  const [hour, minute] = rule.time.split(':').map(Number) as [number, number];
  const [ay, am, ad] = rule.anchor.split('-').map(Number) as [number, number, number];
  const anchorDays = Date.UTC(ay, am - 1, ad) / 86_400_000;
  const start = localParts(after, timeZone);
  for (let offset = 0; offset <= 800; offset += 1) {
    const day = addDays(start.year, start.month, start.day, offset);
    const dayNumber = Date.UTC(day.year, day.month - 1, day.day) / 86_400_000;
    if (dayNumber < anchorDays && !inclusiveOfAnchor) continue;
    const sinceAnchor = dayNumber - anchorDays;
    let matches = false;
    if (rule.freq === 'daily') matches = sinceAnchor >= 0 ? sinceAnchor % rule.interval === 0 : rule.interval === 1;
    else if (rule.freq === 'weekly') {
      const weeks = Math.floor((sinceAnchor - ((day.weekday - new Date(Date.UTC(ay, am - 1, ad)).getUTCDay() + 7) % 7)) / 7);
      matches = (rule.byDay ?? []).includes(day.weekday) && (rule.interval === 1 || (weeks >= 0 && weeks % rule.interval === 0));
    } else if (rule.freq === 'monthly') {
      const target = Math.min(rule.dayOfMonth ?? ad, daysInMonth(day.year, day.month));
      const months = (day.year - ay) * 12 + (day.month - am);
      matches = day.day === target && months % rule.interval === 0;
    } else {
      const target = Math.min(rule.dayOfMonth ?? ad, daysInMonth(day.year, rule.month ?? am));
      matches = day.month === (rule.month ?? am) && day.day === target;
    }
    if (!matches) continue;
    const candidate = zonedTimeToUtc(day.year, day.month, day.day, hour, minute, timeZone);
    if (candidate > after) return candidate;
  }
  return null;
}

/** Remove the date words from a sentence and tidy what is left: "llamar a mamá mañana a las 9" -> "llamar a mamá". */
export function stripWhen(input: string, spans: Array<[number, number]>): string {
  let out = '';
  let last = 0;
  for (const [start, end] of spans) {
    out += `${input.slice(last, start)} `;
    last = end;
  }
  out += input.slice(last);
  return out
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:.-]*(?:que|de|para|a|to|about|that|el|la|on)\s+/i, '')
    .replace(/(?:\s+|,)(?:a\s+las?|a\s+la|el|la|de|del|para|at|on|the|y|and|por)\s*[.,;!?]*$/i, '')
    .replace(/[\s,;:-]+$/g, '')
    .trim();
}

const DAY_NAMES = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTH_LABELS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "cada lunes a las 08:00", "los días laborables a las 07:30", "every year on March 3 at 09:00". */
export function describeRecurrence(rule: Recurrence, lang: 'es' | 'en'): string {
  const es = lang === 'es';
  const at = es ? `a las ${rule.time}` : `at ${rule.time}`;
  const join = (words: string[]): string => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} ${es ? 'y' : 'and'} ${words.at(-1)}`);
  if (rule.freq === 'daily') return rule.interval === 1 ? (es ? `todos los días ${at}` : `every day ${at}`) : (es ? `cada ${rule.interval} días ${at}` : `every ${rule.interval} days ${at}`);
  if (rule.freq === 'weekly') {
    const days = [...(rule.byDay ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const weekdays = days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day));
    if (rule.interval > 1) {
      const names = join(days.map(day => DAY_NAMES[lang][day]!));
      return es ? `cada ${rule.interval} semanas, el ${names}, ${at}` : `every ${rule.interval} weeks on ${names} ${at}`;
    }
    if (weekdays) return es ? `los días laborables ${at}` : `on weekdays ${at}`;
    if (days.length === 1) return es ? `cada ${DAY_NAMES.es[days[0]!]} ${at}` : `every ${DAY_NAMES.en[days[0]!]} ${at}`;
    // Spanish weekdays ending in -s do not change in the plural (los lunes); sábado and domingo add an s.
    return es ? `los ${join(days.map(day => (DAY_NAMES.es[day]!.endsWith('s') ? DAY_NAMES.es[day]! : `${DAY_NAMES.es[day]!}s`)))} ${at}` : `every ${join(days.map(day => DAY_NAMES.en[day]!))} ${at}`;
  }
  if (rule.freq === 'monthly') {
    const day = rule.dayOfMonth ?? Number(rule.anchor.slice(8, 10));
    if (rule.interval > 1) return es ? `el día ${day} cada ${rule.interval} meses ${at}` : `on day ${day} every ${rule.interval} months ${at}`;
    return es ? `el día ${day} de cada mes ${at}` : `on day ${day} of every month ${at}`;
  }
  const month = rule.month ?? Number(rule.anchor.slice(5, 7));
  const day = rule.dayOfMonth ?? Number(rule.anchor.slice(8, 10));
  return es ? `cada año el ${day} de ${MONTH_LABELS.es[month - 1]} ${at}` : `every year on ${MONTH_LABELS.en[month - 1]} ${day} ${at}`;
}
