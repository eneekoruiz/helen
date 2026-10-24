import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAssistantBackup,
  recoverInterruptedRestore,
  restoreAssistantBackup,
} from "../src/assistant/backup.js";
import { diagnoseAssistant } from "../src/assistant/doctor.js";
import {
  readConfig,
  writeConfig,
  writePrivate,
} from "../src/assistant/home.js";
import { addMemory, listMemory } from "../src/assistant/memory.js";
import {
  addReminder,
  attachAlexaToken,
  listReminders,
} from "../src/assistant/reminders.js";
import { weeklyReview } from "../src/assistant/review.js";
import { acquireSchedulerLease } from "../src/assistant/scheduler.js";
import { addTasks, listTasks } from "../src/assistant/tasks.js";

const roots: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "helen-recovery-"));
  roots.push(root);
  return {
    root,
    home: path.join(root, "home"),
    file: path.join(root, "backup.json"),
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});
const past = new Date("2026-10-01T10:00:00Z");
const now = new Date("2026-10-23T10:00:00Z");
const context = {
  timezone: "Europe/Madrid",
  locale: "es-ES",
  defaultTime: "09:00",
  now: past,
};

describe("assistant recovery", () => {
  it("backs up sanitized delivery evidence and conservatively merges it on another machine", () => {
    const { home, file, root } = fixture();
    const occurrence = "reminder:r123456:2026-10-24T09:00:00.000Z";
    const key = JSON.stringify([occurrence, "telegram"]);
    writePrivate(
      path.join(home, "deliveries.json"),
      JSON.stringify({
        version: 1,
        items: [
          {
            key,
            occurrence,
            channel: "telegram",
            state: "inflight",
            updated: now.toISOString(),
            error: "password=hidden-secret",
          },
        ],
      }),
    );
    createAssistantBackup(home, file, now);
    expect(fs.readFileSync(file, "utf8")).not.toContain("hidden-secret");
    const target = path.join(root, "new-machine");
    restoreAssistantBackup(target, file, now);
    let entries = JSON.parse(
      fs.readFileSync(path.join(target, "deliveries.json"), "utf8"),
    ).items;
    expect(entries[0].state).toBe("uncertain");
    entries[0].state = "sent";
    writePrivate(
      path.join(target, "deliveries.json"),
      JSON.stringify({ version: 1, items: entries }),
    );
    restoreAssistantBackup(target, file, now);
    entries = JSON.parse(
      fs.readFileSync(path.join(target, "deliveries.json"), "utf8"),
    ).items;
    expect(entries[0].state).toBe("sent");
  });
  it("blocks normal writes after process death and recovers the original files idempotently", () => {
    const { home } = fixture();
    addTasks(home, { text: "Original before restore" });
    const stage = `.restore-${crypto.randomUUID()}`;
    const previous = `restore-previous-${crypto.randomUUID()}`;
    fs.mkdirSync(path.join(home, stage));
    fs.mkdirSync(path.join(home, previous));
    fs.renameSync(
      path.join(home, "tasks.json"),
      path.join(home, previous, "tasks.json"),
    );
    writePrivate(
      path.join(home, "tasks.json"),
      JSON.stringify({ version: 1, items: [] }),
    );
    // A process died after swapping tasks and moving memory, before the replacement was installed.
    fs.mkdirSync(path.join(home, stage, "memory"));
    fs.renameSync(
      path.join(home, "memory"),
      path.join(home, previous, "memory"),
    );
    writePrivate(
      path.join(home, ".restore-transaction.json"),
      JSON.stringify({
        version: 1,
        stage,
        previous,
        originals: ["tasks.json", "memory"],
      }),
    );
    expect(() => addTasks(home, { text: "Must not write" })).toThrow(
      /interrupted restore/,
    );
    expect(fs.existsSync(path.join(home, "memory"))).toBe(false);
    expect(recoverInterruptedRestore(home)).toBe(true);
    expect(listTasks(home).map((item) => item.text)).toEqual([
      "Original before restore",
    ]);
    expect(fs.existsSync(path.join(home, stage, "tasks.json"))).toBe(true);
    expect(recoverInterruptedRestore(home)).toBe(false);
    expect(() => addTasks(home, { text: "Writes resumed" })).not.toThrow();
  });
  it("rejects traversal in transaction markers before recovery mutations", () => {
    const { home } = fixture();
    addTasks(home, { text: "Keep" });
    writePrivate(
      path.join(home, ".restore-transaction.json"),
      JSON.stringify({
        version: 1,
        stage: "../outside",
        previous: `restore-previous-${crypto.randomUUID()}`,
        originals: ["tasks.json"],
      }),
    );
    expect(() => recoverInterruptedRestore(home)).toThrow();
    expect(listTasks(home)[0]?.text).toBe("Keep");
    expect(fs.existsSync(path.join(home, ".restore-transaction.json"))).toBe(
      true,
    );
  });
  it("round trips memory and tasks, omits credentials and cancels historical reminders", () => {
    const { home, file } = fixture();
    writeConfig(
      {
        provider: { type: "command", command: ["cli", "password=secret"] },
        channels: { webhook: { url: "https://example.com/secret" } },
      },
      home,
    );
    const note = addMemory(home, {
      text: "Prefiero respuestas breves",
      now: past,
    });
    addMemory(home, { text: "password=hunter234", allowSecret: true });
    const task = addTasks(home, { text: "Renovar carnet", now: past })
      .added[0]!;
    addReminder(home, { text: "Llamar", when: "mañana a las 9" }, context);
    writePrivate(
      path.join(home, "conversations.json"),
      '{"items":[{"text":"ephemeral"}]}',
    );
    const result = createAssistantBackup(home, file, now);
    const backupText = fs.readFileSync(file, "utf8");
    expect(backupText).not.toContain("password");
    expect(backupText).not.toContain("example.com");
    expect(backupText).not.toContain("ephemeral");
    expect(result.notes).toBe(1);
    addTasks(home, { text: "After backup" });
    const restored = restoreAssistantBackup(home, file, now);
    expect(listMemory(home).map((item) => item.id)).toEqual([note.id]);
    expect(listTasks(home).map((item) => item.id)).toEqual([task.id]);
    expect(readConfig(home).provider).toBeUndefined();
    expect(listReminders(home, { status: "all" })[0]?.status).toBe("cancelled");
    expect(restored.cancelledPastReminders).toBe(1);
    expect(fs.existsSync(path.join(restored.previous, "tasks.json"))).toBe(
      true,
    );
  });
  it("fully rejects tampered ids before changing current data", () => {
    const { home, file } = fixture();
    addMemory(home, { text: "Original" });
    createAssistantBackup(home, file);
    const before = fs.readFileSync(
      path.join(home, "memory", fs.readdirSync(path.join(home, "memory"))[0]!),
      "utf8",
    );
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    data.memory[0].id = "../../outside";
    fs.writeFileSync(file, JSON.stringify(data));
    expect(() => restoreAssistantBackup(home, file)).toThrow();
    expect(
      fs.readFileSync(
        path.join(
          home,
          "memory",
          fs.readdirSync(path.join(home, "memory"))[0]!,
        ),
        "utf8",
      ),
    ).toBe(before);
  });
  it("refuses restore while a scheduler owns the home", () => {
    const { home, file } = fixture();
    createAssistantBackup(home, file);
    const release = acquireSchedulerLease(home);
    try {
      expect(() => restoreAssistantBackup(home, file)).toThrow(/scheduler/);
    } finally {
      release();
    }
  });
  it("rolls back files if a rename fails halfway", () => {
    const { home, file } = fixture();
    addTasks(home, { text: "Before" });
    createAssistantBackup(home, file);
    addTasks(home, { text: "Keep this" });
    const rename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (
        String(from).includes(".restore-") &&
        String(from).endsWith("tasks.json")
      )
        throw new Error("injected rename failure");
      return rename(from, to);
    });
    expect(() => restoreAssistantBackup(home, file)).toThrow(
      "injected rename failure",
    );
    expect(listTasks(home).map((item) => item.text)).toEqual([
      "Before",
      "Keep this",
    ]);
    expect(fs.existsSync(path.join(home, "scheduler.pid"))).toBe(false);
  });
  it("does not overwrite an existing backup", () => {
    const { home, file } = fixture();
    createAssistantBackup(home, file);
    expect(() => createAssistantBackup(home, file)).toThrow(/exists/);
  });
  it("preserves calendar identities and current delivery evidence across restore", () => {
    const { home, file } = fixture();
    const reminder = addReminder(
      home,
      { text: "Future", when: "mañana a las 9" },
      { ...context, now },
    );
    writePrivate(
      path.join(home, "calendar-imports.json"),
      JSON.stringify({
        version: 1,
        items: [{ uid: "calendar-source", id: reminder.id, kind: "VEVENT" }],
      }),
    );
    createAssistantBackup(home, file, now);
    const ledger = '{"version":1,"items":[]}';
    writePrivate(path.join(home, "deliveries.json"), ledger);
    restoreAssistantBackup(home, file, now);
    expect(listReminders(home)[0]?.due).toBe(reminder.due);
    expect(fs.readFileSync(path.join(home, "deliveries.json"), "utf8")).toBe(
      ledger,
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(home, "calendar-imports.json"), "utf8"),
      ).items[0].uid,
    ).toBe("calendar-source");
  });
  it("rejects corrupt collection envelopes instead of backing up an empty collection", () => {
    const { home, file } = fixture();
    writePrivate(path.join(home, "tasks.json"), '{"unexpected":[]}');
    expect(() => createAssistantBackup(home, file)).toThrow();
    expect(fs.existsSync(file)).toBe(false);
  });
  it("closes past-due calendar reservations before they can reconstruct a notification", () => {
    const { home, file } = fixture();
    const reminder = addReminder(
      home,
      {
        text: "Old imported reminder",
        when: "mañana a las 9",
        source: "calendar",
      },
      context,
    );
    writePrivate(
      path.join(home, "calendar-imports.json"),
      JSON.stringify({
        version: 1,
        items: [
          {
            uid: "interrupted-import",
            id: reminder.id,
            kind: "VEVENT",
            pending: reminder,
          },
        ],
      }),
    );
    createAssistantBackup(home, file, now);
    restoreAssistantBackup(home, file, now);
    const index = JSON.parse(
      fs.readFileSync(path.join(home, "calendar-imports.json"), "utf8"),
    );
    expect(index.items[0].pending.status).toBe("cancelled");
  });
});

