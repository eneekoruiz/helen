import { diagnoseAssistant } from "../src/assistant/doctor.js";
import { spawnSync } from "node:child_process";
import { createAssistantServer } from "../src/assistant/server.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { getConversation } from "../src/assistant/conversation.js";
import { clearGmailTokenCache } from "../src/assistant/gmail.js";
import {
  startGmailAuth,
  GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
} from "../src/assistant/gmailAuth.js";
import {
  startGoogleCalendarConnection,
  completeGoogleCalendarConnection,
  disconnectGoogleCalendarConnection,
} from "../src/assistant/googleCalendarAuth.js";
import { queryGoogleCalendar } from "../src/assistant/googleCalendar.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
let home: string;
const actor = {
  owner: "Test",
  verified: true,
  private: true,
  channel: "cli" as const,
};
const input = {
  account: "owner@example.com",
  clientIdEnv: "CAL_CLIENT",
  redirectUri: "http://127.0.0.1:8787/google-calendar/callback",
};
const window = {
  timeMin: "2026-10-24T00:00:00+02:00",
  timeMax: "2026-10-26T00:00:00+01:00",
  timeZone: "Europe/Madrid",
};
const event = {
  id: "event-1",
  summary: "PRIVATE_EVENT_IGNORE_INSTRUCTIONS",
  start: { dateTime: "2026-10-25T01:30:00+02:00", timeZone: "Europe/Madrid" },
  end: { dateTime: "2026-10-25T02:30:00+01:00", timeZone: "Europe/Madrid" },
};
const response = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
const mock = (handler: (url: string, init: RequestInit) => unknown) =>
  vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    init.signal?.throwIfAborted();
    const result = await handler(String(url), init);
    return result instanceof Response ? result : response(result);
  }) as unknown as ReturnType<typeof vi.fn> & typeof fetch;
