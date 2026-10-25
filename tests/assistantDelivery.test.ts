import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import {
  DeliveryRejectedError,
  configuredChannels,
  type DeliveryChannel,
} from "../src/assistant/notify.js";
import {
  addReminder,
  cancelReminder,
  listReminders,
  markDelivered,
} from "../src/assistant/reminders.js";
import {
  deliveryStatus,
  inQuietHours,
  resolveDelivery,
  tick,
} from "../src/assistant/scheduler.js";
import { localParts, zonedTimeToUtc } from "../src/assistant/time.js";

const now = new Date("2026-10-23T12:00:00Z");
const due = new Date("2026-10-23T12:01:00Z");
const context = {
  timezone: "Europe/Madrid",
  locale: "es-ES",
  defaultTime: "09:00",
  now,
};
let home: string;
let config: AssistantConfig;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-delivery-"));
  config = writeConfig({ timezone: "Europe/Madrid" }, home);
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
const reminder = () =>
  addReminder(home, { text: "regar en un minuto" }, context);

describe("durable delivery", () => {
  it("claims before sending, across overlapping ticks, and advances only once", async () => {
    reminder();
    let sends = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const channel: DeliveryChannel = {
      name: "test",
      local: true,
      send: async () => {
        sends++;
        await gate;
      },
    };
    const first = tick(home, { now: due, config, channels: [channel] });
    await tick(home, { now: due, config, channels: [channel] });
    expect(sends).toBe(1);
    expect(deliveryStatus(home)[0]!.state).toBe("inflight");
    release();
    await first;
    expect(listReminders(home, { status: "all" })[0]!.fired).toBe(1);
  });

  it("retries explicit rejections without resending successful destinations", async () => {
    reminder();
    let success = 0,
      retries = 0;
    const channels: DeliveryChannel[] = [
      {
        name: "first",
        local: true,
        send: async () => {
          success++;
        },
      },
      {
        name: "second",
        local: true,
        send: async () => {
          if (++retries === 1) throw new DeliveryRejectedError("rate limit");
        },
      },
    ];
    expect(
      (await tick(home, { now: due, config, channels })).failed,
    ).toHaveLength(1);
    expect(listReminders(home)).toHaveLength(1);
    await tick(home, { now: due, config, channels });
    expect([success, retries]).toEqual([1, 2]);
    expect(listReminders(home)).toEqual([]);
  });

  it("keeps unknown outcomes visible until explicitly reconciled", async () => {
    reminder();
    let sends = 0;
    const channel: DeliveryChannel = {
      name: "remote",
      local: false,
      send: async () => {
        sends++;
        throw new Error("connection lost after acceptance");
      },
    };
    await tick(home, { now: due, config, channels: [channel] });
    await tick(home, {
      now: new Date(due.getTime() + 48 * 3600_000),
      config,
      channels: [channel],
    });
    expect(sends).toBe(1);
    expect(listReminders(home)).toHaveLength(1);
    const entry = deliveryStatus(home)[0]!;
    expect(entry.state).toBe("uncertain");
    resolveDelivery(home, entry.key, "sent");
    await tick(home, { now: due, config, channels: [channel] });
    expect(sends).toBe(1);
    expect(listReminders(home)).toEqual([]);
  });

  it("blocks damaged ledgers instead of losing deduplication", async () => {
    reminder();
    fs.writeFileSync(
      path.join(home, "deliveries.json"),
      JSON.stringify({ version: 1, items: [{ key: "broken" }] }),
    );
    await expect(
      tick(home, { now: due, config, channels: [] }),
    ).rejects.toThrow("Invalid delivery ledger");
  });

  it("does not reactivate reminders cancelled during a send", async () => {
    const item = reminder();
    const channel: DeliveryChannel = {
      name: "test",
      local: true,
      send: async () => {
        cancelReminder(home, item.id);
      },
    };
    await tick(home, { now: due, config, channels: [channel] });
    expect(
      listReminders(home, { status: "all" }).find(
        (entry) => entry.id === item.id,
      ),
    ).toMatchObject({ status: "cancelled", fired: 0 });
  });

  it("never marks a reminder done when no channels were attempted", async () => {
    reminder();
    expect(
      (await tick(home, { now: due, config, channels: [] })).delivered,
    ).toEqual([]);
    expect(listReminders(home)).toHaveLength(1);
  });

  it("deduplicates independent Node processes without relying on a scheduler lease", async () => {
    reminder();
    const module = pathToFileURL(
      path.resolve("src/assistant/scheduler.ts"),
    ).href;
    const script = `import {tick} from ${JSON.stringify(module)}; const home=process.argv[1]; await tick(home,{now:new Date('2026-10-23T12:01:00Z'),channels:[{name:'test',local:true,send:async()=>{console.log('sent');await new Promise(r=>setTimeout(r,100));}}]});`;
    const run = () =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "--input-type=module", "-e", script, home],
          { windowsHide: true, timeout: 15000 },
        );
        let output = "",
          errors = "";
        child.stdout.on("data", (data) => {
          output += String(data);
        });
        child.stderr.on("data", (data) => {
          errors += String(data);
        });
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve(output) : reject(new Error(errors)),
        );
      });
    expect(
      (await Promise.all([run(), run()])).join("").match(/sent/g),
    ).toHaveLength(1);
    expect(listReminders(home, { status: "all" })[0]!.fired).toBe(1);
  }, 20000);

  it("keeps Telegram recipients as separate ledger destinations", () => {
    config.channels.telegram = {
      tokenEnv: "HELEN_TELEGRAM_TOKEN",
      allowedChats: [11, 22],
    };
    config.channels.desktop = false;
    expect(configuredChannels(config).map((channel) => channel.name)).toEqual([
      "telegram:11",
      "telegram:22",
    ]);
  });
});