describe("weekly review", () => {
  it("reports overdue/stale/failed work while filtering private text", () => {
    const { home } = fixture();
    addTasks(home, { text: "Renovar carnet", now: past });
    const visible = addReminder(
      home,
      { text: "Visible", when: "mañana a las 9" },
      context,
    );
    attachAlexaToken(home, visible.id, "private-alexa-token");
    addReminder(
      home,
      { text: "Confidential", sensitive: true, when: "mañana a las 9" },
      context,
    );
    const report = weeklyReview(home, now);
    expect(report.staleTasks).toHaveLength(1);
    expect(report.overdueReminders).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain("Confidential");
    expect(JSON.stringify(report)).not.toContain("private-alexa-token");
  });
});

describe("assistant doctor", () => {
  it("probes health only and reports missing credentials without leaking config", async () => {
    const { home } = fixture();
    writeConfig(
      {
        provider: { type: "anthropic", model: "configured-model" },
        channels: { telegram: { allowedChats: [] } },
      },
      home,
    );
    const probe = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ ok: true, name: "helen-assistant" }), {
          status: 200,
        }),
    );
    const checks = await diagnoseAssistant(home, { env: {}, fetch: probe });
    expect(checks.find((item) => item.name === "model")?.status).toBe("error");
    expect(
      checks.find((item) => item.name === "telegram-allowlist")?.status,
    ).toBe("error");
    expect(checks.find((item) => item.name === "server")?.status).toBe("ok");
    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe.mock.calls[0]?.[0]).toMatch(/\/health$/);
  });
  it("reports invalid configuration and invalid tunnels without throwing secrets", async () => {
    const { home } = fixture();
    writePrivate(path.join(home, "config.json"), "not JSON secret");
    const checks = await diagnoseAssistant(home);
    expect(JSON.stringify(checks)).not.toContain("secret");
    expect(checks.some((item) => item.status === "error")).toBe(true);
    fs.unlinkSync(path.join(home, "config.json"));
    const checked = await diagnoseAssistant(home, {
      tunnel: "not a url",
      fetch: async () => {
        throw new Error("offline");
      },
    });
    expect(checked.find((item) => item.name === "tunnel")?.status).toBe(
      "error",
    );
  });
});