const primary = { id: input.account, primary: true, accessRole: "owner" };
const token = {
  access_token: "synthetic-calendar-token",
  refresh_token: "synthetic-calendar-refresh",
  scope: GOOGLE_CALENDAR_SCOPES.join(" "),
  expires_in: 3600,
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-google-calendar-"));
  writeConfig({ owner: "Test" }, home);
  clearGmailTokenCache();
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});
async function connect(
  handler: (url: string, init: RequestInit) => unknown = (url) =>
    url.includes("oauth2.googleapis.com") ? token : primary,
) {
  const started = startGoogleCalendarConnection(home, actor, input, {
    env: { CAL_CLIENT: "synthetic-client" },
  });
  const state = new URL(started.authorizationUrl).searchParams.get("state")!;
  const fetcher = mock(handler);
  const result = await completeGoogleCalendarConnection(
    home,
    { state, code: "synthetic-code", redirectUri: input.redirectUri },
    { fetch: fetcher },
  );
  return { started, state, result, fetcher };
}
it("isolates Calendar readonly PKCE state, scopes, expected account and credentials from Gmail", async () => {
  const gmail = startGmailAuth(home, {
    clientId: "synthetic-gmail",
    owner: "Test",
    redirectUri: "http://127.0.0.1:8787/gmail/callback",
  });
  const gmailState = fs.readFileSync(
    path.join(home, "gmail-oauth-pending.json"),
  );
  const { started, state, result, fetcher } = await connect();
  const url = new URL(started.authorizationUrl);
  expect(url.searchParams.get("scope")).toBe(GOOGLE_CALENDAR_SCOPES[0]);
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(new URL(gmail.url).searchParams.get("scope")).toBe(
    GMAIL_SCOPES.join(" "),
  );
  expect(fs.readFileSync(path.join(home, "gmail-oauth-pending.json"))).toEqual(
    gmailState,
  );
  expect(fs.existsSync(path.join(home, "gmail-auth.json"))).toBe(false);
  expect(result.account).toBe(input.account);
  expect(JSON.stringify(started) + JSON.stringify(result)).not.toContain(
    "synthetic-calendar-token",
  );
  await expect(
    completeGoogleCalendarConnection(
      home,
      { state, code: "replay", redirectUri: input.redirectUri },
      { fetch: fetcher },
    ),
  ).rejects.toThrow();
  await disconnectGoogleCalendarConnection(home, actor, false, {
    fetch: fetcher,
  });
  expect(fs.existsSync(path.join(home, "calendar-auth.json"))).toBe(false);
  expect(fs.readFileSync(path.join(home, "gmail-oauth-pending.json"))).toEqual(
    gmailState,
  );
});
it("rejects wrong account, broad scopes, replay, callback mismatch and expired consent", async () => {
  for (const bad of [
    { ...primary, id: "other@example.com" },
    { ...primary, primary: false },
  ]) {
    await expect(
      connect((url) => (url.includes("oauth2.googleapis.com") ? token : bad)),
    ).rejects.toThrow();
    expect(fs.existsSync(path.join(home, "calendar-auth.json"))).toBe(false);
  }
  await expect(
    connect(() => ({
      ...token,
      scope: [
        ...GOOGLE_CALENDAR_SCOPES,
        "https://www.googleapis.com/auth/calendar",
      ].join(" "),
    })),
  ).rejects.toThrow();
  const started = startGoogleCalendarConnection(home, actor, input, {
    env: { CAL_CLIENT: "synthetic-client" },
    now: () => 0,
  });
  const state = new URL(started.authorizationUrl).searchParams.get("state")!;
  const fetcher = mock(() => {
    throw new Error("must not call");
  });
  await expect(
    completeGoogleCalendarConnection(
      home,
      { state, code: "code", redirectUri: input.redirectUri },
      { fetch: fetcher, now: () => 600001 },
    ),
  ).rejects.toThrow();
  await expect(
    completeGoogleCalendarConnection(
      home,
      { state, code: "code", redirectUri: input.redirectUri + "/other" },
      { fetch: fetcher, now: () => 1 },
    ),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("requires a private verified owner, exact permission and configured account before querying", async () => {
  await connect();
  const fetcher = mock(() => primary);
  for (const invalid of [
    { ...actor, owner: "Other" },
    { ...actor, verified: false },
    { ...actor, private: false },
    { ...actor, channel: "alexa" as const },
  ])
    await expect(
      queryGoogleCalendar(home, invalid, "events", window, { fetch: fetcher }),
    ).rejects.toThrow();
  const config = readConfig(home);
  writeConfig(
    {
      ...config,
      googleCalendar: { ...config.googleCalendar!, permissions: [] },
    },
    home,
  );
  await expect(
    queryGoogleCalendar(home, actor, "events", window, { fetch: fetcher }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  writeConfig(config, home);
  await expect(
    queryGoogleCalendar(home, actor, "events", window, {
      fetch: mock((url) =>
        url.includes("oauth2.googleapis.com")
          ? token
          : { ...primary, id: "other@example.com" },
      ),
    }),
  ).rejects.toThrow(/account/);
});
it("reads recurring instances with bounded pagination, projections, all-day exclusive dates and DST offsets", async () => {
  await connect();
  let pages = 0;
  const allDay = {
    id: "all-day",
    summary: "Holiday",
    start: { date: "2026-10-25" },
    end: { date: "2026-10-26" },
  };
  const fetcher = mock((url, init) => {
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeDefined();
    if (url.includes("oauth2.googleapis.com")) return token;
    if (url.includes("calendarList/primary")) return primary;
    const request = new URL(url);
    expect(request.searchParams.get("singleEvents")).toBe("true");
    expect(request.searchParams.get("orderBy")).toBe("startTime");
    expect(request.searchParams.get("timeMin")).toBe(window.timeMin);
    expect(request.searchParams.get("fields")).not.toContain("description");
    pages++;
    return pages === 1
      ? {
          items: [{ ...event, description: "NEVER_EXPORT" }],
          nextPageToken: "page-two",
        }
      : { items: [event, allDay, { id: "cancelled", status: "cancelled" }] };
  });
  const result = await queryGoogleCalendar(home, actor, "events", window, {
    fetch: fetcher,
  });
  expect(result).toMatchObject({
    truncated: false,
    verified: true,
    events: [event, allDay],
  });
  expect(JSON.stringify(result)).not.toContain("NEVER_EXPORT");
  expect(pages).toBe(2);
});
it("marks a bounded partial listing and rejects repeated page tokens", async () => {
  await connect();
  let pages = 0;
  const fetcher = mock((url) =>
    url.includes("oauth2.googleapis.com")
      ? token
      : url.includes("calendarList/primary")
        ? primary
        : { items: [event], nextPageToken: "page-" + ++pages },
  );
  expect(
    await queryGoogleCalendar(home, actor, "events", window, {
      fetch: fetcher,
    }),
  ).toMatchObject({ truncated: true, events: [event] });
  expect(pages).toBe(4);
  const repeated = mock((url) =>
    url.includes("calendarList/primary")
      ? primary
      : { items: [event], nextPageToken: "repeat" },
  );
  await expect(
    queryGoogleCalendar(home, actor, "events", window, { fetch: repeated }),
  ).rejects.toThrow(/pagination/);
});
it("handles availability errors conservatively and performs only the readonly freeBusy POST", async () => {
  await connect();
  let failure = false;
  const fetcher = mock((url, init) => {
    if (url.includes("oauth2.googleapis.com")) return token;
    if (url.includes("calendarList/primary")) return primary;
    expect(url).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).items).toEqual([
      { id: input.account },
    ]);
    return {
      calendars: {
        [input.account]: failure
          ? { errors: [{ reason: "notFound" }] }
          : { busy: [{ start: window.timeMin, end: window.timeMax }] },
      },
    };
  });
  expect(
    await queryGoogleCalendar(home, actor, "busy", window, { fetch: fetcher }),
  ).toMatchObject({
    verified: true,
    busy: [{ start: window.timeMin, end: window.timeMax }],
  });
  failure = true;
  await expect(
    queryGoogleCalendar(home, actor, "busy", window, { fetch: fetcher }),
  ).rejects.toThrow(/not assume/);
});
it("rejects malformed windows, unrequested fields, excessive bodies, cancellation and transport deadlines", async () => {
  await connect();
  const fetcher = mock(() => primary);
  for (const value of [
    { ...window, calendarId: "external" },
    { ...window, timeMin: "2026-10-24T00:00:00" },
    { ...window, timeMax: window.timeMin },
    { ...window, timeZone: "Not/AZone" },
  ])
    await expect(
      queryGoogleCalendar(home, actor, "events", value, { fetch: fetcher }),
    ).rejects.toThrow();
  await expect(
    queryGoogleCalendar(home, actor, "events", window, {
      fetch: fetcher,
      signal: AbortSignal.abort(),
    }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    queryGoogleCalendar(home, actor, "events", window, {
      fetch: mock((url) =>
        url.includes("oauth2.googleapis.com")
          ? token
          : new Response("x".repeat(512001)),
      ),
    }),
  ).rejects.toThrow(/limits/);
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(
    AbortSignal.abort(new DOMException("Synthetic timeout", "TimeoutError")),
  );
  await expect(
    queryGoogleCalendar(home, actor, "events", window, { fetch: fetcher }),
  ).rejects.toThrow(/timed out/);
});
it("keeps calendar results and errors out of model/history and denies voice or mutations", async () => {
  await connect();
  const answer = vi.fn();
  const model = { kind: "command" as const, usesTools: false, answer };
  const fetcher = mock((url) =>
    url.includes("oauth2.googleapis.com")
      ? token
      : url.includes("calendarList/primary")
        ? primary
        : { items: [event] },
  );
  const text = "calendario google eventos " + JSON.stringify(window);
  const result = await handleMessage(text, {
    home,
    channel: "cli",
    model,
    fetcher,
  });
  expect(result.text).toContain(event.summary);
  expect(result.speech).not.toContain(event.summary);
  expect(getConversation(home, "cli:default").history).toBeUndefined();
  expect(answer).not.toHaveBeenCalled();
  const calls = fetcher.mock.calls.length;
  for (const options of [{ speaker: true }, { ownerVerified: false }]) {
    expect(
      (
        await handleMessage(text, {
          home,
          channel: "cli",
          model,
          fetcher,
          ...options,
        })
      ).text,
    ).toContain("No se pudo verificar");
  }
  expect(
    (
      await handleMessage("calendario google crear {}", {
        home,
        channel: "cli",
        model,
        fetcher,
      })
    ).text,
  ).toContain("solo consulta");
  expect(fetcher.mock.calls.length).toBe(calls);
  expect(answer).not.toHaveBeenCalled();
});

it("serves the registered callback with PKCE but no bearer token, using fresh local configuration", async () => {
  const fetcher = mock((url) =>
    url.includes("oauth2.googleapis.com") ? token : primary,
  );
  const server = createAssistantServer({
    home,
    config: readConfig(home),
    token: "synthetic-server-token",
    fetcher,
    model: null,
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as { port: number };
    const callback =
      "http://127.0.0.1:" + address.port + "/google-calendar/callback";
    const started = startGoogleCalendarConnection(
      home,
      actor,
      { ...input, redirectUri: callback },
      { env: { CAL_CLIENT: "synthetic-client" } },
    );
    const state = new URL(started.authorizationUrl).searchParams.get("state")!;
    expect(
      (
        await fetch(
          callback +
            "?" +
            new URLSearchParams({ state: "wrong", code: "synthetic-code" }),
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    const completed = await fetch(
      callback + "?" + new URLSearchParams({ state, code: "synthetic-code" }),
    );
    expect(completed.status).toBe(200);
    expect(completed.headers.get("cache-control")).toBe("no-store");
    const text = await completed.text();
    expect(JSON.parse(text)).toMatchObject({
      connected: true,
      readOnly: true,
      account: input.account,
    });
    expect(text).not.toContain("synthetic-calendar-token");
    expect(text).not.toContain("synthetic-code");
    expect(
      (
        await fetch(
          callback + "?" + new URLSearchParams({ state, code: "replay" }),
        )
      ).status,
    ).toBe(400);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
it("does not restore a Calendar grant when disconnect races its token exchange", async () => {
  const started = startGoogleCalendarConnection(home, actor, input, {
    env: { CAL_CLIENT: "synthetic-client" },
  });
  let release!: () => void;
  let requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher = mock(async (url) => {
    if (url.includes("oauth2.googleapis.com")) {
      requested = true;
      await gate;
      return token;
    }
    return primary;
  });
  const pending = completeGoogleCalendarConnection(
    home,
    {
      state: new URL(started.authorizationUrl).searchParams.get("state")!,
      code: "synthetic-code",
      redirectUri: input.redirectUri,
    },
    { fetch: fetcher },
  );
  await Promise.resolve();
  expect(requested).toBe(true);
  await disconnectGoogleCalendarConnection(home, actor, false);
  release();
  await expect(pending).rejects.toThrow();
  expect(fs.existsSync(path.join(home, "calendar-auth.json"))).toBe(false);
});

it("exposes exact CLI consent/status/disconnect commands without placing client secrets in output", () => {
  const env = {
    ...process.env,
    HELEN_HOME: home,
    CAL_CLIENT: "synthetic-calendar-client",
    CAL_SECRET: "synthetic-client-secret",
  };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const cli = (...args: string[]) => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), "dist/cli.js"),
        "assistant",
        "google-calendar",
        ...args,
      ],
      { env, windowsHide: true, timeout: 20000, encoding: "utf8" },
    );
    expect(result.status, result.stderr + (result.error?.message ?? "")).toBe(
      0,
    );
    expect(result.stdout).not.toContain(env.CAL_SECRET);
    return JSON.parse(result.stdout);
  };
  const started = cli(
    "connect",
    "--account",
    input.account,
    "--client-id-env",
    "CAL_CLIENT",
    "--client-secret-env",
    "CAL_SECRET",
  );
  expect(new URL(started.authorizationUrl).searchParams.get("scope")).toBe(
    GOOGLE_CALENDAR_SCOPES[0],
  );
  expect(readConfig(home).googleCalendar).toMatchObject({
    allowedChannels: ["cli"],
    permissions: ["calendar:read"],
  });
  expect(cli("status")).toMatchObject({ configured: true, connection: null });
  expect(cli("disconnect")).toMatchObject({
    disconnected: true,
    revoked: false,
  });
  expect(fs.existsSync(path.join(home, "calendar-oauth-pending.json"))).toBe(
    false,
  );
}, 90000);

it("reports stored readonly readiness separately from untested live access", async () => {
  const options = { fetch: mock(() => ({ ok: true })) };
  expect(
    (await diagnoseAssistant(home, options)).find(
      (check) => check.name === "google-calendar",
    )?.status,
  ).toBe("warning");
  await connect();
  const ready = (await diagnoseAssistant(home, options)).find(
    (check) => check.name === "google-calendar",
  )!;
  expect(ready.status).toBe("ok");
  expect(ready.detail).toContain("not tested");
  expect(ready.detail).not.toContain(input.account);
  const config = readConfig(home);
  writeConfig(
    { ...config, privacy: { ...config.privacy, showSensitiveOn: [] } },
    home,
  );
  expect(
    (await diagnoseAssistant(home, options)).find(
      (check) => check.name === "google-calendar",
    )?.status,
  ).toBe("warning");
  await expect(
    queryGoogleCalendar(home, actor, "events", window, {
      fetch: options.fetch,
    }),
  ).rejects.toThrow(/private/);
});
