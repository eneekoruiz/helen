import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { addMemory, listMemory } from "../src/assistant/memory.js";
import { ASSISTANT_TOOLS } from "../src/assistant/mcpAssistant.js";
import {
  consoleChannel,
  deliver,
  desktopChannel,
  telegramChannel,
  wasDelivered,
  webhookChannel,
  type DeliveryChannel,
  type Notification,
} from "../src/assistant/notify.js";
import { addReminder, listReminders } from "../src/assistant/reminders.js";
import {
  acquireSchedulerLease,
  reminderNotification,
  tick,
} from "../src/assistant/scheduler.js";
import {
  createAssistantServer,
  tokenMatches,
} from "../src/assistant/server.js";
import {
  commandToText,
  handleUpdate,
  runTelegramBot,
} from "../src/assistant/telegram.js";
import { createMcpSession } from "../src/core/mcpTypes.js";

const NOW = new Date("2026-10-20T08:30:00Z");
let home: string;
let config: AssistantConfig;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-services-"));
  config = writeConfig(
    { owner: "Eneko", timezone: "Europe/Madrid", locale: "es-ES" },
    home,
  );
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

type Call = { url: string; body: string; headers: Headers };
function recorder(status = 200, reply: unknown = { ok: true, result: [] }) {
  const calls: Call[] = [];
  const fetcher = (async (url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: String(init?.body ?? ""),
      headers: new Headers(init?.headers),
    });
    return new Response(JSON.stringify(reply), { status });
  }) as typeof fetch;
  return { calls, fetcher };
}

const note = (text: string, sensitive = false): Notification => ({
  title: "HELEN",
  text,
  sensitive,
  kind: "reminder",
  lang: "es",
});

describe("delivery channels", () => {
  it("speaks each webhook format, and hides private text from remote channels", async () => {
    for (const format of ["json", "ntfy", "slack", "discord"] as const) {
      const { calls, fetcher } = recorder();
      const channel = webhookChannel(
        { url: "https://ntfy.sh/helen-test", format },
        fetcher,
      );
      await channel.send(note("Recordatorio: llamar a mamá"));
      await channel.send(
        note("Recordatorio: el código del portal es 4532", true),
      );
      expect(calls[0]!.body).toContain("llamar a mamá");
      expect(calls[1]!.body).not.toContain("4532");
      expect(calls[1]!.body).toContain("recordatorio privado");
      if (format === "ntfy")
        expect(calls[0]!.headers.get("title")).toBe("HELEN");
    }
  });

  it("sends Telegram messages to every allowed chat with the token from the environment", async () => {
    const { calls, fetcher } = recorder();
    const channel = telegramChannel(
      { tokenEnv: "HELEN_TG", allowedChats: [11, 22] },
      { HELEN_TG: "123:abc" },
      fetcher,
    );
    await channel.send(note("Recordatorio: regar"));
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.telegram.org/bot123:abc/sendMessage",
      "https://api.telegram.org/bot123:abc/sendMessage",
    ]);
    expect(JSON.parse(calls[1]!.body)).toMatchObject({
      chat_id: 22,
      text: "⏰ Recordatorio: regar",
    });
    const [missing] = await deliver(note("x"), [
      telegramChannel({ tokenEnv: "HELEN_TG", allowedChats: [1] }, {}, fetcher),
    ]);
    expect(missing).toMatchObject({ ok: false, skipped: true });
  });

  it("a desktop tool that is not installed is skipped, not a failure", async () => {
    const original = process.env.PATH;
    process.env.PATH = "";
    try {
      const [result] = await deliver(note("x"), [desktopChannel("linux")]);
      expect(result).toMatchObject({
        channel: "desktop",
        ok: false,
        skipped: true,
      });
    } finally {
      process.env.PATH = original;
    }
  });

  it("counts a delivery only when a person could see it", () => {
    expect(
      wasDelivered([
        { channel: "console", ok: true },
        { channel: "desktop", ok: false, skipped: true },
      ]),
    ).toBe(true);
    expect(
      wasDelivered([
        { channel: "console", ok: true },
        { channel: "webhook:ntfy", ok: false, error: "HTTP 500" },
      ]),
    ).toBe(false);
    expect(wasDelivered([{ channel: "webhook:ntfy", ok: true }])).toBe(true);
    expect(wasDelivered([])).toBe(false);
  });
});

