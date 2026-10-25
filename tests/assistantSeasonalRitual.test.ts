import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAppMode,
  getAppModeState,
  setAppMode,
  shouldDispatchReminder,
} from "../src/assistant/appMode.js";
import {
  runDailyKickoff,
  runDailyShutdown,
} from "../src/assistant/dailyRitual.js";
import { addReminder, listReminders } from "../src/assistant/reminders.js";
import {
  addTasks,
  completeTask,
  getLastDoneByList,
  getNeglectedLists,
  listTasks,
  rescheduleOverdueTasks,
  scoreTaskUrgency,
} from "../src/assistant/tasks.js";
import {
  nextMondayAt,
  nextSundayReviewAt,
  runWeeklyReview,
} from "../src/assistant/weeklyRitual.js";

let home: string;
const NOW = new Date("2026-10-25T18:00:00Z");
const options = {
  now: NOW,
  timezone: "Europe/Madrid",
  locale: "es-ES",
  lang: "es" as const,
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-seasonal-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
function task(text: string, list: string, at = NOW, due?: Date) {
  return addTasks(home, { text, list, now: at, ...(due ? { due } : {}) })
    .added[0]!;
}

describe("seasonal mode", () => {
  it("persists one validated mode, exposes PWA timestamps and expires without deleting preferences", () => {
    expect(getAppModeState(home)).toMatchObject({
      mode: "normal",
      updatedAt: "1970-01-01T00:00:00.000Z",
    });
    const state = setAppMode(home, "examenes", NOW, {
      until: "2026-10-26T18:00:00Z",
      reason: "Finales",
    });
    expect(getAppModeState(home)).toEqual(state);
    expect(getAppMode(home, NOW)).toBe("examenes");
    expect(getAppMode(home, new Date("2026-10-26T18:00:00Z"))).toBe("normal");
    expect(getAppModeState(home)).toEqual(state);
    expect(() => setAppMode(home, "unknown", NOW)).toThrow();
    expect(getAppModeState(home)).toEqual(state);
  });

  it("refuses corrupt mode state without overwriting the owner's bytes", () => {
    const file = path.join(home, "app-mode.json");
    const raw = JSON.stringify({
      version: 1,
      items: [
        {
          id: "current",
          mode: "future-unsupported",
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    fs.writeFileSync(file, raw);
    expect(() => getAppMode(home)).toThrow(/Repair/);
    expect(() => setAppMode(home, "normal", NOW)).toThrow(/Repair/);
    expect(fs.readFileSync(file, "utf8")).toBe(raw);
  });

  it("favors study in exams and softens domestic urgency even for negative base scores", () => {
    const study = task("Repasar álgebra", "estudio");
    const domestic = task("Ordenar armario", "limpieza");
    const all = listTasks(home);
    const context = { now: NOW, lastDoneByList: getLastDoneByList(all) };
    expect(
      scoreTaskUrgency(study, { ...context, mode: "examenes" }),
    ).toBeGreaterThan(
      scoreTaskUrgency(domestic, { ...context, mode: "examenes" }),
    );
    const low = { ...domestic, priority: "low" as const };
    expect(
      scoreTaskUrgency(low, { ...context, mode: "examenes" }),
    ).toBeLessThan(scoreTaskUrgency(low, { ...context, mode: "normal" }));
  });

  it("suppresses academic dispatch in vacations without changing reminder state or silencing medical exams", () => {
    const reminder = addReminder(
      home,
      { text: "Estudiar álgebra", when: "mañana a las 9" },
      { ...options, defaultTime: "09:00" },
    );
    expect(shouldDispatchReminder(reminder, "vacaciones")).toBe(false);
    expect(shouldDispatchReminder(reminder, "normal")).toBe(true);
    expect(
      shouldDispatchReminder({ text: "Examen médico" }, "vacaciones"),
    ).toBe(true);
    expect(
      shouldDispatchReminder({ text: "Examen de conducir" }, "vacaciones"),
    ).toBe(true);
    expect(
      shouldDispatchReminder({ text: "Aviso genérico" }, "vacaciones", {
        academic: true,
      }),
    ).toBe(false);
    expect(listReminders(home)[0]).toEqual(reminder);
  });
});

describe("honest weekly and daily reviews", () => {
  it("reports actual last-seven-day completions and calendar-day streaks across DST", () => {
    for (const [text, completed] of [
      ["Sábado", "2026-10-24T21:00:00Z"],
      ["Domingo temprano", "2026-10-25T00:30:00Z"],
      ["Domingo tarde", "2026-10-25T01:30:00Z"],
      ["Antiguo", "2026-10-10T09:00:00Z"],
      ["Futuro", "2026-10-26T09:00:00Z"],
    ]) {
      const item = task(text!, "estudio", new Date("2026-10-01T08:00:00Z"));
      completeTask(home, item.id, new Date(completed!));
    }
    const review = runWeeklyReview(home, options);
    expect(review.completedLast7Days).toHaveLength(3);
    expect(review.streak).toEqual({ currentDays: 2, longestDays: 2 });
    expect(review.streaksByList[0]).toMatchObject({
      list: "estudio",
      completedLast7Days: 3,
      currentDays: 2,
    });
    expect(review.mondayAt).toBe("2026-10-26T06:30:00.000Z");
  });

  it("does not fabricate neglect for a new list and requires more than fourteen observed days", () => {
    task("Nuevo", "nueva");
    task("Justo catorce", "limite", new Date(NOW.getTime() - 14 * 86400000));
    task("Olvidado", "limpieza", new Date(NOW.getTime() - 20 * 86400000));
    expect(getNeglectedLists(listTasks(home), NOW, 14)).toEqual([
      { list: "limpieza", daysSinceDone: 20 },
    ]);
    expect(runWeeklyReview(home, options).neglectedLists).toEqual([
      { list: "limpieza", daysSinceDone: 20 },
    ]);
    expect(
      runDailyShutdown(home, options).neglectedLists.some(
        (list) => list.list === "nueva",
      ),
    ).toBe(false);
  });

  it("keeps private task and reminder bodies out of default reports and every spoken answer", () => {
    task("Revisar DNI 12345678Z", "privado");
    task("Hacer una llamada", "87654321x");
    addReminder(
      home,
      { text: "Mi cita confidencial", when: "mañana a las 9", sensitive: true },
      { ...options, defaultTime: "09:00" },
    );
    for (const review of [
      runWeeklyReview(home, options),
      runDailyShutdown(home, options),
      runDailyKickoff(home, options),
    ])
      expect(JSON.stringify(review)).not.toMatch(
        /12345678Z|87654321x|Mi cita confidencial/,
      );
    expect(
      runWeeklyReview(home, { ...options, showSensitive: true }).speech,
    ).not.toContain("12345678Z");
    expect(
      runDailyKickoff(home, { ...options, showSensitive: true }).speech,
    ).not.toContain("12345678Z");
  });

  it("gets tomorrow by local date on the 25-hour autumn day rather than adding 24 hours", () => {
    const now = new Date("2026-10-24T22:30:00Z");
    const reminder = addReminder(
      home,
      { text: "Llamar mañana", when: "mañana a las 9" },
      { ...options, now, defaultTime: "09:00" },
    );
    expect(
      runDailyShutdown(home, { ...options, now }).tomorrowReminders.map(
        (item) => item.id,
      ),
    ).toEqual([reminder.id]);
  });

  it("computes Sunday and Monday wall-clock schedules across both DST changes", () => {
    expect(
      nextSundayReviewAt(
        new Date("2026-10-24T18:00:00Z"),
        "Europe/Madrid",
      ).toISOString(),
    ).toBe("2026-10-25T17:00:00.000Z");
    expect(
      nextSundayReviewAt(
        new Date("2026-03-28T18:00:00Z"),
        "Europe/Madrid",
      ).toISOString(),
    ).toBe("2026-03-29T16:00:00.000Z");
    expect(
      nextMondayAt(
        new Date("2026-03-29T12:00:00Z"),
        "Europe/Madrid",
      ).toISOString(),
    ).toBe("2026-03-30T05:30:00.000Z");
    expect(() => nextSundayReviewAt(NOW, "Bad/Zone")).toThrow();
    expect(() => nextSundayReviewAt(NOW, "Europe/Madrid", "25:10")).toThrow();
  });

  it("uses the persisted mode in daily and Monday priority proposals without mutating tasks", () => {
    const domestic = task("Ordenar cajón", "limpieza");
    const study = task("Repasar álgebra", "estudio");
    setAppMode(home, "examenes", NOW);
    expect(runDailyKickoff(home, options).top3Tomorrow[0]!.id).toBe(study.id);
    expect(runWeeklyReview(home, options).mondayTop3[0]!.id).toBe(study.id);
    expect(
      listTasks(home).find((item) => item.id === domestic.id)!.status,
    ).toBe("open");
  });

  it("keeps completion timestamps deterministic and compares overdue instants numerically", () => {
    const item = task("Terminar", "inbox");
    expect(completeTask(home, item.id, NOW).updated).toBe(NOW.toISOString());
    const due = task("Exactamente ahora", "inbox", NOW, NOW);
    const raw = JSON.parse(
      fs.readFileSync(path.join(home, "tasks.json"), "utf8"),
    );
    raw.items.find((entry: { id: string }) => entry.id === due.id).due =
      "2026-10-25T18:00:00Z";
    fs.writeFileSync(path.join(home, "tasks.json"), JSON.stringify(raw));
    expect(
      rescheduleOverdueTasks(home, new Date("2026-10-26T18:00:00Z"), NOW),
    ).toEqual([]);
    expect(() => rescheduleOverdueTasks(home, NOW, NOW)).toThrow(/future/);
  });
});