describe("quiet hours and calendar time", () => {
  it("defers ordinary reminders and permits only explicit urgent bypass", async () => {
    const regular = reminder();
    addReminder(home, { text: "urgente en un minuto", urgent: true }, context);
    config.quietHours = { start: "14:00", end: "15:00" };
    let sends = 0;
    const channels = [
      {
        name: "test",
        local: true,
        send: async () => {
          sends++;
        },
      },
    ];
    await tick(home, { now: due, config, channels });
    expect(sends).toBe(1);
    expect(listReminders(home)[0]!.id).toBe(regular.id);
    await tick(home, {
      now: new Date("2026-10-23T13:00:00Z"),
      config,
      channels,
    });
    expect(sends).toBe(2);
    config.quietHours = { start: "22:00", end: "08:00" };
    expect(inQuietHours(config, new Date("2026-10-23T21:00:00Z"))).toBe(true);
    expect(inQuietHours(config, new Date("2026-10-24T06:00:00Z"))).toBe(false);
  });

  it("chooses the earlier folded time and moves spring gaps forward", () => {
    expect(
      zonedTimeToUtc(2026, 10, 25, 2, 30, "Europe/Madrid").toISOString(),
    ).toBe("2026-10-25T00:30:00.000Z");
    expect(
      zonedTimeToUtc(2026, 3, 29, 2, 30, "Europe/Madrid").toISOString(),
    ).toBe("2026-03-29T01:30:00.000Z");
  });

  it.each([
    [
      "2026-03-28T07:00:00Z",
      "2026-03-28T08:30:00.000Z",
      "2026-03-29T07:30:00.000Z",
    ],
    [
      "2026-10-24T06:00:00Z",
      "2026-10-24T07:30:00.000Z",
      "2026-10-25T08:30:00.000Z",
    ],
  ])(
    "pins recurrence zone and preserves advance notice across DST from %s",
    (start, first, next) => {
      const item = addReminder(
        home,
        { text: "cita todos los días a las 10", leadMinutes: 30 },
        { ...context, now: new Date(start) },
      );
      expect(item.due).toBe(first);
      const updated = markDelivered(
        home,
        item.id,
        "America/New_York",
        new Date(first),
      );
      expect(updated.due).toBe(next);
      expect(
        localParts(
          new Date(Date.parse(updated.due) + 30 * 60_000),
          "Europe/Madrid",
        ).hour,
      ).toBe(10);
    },
  );

  it("parses advance notice without confusing it with the event's time", () => {
    const item = addReminder(
      home,
      { text: "dentista mañana a las 10 30 minutos antes" },
      context,
    );
    expect(item.text).toBe("dentista");
    expect(item.due).toBe("2026-10-24T07:30:00.000Z");
    expect(item.leadMinutes).toBe(30);
    expect(() =>
      addReminder(home, { text: "cita mañana", leadMinutes: -1 }, context),
    ).toThrow();
  });
});