describe("scheduler", () => {
  const sink = () => {
    const lines: string[] = [];
    return { lines, channel: consoleChannel((line) => lines.push(line)) };
  };

  it("delivers what is due, once, says when it is late, and moves recurring reminders on", async () => {
    addReminder(
      home,
      { text: "llamar a mamá a las 11" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    addReminder(
      home,
      { text: "tomar la pastilla todos los días a las 10:45" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    const { lines, channel } = sink();
    const at = new Date("2026-10-20T09:30:00Z"); // 11:30 in Madrid
    const first = await tick(home, { now: at, config, channels: [channel] });
    expect(first.delivered).toHaveLength(2);
    expect(lines.join("\n")).toMatch(
      /Recordatorio: llamar a mamá \(con retraso: era para hoy a las 11:00\)/,
    );
    expect(lines.join("\n")).toMatch(
      /tomar la pastilla .*todos los días a las 10:45/,
    );
    expect(
      (await tick(home, { now: at, config, channels: [channel] })).delivered,
    ).toHaveLength(0);
    expect(
      listReminders(home).map((reminder) => [reminder.text, reminder.due]),
    ).toEqual([["tomar la pastilla", "2026-10-21T08:45:00.000Z"]]);
  });

  it("keeps an uncertain remote send pending for explicit reconciliation", async () => {
    addReminder(
      home,
      { text: "regar las plantas en 5 minutos" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    const failing: DeliveryChannel = {
      name: "webhook:json",
      local: false,
      send: async () => {
        throw new Error("HTTP 503");
      },
    };
    const soon = new Date(NOW.getTime() + 6 * 60_000);
    expect(
      (await tick(home, { now: soon, config, channels: [failing] })).failed,
    ).toHaveLength(1);
    expect(listReminders(home)[0]!.failedAttempts).toBe(1);
    expect(
      (
        await tick(home, {
          now: new Date(NOW.getTime() + 25 * 3600_000),
          config,
          channels: [failing],
        })
      ).failed,
    ).toHaveLength(1);
    expect(listReminders(home)).toHaveLength(1);
  });

  it("sends the daily briefing once, after its time", async () => {
    const withBriefing = writeConfig(
      { ...config, briefing: { time: "08:00" } },
      home,
    );
    addReminder(
      home,
      { text: "dentista hoy a las 17" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    const { lines, channel } = sink();
    expect(
      (
        await tick(home, {
          now: new Date("2026-10-20T05:00:00Z"),
          config: withBriefing,
          channels: [channel],
        })
      ).briefing,
    ).toBeUndefined();
    await tick(home, { now: NOW, config: withBriefing, channels: [channel] });
    await tick(home, {
      now: new Date(NOW.getTime() + 60_000),
      config: withBriefing,
      channels: [channel],
    });
    const briefings = lines.filter((line) => line.includes("Buenos días"));
    expect(briefings).toHaveLength(1);
    expect(briefings[0]).toContain("17:00 dentista");
  });

  it("only one scheduler runs per home", () => {
    const release = acquireSchedulerLease(home);
    expect(() => acquireSchedulerLease(home)).toThrow(/already running/);
    release();
    const again = acquireSchedulerLease(home);
    again();
    // A lease left by a process that died is taken over.
    const dead = spawnSync(
      process.execPath,
      ["-e", "console.log(process.pid)"],
      { encoding: "utf8" },
    ).stdout.trim();
    fs.writeFileSync(
      path.join(home, "scheduler.pid"),
      JSON.stringify({
        pid: Number(dead),
        host: os.hostname(),
        started: NOW.toISOString(),
      }),
    );
    acquireSchedulerLease(home)();
  });

  it("reminder notifications carry no private text to remote channels", () => {
    const reminder = addReminder(
      home,
      { text: "el código del portal es 4532 mañana a las 9" },
      {
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
        now: NOW,
      },
    );
    const notification = reminderNotification(
      reminder,
      config,
      new Date(reminder.due),
    );
    expect(notification.sensitive).toBe(true);
  });
});

describe("HTTP server", () => {
  let base: string;
  let close: () => Promise<void>;
  const TOKEN = "test-token-0123456789";
  const start = async (
    extra: Partial<Parameters<typeof createAssistantServer>[0]> = {},
  ) => {
    const server = createAssistantServer({
      home,
      config,
      token: TOKEN,
      model: null,
      ...extra,
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => new Promise((resolve) => server.close(() => resolve()));
  };
  afterEach(async () => {
    await close?.();
  });
  const auth = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };

  it("compares tokens in constant time and only accepts the bearer form", () => {
    expect(tokenMatches(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(tokenMatches(`bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(tokenMatches(TOKEN, TOKEN)).toBe(false);
    expect(tokenMatches("Bearer wrong", TOKEN)).toBe(false);
    expect(tokenMatches(undefined, TOKEN)).toBe(false);
  });

  it("serves health openly, the API only with the token, and the chat page with a strict policy", async () => {
    await start();
    expect(await (await fetch(`${base}/health`)).json()).toEqual({
      ok: true,
      name: "helen-assistant",
    });
    expect((await fetch(`${base}/agenda`)).status).toBe(401);
    const chat = await fetch(`${base}/chat`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text: "Recuérdame llamar a mamá mañana a las 9" }),
    });
    expect(await chat.json()).toMatchObject({ intent: "remind", lang: "es" });
    expect(listReminders(home)).toHaveLength(1);
    const page = await fetch(`${base}/`);
    const policy = page.headers.get("content-security-policy")!;
    const html = await page.text();
    const nonce = /'nonce-([^']+)'/.exec(policy)![1]!;
    expect(policy).toContain("default-src 'none'");
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).not.toContain(TOKEN);
    expect(page.headers.get("x-frame-options")).toBe("DENY");
  });

  it("stores notes and reminders through the API", async () => {
    await start();
    const remember = await fetch(`${base}/remember`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text: "La bici está en el trastero" }),
    });
    expect(remember.status).toBe(201);
    expect(listMemory(home)[0]!.source).toBe("http");
    const remind = await fetch(`${base}/remind`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        text: "sacar la basura",
        when: "mañana a las 21",
      }),
    });
    expect(remind.status).toBe(201);
    const bad = await fetch(`${base}/remind`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text: "algo", when: "cuando sea" }),
    });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toContain("No entiendo cuándo");
  });

  it("protects calendar and review endpoints and imports a calendar idempotently", async () => {
    await start();
    expect((await fetch(`${base}/calendar`)).status).toBe(401);
    expect((await fetch(`${base}/review`)).status).toBe(401);
    const calendar =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-http-import\r\nDTSTART:20301023T100000Z\r\nSUMMARY:Revisar proyecto\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    const upload = () =>
      fetch(`${base}/calendar`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ calendar }),
      });
    expect(await (await upload()).json()).toMatchObject({ reminders: 1 });
    expect(await (await upload()).json()).toMatchObject({ skipped: 1 });
    const exported = await fetch(`${base}/calendar`, { headers: auth });
    expect(exported.headers.get("content-type")).toContain("text/calendar");
    expect(await exported.text()).toContain("SUMMARY:Revisar proyecto");
    expect(
      await (await fetch(`${base}/review`, { headers: auth })).json(),
    ).toHaveProperty("pendingTasks");
  });
  it("applies HTTP privacy settings to creation responses and collection reads", async () => {
    const privateConfig = { ...config, privacy: { showSensitiveOn: [] } };
    await start({ config: privateConfig });
    for (const endpoint of ["remember", "remind"]) {
      const response = await fetch(`${base}/${endpoint}`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          text: "el código del portal es 4532",
          when: "mañana a las 9",
        }),
      });
      expect(response.status).toBe(201);
      expect(await response.text()).not.toContain("4532");
    }
    expect(
      await (await fetch(`${base}/reminders`, { headers: auth })).text(),
    ).not.toContain("4532");
  });

  it("locks out guessing, limits the rate and the body size", async () => {
    await start({ rateLimit: 1000 });
    for (let i = 0; i < 10; i += 1)
      expect(
        (
          await fetch(`${base}/agenda`, {
            headers: { Authorization: "Bearer nope" },
          })
        ).status,
      ).toBe(401);
    expect((await fetch(`${base}/agenda`, { headers: auth })).status).toBe(429); // even the right token, for a while
    await close();
    await start({ rateLimit: 3 });
    const statuses = [];
    for (let i = 0; i < 5; i += 1)
      statuses.push((await fetch(`${base}/agenda`, { headers: auth })).status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.at(-1)).toBe(429);
    await close();
    await start();
    const big = await fetch(`${base}/chat`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text: "x".repeat(70 * 1024) }),
    }).catch(() => null);
    expect(big === null || big.status === 413).toBe(true);
  });

  it("answers Alexa only through the verifier, with 400 when verification fails", async () => {
    await start();
    expect(
      (await fetch(`${base}/alexa`, { method: "POST", body: "{}" })).status,
    ).toBe(404);
    await close();
    await start({
      verifyAlexa: async () => {
        throw new Error("bad signature");
      },
    });
    expect(
      (await fetch(`${base}/alexa`, { method: "POST", body: "{}" })).status,
    ).toBe(400);
    await close();
    await start({
      verifyAlexa: async (raw) => JSON.parse(raw.toString()),
    });
    const response = await fetch(`${base}/alexa`, {
      method: "POST",
      body: JSON.stringify({
        version: "1.0",
        request: {
          type: "LaunchRequest",
          timestamp: new Date().toISOString(),
          locale: "es-ES",
        },
      }),
    });
    expect((await response.json()).response.outputSpeech.text).toContain(
      "Hola, Eneko",
    );
  });
});

describe("Telegram bot", () => {
  it("maps commands to sentences", () => {
    expect(commandToText("/agenda", "es")).toBe("qué tengo hoy");
    expect(commandToText("/compra leche y pan", "es")).toBe(
      "añade leche y pan a la lista de la compra",
    );
    expect(
      commandToText("/recuerdame@HelenBot mañana a las 9 llamar", "es"),
    ).toBe("recuérdame mañana a las 9 llamar");
    expect(commandToText("hola", "es")).toBe("hola");
  });

  it("answers allowed chats and tells strangers only how to be allowed", async () => {
    const telegram = writeConfig(
      {
        ...config,
        channels: {
          ...config.channels,
          telegram: { tokenEnv: "HELEN_TG", allowedChats: [42] },
        },
      },
      home,
    );
    addMemory(home, { text: "El wifi de casa se llama Movistar_5G" });
    const { calls, fetcher } = recorder(200, { ok: true, result: {} });
    const stranger = await handleUpdate(
      {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 7 },
          text: "¿cuál es el wifi de casa?",
        },
      },
      { home, config: telegram, fetcher, token: "t", model: null },
    );
    expect(stranger).toContain("helen assistant telegram allow 7");
    expect(stranger).not.toContain("Movistar");
    const owner = await handleUpdate(
      {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: 42, type: "private" },
          from: { id: 42 },
          text: "¿cuál es el wifi de casa?",
        },
      },
      { home, config: telegram, fetcher, token: "t", model: null },
    );
    expect(owner).toContain("Movistar_5G");
    expect(JSON.parse(calls[1]!.body)).toMatchObject({
      chat_id: 42,
      reply_to_message_id: 2,
    });
  });

  it("long-polls, answers, remembers the offset and stops when asked", async () => {
    const telegram = writeConfig(
      {
        ...config,
        channels: {
          ...config.channels,
          telegram: { tokenEnv: "HELEN_TG", allowedChats: [42] },
        },
      },
      home,
    );
    const controller = new AbortController();
    const sent: unknown[] = [];
    let polls = 0;
    const fetcher = (async (url: string | URL, init?: RequestInit) => {
      if (String(url).endsWith("/getUpdates")) {
        polls += 1;
        if (polls === 1)
          return new Response(
            JSON.stringify({
              ok: true,
              result: [
                {
                  update_id: 100,
                  message: {
                    message_id: 1,
                    chat: { id: 42, type: "private" },
                    from: { id: 42 },
                    text: "recuérdame mañana a las 9 llamar a mamá",
                  },
                },
              ],
            }),
          );
        if (!init?.signal?.aborted)
          await new Promise<void>((resolve) =>
            init?.signal?.addEventListener("abort", () => resolve(), {
              once: true,
            }),
          );
        return new Response(JSON.stringify({ ok: true, result: [] }));
      }
      sent.push(JSON.parse(String(init?.body)));
      controller.abort();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    }) as typeof fetch;
    await runTelegramBot({
      home,
      config: telegram,
      env: { HELEN_TG: "123:abc" },
      fetcher,
      signal: controller.signal,
      model: null,
    });
    expect(sent).toHaveLength(1);
    expect(listReminders(home)[0]!.source).toBe("telegram");
    expect(
      JSON.parse(
        fs.readFileSync(path.join(home, "telegram-state.json"), "utf8"),
      ),
    ).toEqual({ offset: 101 });
  });
});

describe("MCP tools for coding agents", () => {
  const run = (name: string, args: Record<string, unknown>) =>
    ASSISTANT_TOOLS.find((tool) => tool.definition.name === name)!.run(args, {
      cwd: path.join(home, "my-project"),
      session: createMcpSession(),
    });
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env.HELEN_HOME;
    process.env.HELEN_HOME = home;
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.HELEN_HOME;
    else process.env.HELEN_HOME = previous;
  });

  it("agents read only what was shared with them, never private items", () => {
    addMemory(home, {
      text: "Prefiero pnpm a npm en todos los proyectos",
      visibility: "agents",
    });
    addMemory(home, {
      text: "Mi pnpm favorito es el de casa",
      visibility: "private",
    });
    addMemory(home, {
      text: "El código del portal pnpm es 4532",
      visibility: "agents",
    });
    const found = run("helen_memory_search", { query: "pnpm" }) as {
      results: Array<{ title: string }>;
    };
    expect(found.results.map((result) => result.title)).toEqual([
      "Prefiero pnpm a npm en todos los proyectos",
    ]);
  });

  it("what agents save is shared with agents and tagged with the project", () => {
    const saved = run("helen_memory_add", {
      text: "En este repo se usan tabs",
      project: true,
    }) as { saved: string; visibility: string };
    expect(saved.visibility).toBe("agents");
    expect(listMemory(home)[0]).toMatchObject({
      project: "my-project",
      source: "mcp",
    });
    const reminder = run("helen_remind", {
      what: "revisar la PR de release",
      when: "mañana a las 10",
    }) as { scheduled: string };
    expect(listReminders(home)[0]).toMatchObject({
      id: reminder.scheduled,
      source: "mcp",
    });
  });
});
