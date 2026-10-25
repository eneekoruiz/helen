import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportCalendar, importCalendar } from "../src/assistant/calendar.js";
import { ReminderSchema } from "../src/assistant/reminders.js";
import { readCollection, updateCollection } from "../src/assistant/store.js";
import { addTasks, listTasks } from "../src/assistant/tasks.js";

let home: string;
const now = new Date("2026-10-23T08:00:00Z");
const options = { now, timezone: "Europe/Madrid" };
function calendar(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join(
    "\r\n",
  );
}
function event(uid = "meeting@example.org", extra: string[] = []): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    "SUMMARY:Reunión",
    "DTSTART;TZID=Europe/Madrid:20261026T090000",
    ...extra,
    "END:VEVENT",
  ].join("\r\n");
}
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-calendar-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

describe("calendar exchange", () => {
  it("roundtrips UTF-8 tasks and escapes/folds content without injecting calendar properties", () => {
    const text = "Comprar café, té; y libros " + "á".repeat(85) + " \\";
    addTasks(home, { text, due: new Date("2026-10-28T08:00:00Z"), now });
    const output = exportCalendar(home, options);
    for (const line of output.trimEnd().split("\r\n"))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    const target = path.join(home, "import");
    expect(importCalendar(target, output, options)).toEqual({
      reminders: 0,
      tasks: 1,
      skipped: 0,
    });
    expect(listTasks(target)[0]).toMatchObject({
      text,
      due: "2026-10-28T08:00:00.000Z",
    });
    expect(importCalendar(target, output, options)).toEqual({
      reminders: 0,
      tasks: 0,
      skipped: 1,
    });
  });

  it("imports a DST-aware weekly appointment with advance alarm and preserves UID on export", () => {
    const input = calendar(
      event("weekly@example.org", [
        "RRULE:FREQ=WEEKLY;BYDAY=MO",
        "X-HELEN-URGENT:TRUE",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT30M",
        "END:VALARM",
      ]),
    );
    expect(importCalendar(home, input, options).reminders).toBe(1);
    expect(
      readCollection(home, "reminders", ReminderSchema).items[0],
    ).toMatchObject({
      due: "2026-10-26T07:30:00.000Z",
      timezone: "Europe/Madrid",
      leadMinutes: 30,
      urgent: true,
      recurrence: { time: "09:00", byDay: [1] },
    });
    const output = exportCalendar(home, options);
    expect(output).toContain("UID:weekly@example.org");
    expect(output).toContain("DTSTART;TZID=Europe/Madrid:20261026T090000");
    expect(output).toContain("TRIGGER:-PT30M");
  });

  it("does not re-arm delivered reminders or resurrect deleted imported UIDs", () => {
    const input = calendar(event());
    importCalendar(home, input, options);
    updateCollection(home, "reminders", ReminderSchema, (items) => {
      items[0]!.status = "done";
    });
    expect(importCalendar(home, input, options).skipped).toBe(1);
    expect(
      readCollection(home, "reminders", ReminderSchema).items[0]!.status,
    ).toBe("done");
    updateCollection(home, "reminders", ReminderSchema, (items) => {
      items.splice(0);
    });
    expect(importCalendar(home, input, options).skipped).toBe(1);
  });

  it("omits private reminders and inferred sensitive tasks by default", () => {
    importCalendar(
      home,
      calendar(event("private", ["CLASS:PRIVATE"])),
      options,
    );
    expect(exportCalendar(home, options)).not.toContain("Reunión");
    expect(
      exportCalendar(home, { ...options, includeSensitive: true }),
    ).toContain("Reunión");
    const todo = [
      "BEGIN:VTODO",
      "UID:private-task",
      "SUMMARY:Personal",
      "CLASS:PRIVATE",
      "END:VTODO",
    ].join("\r\n");
    expect(() => importCalendar(home, calendar(todo), options)).toThrow(
      "privacy flag",
    );
    expect(() =>
      importCalendar(
        home,
        calendar(event("unknown", ["CLASS:SECRET"])),
        options,
      ),
    ).toThrow("classification");
  });

  it("validates every entry before writing and rejects unsupported recurrences", () => {
    for (const extra of [
      ["RRULE:FREQ=DAILY;COUNT=3"],
      ["RRULE:FREQ=WEEKLY;BYDAY=1MO"],
      ["EXDATE:20261026T080000Z"],
      ["RRULE:FREQ=MONTHLY;BYMONTHDAY=31"],
    ]) {
      expect(() =>
        importCalendar(
          home,
          calendar(event("valid"), event("bad", extra)),
          options,
        ),
      ).toThrow();
      expect(fs.existsSync(path.join(home, "reminders.json"))).toBe(false);
    }
  });

  it("rejects invalid dates, DST gaps, invalid zones and duplicate UIDs", () => {
    const input = calendar(event());
    for (const value of [
      input.replace("20261026T090000", "20260230T090000"),
      input.replace("20261026T090000", "20260329T023000"),
      input.replace("Europe/Madrid", "Unknown/Zone"),
      calendar(event(), event()),
    ])
      expect(() => importCalendar(home, value, options)).toThrow();
  });

  it("imports all-day events at local midnight and never sends expired appointments", () => {
    const input = calendar(
      event().replace(
        "DTSTART;TZID=Europe/Madrid:20261026T090000",
        "DTSTART;VALUE=DATE:20261022",
      ),
    );
    importCalendar(home, input, options);
    expect(
      readCollection(home, "reminders", ReminderSchema).items[0],
    ).toMatchObject({ due: "2026-10-21T22:00:00.000Z", status: "done" });
  });

  it("rejects oversized input and calendar credentials", () => {
    expect(() => importCalendar(home, "x".repeat(1_048_577), options)).toThrow(
      "large",
    );
    expect(() =>
      importCalendar(
        home,
        calendar(event().replace("Reunión", "la contraseña es hunter2abc")),
        options,
      ),
    ).toThrow("credentials");
  });

  it("rejects unsupported task status and contradictory date parameter types", () => {
    const todo = [
      "BEGIN:VTODO",
      "UID:cancelled-task",
      "SUMMARY:Cancelled",
      "STATUS:CANCELLED",
      "END:VTODO",
    ].join("\r\n");
    expect(() => importCalendar(home, calendar(todo), options)).toThrow(
      "status",
    );
    expect(() =>
      importCalendar(
        home,
        calendar(
          event().replace("DTSTART;TZID=Europe/Madrid", "DTSTART;VALUE=DATE"),
        ),
        options,
      ),
    ).toThrow("parameters");
    expect(fs.existsSync(path.join(home, "tasks.json"))).toBe(false);
  });

  it.each(["reminders.json", "tasks.json", "final index"])(
    "recovers interrupted import at %s without duplicating or re-arming",
    (failure) => {
      const input = calendar(
        event(),
        [
          "BEGIN:VTODO",
          "UID:task@example.org",
          "SUMMARY:Comprar libros",
          "END:VTODO",
        ].join("\r\n"),
      );
      const rename = fs.renameSync;
      let indexWrites = 0;
      const spy = vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
        if (to === path.join(home, "calendar-imports.json")) indexWrites++;
        if (
          to === path.join(home, failure) ||
          (failure === "final index" && indexWrites === 2)
        )
          throw new Error("disk failure");
        return rename(from, to);
      });
      try {
        expect(() => importCalendar(home, input, options)).toThrow(
          "disk failure",
        );
      } finally {
        spy.mockRestore();
      }
      const before = fs.readFileSync(
        path.join(home, "calendar-imports.json"),
        "utf8",
      );
      expect(() =>
        importCalendar(
          home,
          calendar(event("invalid", ["RRULE:FREQ=DAILY;COUNT=2"])),
          options,
        ),
      ).toThrow();
      expect(
        fs.readFileSync(path.join(home, "calendar-imports.json"), "utf8"),
      ).toBe(before);
      if (fs.existsSync(path.join(home, "reminders.json")))
        updateCollection(home, "reminders", ReminderSchema, (items) => {
          items[0]!.status = "done";
        });
      importCalendar(home, input, options);
      const reminders = readCollection(home, "reminders", ReminderSchema).items;
      expect(reminders).toHaveLength(1);
      if (failure !== "reminders.json")
        expect(reminders[0]!.status).toBe("done");
      expect(listTasks(home)).toHaveLength(1);
      expect(
        fs.readFileSync(path.join(home, "calendar-imports.json"), "utf8"),
      ).not.toContain('"pending"');
      expect(importCalendar(home, input, options)).toEqual({
        reminders: 0,
        tasks: 0,
        skipped: 2,
      });
    },
  );
});
