import crypto from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { findSecrets, looksSensitive } from "../core/secrets.js";
import { readConfig, withHomeLock, writePrivate } from "./home.js";
import { ReminderSchema, type Reminder } from "./reminders.js";
import { readCollection } from "./store.js";
import { TaskSchema, type Task } from "./tasks.js";
import { isValidTimeZone, localParts, zonedTimeToUtc } from "./time.js";
import { nextOccurrence, type Recurrence } from "./when.js";

interface CalendarOptions {
  timezone?: string;
  now?: Date;
}
interface ExportOptions extends CalendarOptions {
  includeSensitive?: boolean;
  includeCompleted?: boolean;
}
interface Property {
  value: string;
  params: Record<string, string>;
}
interface Component {
  kind: "VEVENT" | "VTODO";
  properties: Map<string, Property>;
  alarm?: Map<string, Property>;
}
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
export const CalendarImportLinkSchema = z
  .object({
    uid: z.string().min(1).max(1000),
    id: z.string().regex(/^[rt][0-9a-f]{6}$/),
    kind: z.enum(["VEVENT", "VTODO"]),
    pending: z.union([ReminderSchema, TaskSchema]).optional(),
  })
  .refine(
    (link) =>
      link.id.startsWith(link.kind === "VEVENT" ? "r" : "t") &&
      (!link.pending ||
        (link.pending.id === link.id && link.pending.source === "calendar")),
    "Calendar kind/id mismatch",
  );

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function unescapeText(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    let char = value[index]!;
    if (char === "\\") {
      char = value[++index] ?? "";
      if (!/[nN\\;,]/.test(char))
        throw new Error("Unsupported calendar text escape");
      if (char === "n" || char === "N") char = "\n";
    }
    result += char;
  }
  return result;
}
function foldLine(line: string): string {
  const lines: string[] = [];
  let part = "";
  for (const char of line) {
    if (Buffer.byteLength(part + char, "utf8") > 75) {
      lines.push(part);
      part = " ";
    }
    part += char;
  }
  return [...lines, part].join("\r\n");
}
function stamp(value: string | Date): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
function zone(home: string, options: CalendarOptions): string {
  const value = options.timezone ?? readConfig(home).timezone;
  if (!isValidTimeZone(value)) throw new Error("Invalid calendar timezone");
  return value;
}
function localStamp(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

/** Only recurrences with the same semantics as HELEN's scheduler are exchanged. */
function supportedRule(rule: Recurrence): void {
  if (
    (rule.freq === "monthly" || rule.freq === "yearly") &&
    (rule.dayOfMonth ?? Number(rule.anchor.slice(8))) > 28
  )
    throw new Error(
      "Calendar recurrence on days 29–31 is unsupported (HELEN clamps short months)",
    );
  if (rule.freq === "yearly" && rule.interval !== 1)
    throw new Error("Yearly calendar intervals are unsupported");
  if (
    rule.freq === "weekly" &&
    rule.interval > 1 &&
    (rule.byDay?.length ?? 0) !== 1
  )
    throw new Error("Multi-day weekly calendar intervals are unsupported");
}

/** RFC 5545 text, private entries omitted unless explicitly requested. No credentials are exported. */
export function exportCalendar(
  home: string,
  options: ExportOptions = {},
): string {
  const timezone = zone(home, options);
  return withHomeLock(home, () => {
    const links = readCollection(
      home,
      "calendar-imports",
      CalendarImportLinkSchema,
    ).items;
    const uid = (id: string) =>
      escapeText(
        links.find((link) => link.id === id)?.uid ?? `${id}@helen.local`,
      );
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//HELEN//Personal assistant//EN",
      "CALSCALE:GREGORIAN",
    ];
    for (const reminder of readCollection(home, "reminders", ReminderSchema)
      .items) {
      if (
        (!options.includeCompleted && reminder.status !== "pending") ||
        (!options.includeSensitive &&
          (reminder.sensitive || looksSensitive(reminder.text))) ||
        findSecrets(reminder.text).length
      )
        continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid(reminder.id)}`,
        `DTSTAMP:${stamp(reminder.updated)}`,
        `SUMMARY:${escapeText(reminder.text)}`,
        `CLASS:${reminder.sensitive ? "PRIVATE" : "PUBLIC"}`,
      );
      const rule = reminder.recurrence;
      const reminderZone = reminder.timezone ?? timezone;
      if (rule) {
        supportedRule(rule);
        lines.push(
          `DTSTART;TZID=${reminderZone}:${localStamp(rule.anchor, rule.time)}`,
          `RRULE:FREQ=${rule.freq.toUpperCase()};INTERVAL=${rule.interval}${rule.freq === "weekly" ? `;BYDAY=${(rule.byDay ?? []).map((day) => DAYS[day]).join(",")}` : ""}${rule.dayOfMonth ? `;BYMONTHDAY=${rule.dayOfMonth}` : ""}${rule.month ? `;BYMONTH=${rule.month}` : ""}`,
        );
      } else
        lines.push(
          `DTSTART:${stamp(new Date(Date.parse(reminder.due) + (reminder.leadMinutes ?? 0) * 60_000))}`,
        );
      lines.push(
        `X-HELEN-URGENT:${reminder.urgent ? "TRUE" : "FALSE"}`,
        `STATUS:${reminder.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      );
      if (reminder.status === "done") lines.push("X-HELEN-DONE:TRUE");
      if (reminder.leadMinutes)
        lines.push(
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(reminder.text)}`,
          `TRIGGER:-PT${reminder.leadMinutes}M`,
          "END:VALARM",
        );
      lines.push("END:VEVENT");
    }
    for (const task of readCollection(home, "tasks", TaskSchema).items) {
      if (
        (!options.includeCompleted && task.status === "done") ||
        (!options.includeSensitive && looksSensitive(task.text)) ||
        findSecrets(task.text).length
      )
        continue;
      lines.push(
        "BEGIN:VTODO",
        `UID:${uid(task.id)}`,
        `DTSTAMP:${stamp(task.updated)}`,
        `SUMMARY:${escapeText(task.text)}`,
        `CATEGORIES:${escapeText(task.list)}`,
        `PRIORITY:${task.priority === "high" ? 1 : task.priority === "low" ? 9 : 5}`,
        `STATUS:${task.status === "done" ? "COMPLETED" : "NEEDS-ACTION"}`,
      );
      if (task.due) lines.push(`DUE:${stamp(task.due)}`);
      lines.push("END:VTODO");
    }
    return [...lines, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
  });
}

function parse(text: string): Component[] {
  if (Buffer.byteLength(text, "utf8") > 1_048_576 || /\0/.test(text))
    throw new Error("Calendar is too large or contains invalid bytes");
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .trim()
    .split("\n");
  if (lines[0] !== "BEGIN:VCALENDAR" || lines.at(-1) !== "END:VCALENDAR")
    throw new Error("Expected one VCALENDAR");
  const components: Component[] = [];
  const stack: string[] = ["VCALENDAR"];
  let current: Component | undefined;
  let version = false;
  for (const line of lines.slice(1, -1)) {
    const match = /^([A-Z0-9-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
    if (!match) throw new Error("Invalid calendar content line");
    const name = match[1]!.toUpperCase(),
      value = match[3]!;
    if (name === "BEGIN") {
      const kind = value.toUpperCase();
      if ((kind === "VEVENT" || kind === "VTODO") && stack.length === 1) {
        current = { kind, properties: new Map() };
        components.push(current);
      } else if (
        kind === "VALARM" &&
        current?.kind === "VEVENT" &&
        stack.length === 2 &&
        !current.alarm
      )
        current.alarm = new Map();
      else if (
        !(kind === "VTIMEZONE" && stack.length === 1) &&
        stack[1] !== "VTIMEZONE"
      )
        throw new Error(`Unsupported calendar component: ${kind}`);
      stack.push(kind);
      continue;
    }
    if (name === "END") {
      if (stack.length === 1 || stack.pop() !== value.toUpperCase())
        throw new Error("Mismatched calendar component");
      if (stack.length === 1) current = undefined;
      continue;
    }
    if (stack.length === 1) {
      if (name === "VERSION" && value === "2.0") version = true;
      continue;
    }
    if (!current) continue;
    const params: Record<string, string> = {};
    for (const part of match[2]!.split(";").slice(1)) {
      const parameter = /^([A-Z-]+)=(?:"([^"\r\n]+)"|([^"\r\n]+))$/i.exec(part);
      if (!parameter || params[parameter[1]!.toUpperCase()] !== undefined)
        throw new Error("Invalid calendar parameter");
      params[parameter[1]!.toUpperCase()] = parameter[2] ?? parameter[3]!;
    }
    const target =
      stack.at(-1) === "VALARM" ? current.alarm! : current.properties;
    if (target.has(name))
      throw new Error(`Duplicate calendar property: ${name}`);
    target.set(name, { value, params });
  }
  if (!version || stack.length !== 1 || components.length > 5000)
    throw new Error("Incomplete or unsupported calendar");
  return components;
}

function dateProperty(property: Property, timezone: string): Date {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    property.value,
  );
  if (!match) throw new Error("Invalid calendar date");
  if (
    (property.params.VALUE &&
      property.params.VALUE !== (match[4] ? "DATE-TIME" : "DATE")) ||
    (!match[4] && property.params.TZID)
  )
    throw new Error("Invalid calendar date parameters");
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((value) => Number(value ?? 0));
  const utc = new Date(
    Date.UTC(year!, month! - 1, day!, hour!, minute!, second!),
  );
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() + 1 !== month ||
    utc.getUTCDate() !== day ||
    hour! > 23 ||
    minute! > 59 ||
    second! > 59
  )
    throw new Error("Invalid calendar date");
  if (match[7]) {
    if (property.params.TZID) throw new Error("UTC date cannot have TZID");
    return utc;
  }
  const tz = property.params.TZID ?? timezone;
  if (!isValidTimeZone(tz))
    throw new Error(`Unsupported calendar timezone: ${tz}`);
  const date = new Date(
    zonedTimeToUtc(year!, month!, day!, hour!, minute!, tz).getTime() +
      second! * 1000,
  );
  const p = localParts(date, tz);
  if (
    p.year !== year ||
    p.month !== month ||
    p.day !== day ||
    p.hour !== hour ||
    p.minute !== minute
  )
    throw new Error("Calendar date falls in a daylight-saving gap");
  return date;
}

function recurrence(
  property: Property | undefined,
  start: Property,
  timezone: string,
): Recurrence | undefined {
  if (!property) return undefined;
  const fields: Record<string, string> = {};
  for (const entry of property.value.split(";")) {
    const [key, value, extra] = entry.split("=");
    if (
      !key ||
      !value ||
      extra ||
      fields[key] ||
      !["FREQ", "INTERVAL", "BYDAY", "BYMONTHDAY", "BYMONTH"].includes(key)
    )
      throw new Error("Unsupported calendar recurrence rule");
    fields[key] = value;
  }
  const freq = fields.FREQ?.toLowerCase();
  if (!["daily", "weekly", "monthly", "yearly"].includes(freq ?? ""))
    throw new Error("Unsupported calendar recurrence frequency");
  const tz =
    start.params.TZID ?? (start.value.endsWith("Z") ? "UTC" : timezone);
  const p = localParts(dateProperty(start, timezone), tz);
  if (p.second !== 0)
    throw new Error("Recurring calendar seconds are unsupported");
  const rule: Recurrence = {
    freq: freq as Recurrence["freq"],
    interval: Number(fields.INTERVAL ?? 1),
    anchor: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
    time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  };
  if (fields.BYDAY) {
    if (freq !== "weekly") throw new Error("BYDAY requires weekly recurrence");
    rule.byDay = fields.BYDAY.split(",").map((day) => {
      const index = DAYS.indexOf(day);
      if (index < 0) throw new Error("Unsupported BYDAY");
      return index;
    });
  } else if (freq === "weekly") rule.byDay = [p.weekday];
  if (freq === "weekly" && rule.interval > 1 && rule.byDay?.[0] !== p.weekday)
    throw new Error("Weekly interval must start on its recurrence day");
  if (fields.BYMONTHDAY) {
    if (freq !== "monthly" && freq !== "yearly")
      throw new Error("Unsupported BYMONTHDAY");
    rule.dayOfMonth = Number(fields.BYMONTHDAY);
  }
  if (fields.BYMONTH) {
    if (freq !== "yearly") throw new Error("Unsupported BYMONTH");
    rule.month = Number(fields.BYMONTH);
  }
  if (
    (rule.dayOfMonth !== undefined &&
      (!Number.isInteger(rule.dayOfMonth) ||
        rule.dayOfMonth < 1 ||
        rule.dayOfMonth > 31)) ||
    (rule.month !== undefined &&
      (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12)) ||
    !Number.isInteger(rule.interval) ||
    rule.interval < 1 ||
    rule.interval > 366
  )
    throw new Error("Invalid recurrence interval/date");
  supportedRule(rule);
  return rule;
}

/** Validate the entire file before touching storage. Re-imported UIDs never re-arm an existing reminder. */
export function importCalendar(
  home: string,
  text: string,
  options: CalendarOptions = {},
): { reminders: number; tasks: number; skipped: number } {
  const timezone = zone(home, options),
    now = options.now ?? new Date();
  const seen = new Set<string>();
  const entries = parse(text).map((component) => {
    const props = component.properties;
    const uid = unescapeText(props.get("UID")?.value ?? "");
    const summary = unescapeText(props.get("SUMMARY")?.value ?? "");
    if (
      props.has("CLASS") &&
      !["PUBLIC", "PRIVATE", "CONFIDENTIAL"].includes(props.get("CLASS")!.value)
    )
      throw new Error("Unsupported calendar privacy classification");
    if (
      !uid ||
      uid.length > 1000 ||
      !summary.trim() ||
      seen.has(uid) ||
      findSecrets(summary).length
    )
      throw new Error(
        "Calendar UID/summary is missing, duplicated, or contains credentials",
      );
    seen.add(uid);
    for (const unsupported of ["EXDATE", "RDATE", "RECURRENCE-ID", "EXRULE"])
      if (props.has(unsupported))
        throw new Error(`Unsupported calendar property: ${unsupported}`);
    const id = `${component.kind === "VEVENT" ? "r" : "t"}${crypto.randomBytes(3).toString("hex")}`;
    const base = {
      id,
      text: summary,
      created: now.toISOString(),
      updated: now.toISOString(),
      source: "calendar",
    };
    if (component.kind === "VTODO") {
      if (["PRIVATE", "CONFIDENTIAL"].includes(props.get("CLASS")?.value ?? ""))
        throw new Error(
          "Private calendar tasks require a privacy flag unsupported by the task store",
        );
      if (
        props.has("STATUS") &&
        !["NEEDS-ACTION", "IN-PROCESS", "COMPLETED"].includes(
          props.get("STATUS")!.value,
        )
      )
        throw new Error("Unsupported calendar task status");
      if (props.has("RRULE") || component.alarm)
        throw new Error("Recurring/alarmed calendar tasks are unsupported");
      const priority = Number(props.get("PRIORITY")?.value ?? 0);
      if (!Number.isInteger(priority) || priority < 0 || priority > 9)
        throw new Error("Invalid calendar priority");
      const task = TaskSchema.parse({
        ...base,
        list: unescapeText(props.get("CATEGORIES")?.value ?? "inbox"),
        status: props.get("STATUS")?.value === "COMPLETED" ? "done" : "open",
        priority:
          priority > 0 && priority < 5
            ? "high"
            : priority > 5
              ? "low"
              : "normal",
        ...(props.has("DUE")
          ? { due: dateProperty(props.get("DUE")!, timezone).toISOString() }
          : {}),
      });
      return { uid, kind: component.kind, task };
    }
    const start = props.get("DTSTART");
    if (!start) throw new Error("Calendar event requires DTSTART");
    if (
      props.has("STATUS") &&
      !["TENTATIVE", "CONFIRMED", "CANCELLED"].includes(
        props.get("STATUS")!.value,
      )
    )
      throw new Error("Unsupported calendar event status");
    const rule = recurrence(props.get("RRULE"), start, timezone);
    let leadMinutes = 0;
    if (component.alarm) {
      const trigger = /^-PT(\d+)([MH])$/.exec(
        component.alarm.get("TRIGGER")?.value ?? "",
      );
      if (
        !trigger ||
        component.alarm.get("ACTION")?.value !== "DISPLAY" ||
        component.alarm.has("REPEAT") ||
        component.alarm.get("TRIGGER")?.params.RELATED === "END"
      )
        throw new Error(
          "Only one DISPLAY alarm before event start is supported",
        );
      leadMinutes = Number(trigger[1]) * (trigger[2] === "H" ? 60 : 1);
    }
    let event = dateProperty(start, timezone);
    const tz =
      start.params.TZID ?? (start.value.endsWith("Z") ? "UTC" : timezone);
    if (rule && event.getTime() - leadMinutes * 60_000 <= now.getTime()) {
      const next = nextOccurrence(
        rule,
        new Date(now.getTime() + leadMinutes * 60_000),
        tz,
      );
      if (!next)
        throw new Error(
          "Calendar recurrence has no supported future occurrence",
        );
      event = next;
    }
    const due = new Date(event.getTime() - leadMinutes * 60_000);
    const reminder = ReminderSchema.parse({
      ...base,
      due: due.toISOString(),
      recurrence: rule,
      timezone: tz,
      leadMinutes,
      urgent: props.get("X-HELEN-URGENT")?.value === "TRUE",
      status:
        props.get("STATUS")?.value === "CANCELLED"
          ? "cancelled"
          : props.get("X-HELEN-DONE")?.value === "TRUE" || due <= now
            ? "done"
            : "pending",
      sensitive:
        props.get("CLASS")?.value === "PRIVATE" ||
        props.get("CLASS")?.value === "CONFIDENTIAL" ||
        looksSensitive(summary),
      fired: 0,
      failedAttempts: 0,
    });
    return { uid, kind: component.kind, reminder };
  });
  return withHomeLock(home, () => {
    const reminders = readCollection(home, "reminders", ReminderSchema);
    const tasks = readCollection(home, "tasks", TaskSchema);
    const links = readCollection(
      home,
      "calendar-imports",
      CalendarImportLinkSchema,
    );
    if (links.invalid.length)
      throw new Error("Calendar UID index is damaged; refusing to overwrite");
    if (
      new Set(links.items.map((link) => link.uid)).size !==
        links.items.length ||
      new Set(links.items.map((link) => link.id)).size !== links.items.length
    )
      throw new Error("Calendar UID index contains duplicates");
    const result = { reminders: 0, tasks: 0, skipped: 0 };
    const hadPending = links.items.some((link) => link.pending);
    for (const link of links.items) {
      if (!link.pending) continue;
      const loaded = link.kind === "VEVENT" ? reminders : tasks;
      if (
        loaded.invalid.some(
          (item) =>
            item &&
            typeof item === "object" &&
            "id" in item &&
            item.id === link.id,
        )
      )
        throw new Error(
          "Pending calendar item is damaged; refusing to overwrite",
        );
      if (loaded.items.some((item) => item.id === link.id)) continue;
      if (link.kind === "VEVENT") {
        reminders.items.push(ReminderSchema.parse(link.pending));
        result.reminders++;
      } else {
        tasks.items.push(TaskSchema.parse(link.pending));
        result.tasks++;
      }
    }
    for (const entry of entries) {
      if (links.items.some((link) => link.uid === entry.uid)) {
        result.skipped++;
        continue;
      }
      const ownId = /^([rt][0-9a-f]{6})@helen\.local$/.exec(entry.uid)?.[1];
      const items = entry.reminder ? reminders.items : tasks.items;
      if (ownId && items.some((item) => item.id === ownId)) {
        result.skipped++;
        continue;
      }
      const item: Reminder | Task = entry.reminder ?? entry.task!;
      while (
        items.some((existing) => existing.id === item.id) ||
        links.items.some((link) => link.id === item.id)
      )
        item.id = `${entry.reminder ? "r" : "t"}${crypto.randomBytes(3).toString("hex")}`;
      if (entry.reminder) {
        reminders.items.push(entry.reminder);
        result.reminders++;
      } else {
        tasks.items.push(entry.task!);
        result.tasks++;
      }
      links.items.push({
        uid: entry.uid,
        id: item.id,
        kind: entry.kind,
        pending: item,
      });
    }
    // Reserve UIDs before storing items so an interrupted import resumes by ID without re-arming delivered items.
    const saveLinks = () =>
      writePrivate(
        path.join(home, "calendar-imports.json"),
        JSON.stringify({ version: 1, items: links.items }, null, 2) + "\n",
      );
    if (result.reminders + result.tasks) saveLinks();
    if (result.reminders)
      writePrivate(
        path.join(home, "reminders.json"),
        JSON.stringify(
          { version: 1, items: [...reminders.items, ...reminders.invalid] },
          null,
          2,
        ) + "\n",
      );
    if (result.tasks)
      writePrivate(
        path.join(home, "tasks.json"),
        JSON.stringify(
          { version: 1, items: [...tasks.items, ...tasks.invalid] },
          null,
          2,
        ) + "\n",
      );
    if (result.reminders + result.tasks || hadPending) {
      for (const link of links.items) delete link.pending;
      saveLinks();
    }
    return result;
  });
}
