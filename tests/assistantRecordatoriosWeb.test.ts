import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createAssistantServer } from "../src/assistant/server.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
import { addTasks, listTasks } from "../src/assistant/tasks.js";

let home: string, base: string, server: http.Server;
let twoFactor: boolean,
  pendingDeployment: boolean,
  accountId: string,
  loginAccount: string;
let calls: Array<{
  url: string;
  body: Record<string, unknown> | undefined;
  authorization: string | null;
}>;
let pauseSync: Promise<void> | undefined;
let syncStarted: (() => void) | undefined;
const token = "synthetic-recordatorios-token";
beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-recordatorios-web-"));
  twoFactor = false;
  pendingDeployment = false;
  accountId = "account-1";
  loginAccount = "account-1";
  calls = [];
  pauseSync = undefined;
  syncStarted = undefined;
  const config = writeConfig(
    { owner: "Test", privacy: { showSensitiveOn: ["web"] } },
    home,
  );
  const fetcher = (async (url: string | URL, init?: RequestInit) => {
    const target = new URL(url);
    calls.push({
      url: target.href,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get("authorization"),
    });
    expect(init?.redirect).toBe("error");
    if (target.pathname === "/api/auth/login") {
      if (twoFactor)
        return Response.json(
          { twoFactorRequired: true, error: "private remote login detail" },
          { status: 401 },
        );
      return Response.json({
        token,
        user: { id: loginAccount, email: "owner@example.com" },
      });
    }
    syncStarted?.();
    await pauseSync;
    if (pendingDeployment)
      return Response.json({ error: "not deployed" }, { status: 404 });
    return Response.json({ accountId, tasks: [] });
  }) as typeof fetch;
  server = createAssistantServer({
    home,
    config,
    token: "assistant-token",
    model: null,
    fetcher,
    rateLimit: 1000,
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(home, { recursive: true, force: true });
});
function request(route: string, body?: unknown, channel = "web") {
  return fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer assistant-token",
      "Content-Type": "application/json",
      "X-Helen-Client": channel,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const credentials = {
  url: "https://eneko-ruiz.com",
  email: "owner@example.com",
  password: "private-test-password",
};

it("requires assistant authentication and private channel before reading credentials or calling the application", async () => {
  expect(
    (
      await fetch(base + "/recordatorios/connect", {
        method: "POST",
        body: "not json",
      })
    ).status,
  ).toBe(401);
  expect(
    (await request("/recordatorios/connect", credentials, "http")).status,
  ).toBe(403);
  expect(
    (await request("/recordatorios/connect", { ...credentials, speaker: true }))
      .status,
  ).toBe(403);
  expect(
    (
      await request("/recordatorios/connect", {
        ...credentials,
        url: "http://example.com",
      })
    ).status,
  ).toBe(400);
  expect(calls).toEqual([]);
});
it("verifies account binding before saving only a private token and disconnects without deleting tasks or ledger", async () => {
  addTasks(home, { text: "Conservar tarea local" });
  const connected = await request("/recordatorios/connect", credentials);
  expect(connected.status).toBe(200);
  expect(JSON.stringify(await connected.json())).not.toContain(token);
  expect(calls[0]!.authorization).toBeNull();
  expect(calls[1]!.authorization).toBe(`Bearer ${token}`);
  const saved = fs.readFileSync(
    path.join(home, "recordatorios-auth.json"),
    "utf8",
  );
  expect(saved).toContain(token);
  expect(saved).not.toContain(credentials.password);
  expect(fs.readFileSync(path.join(home, "config.json"), "utf8")).not.toContain(
    token,
  );
  const status = await (await request("/recordatorios/status")).json();
  expect(status.connected).toBe(true);
  expect(JSON.stringify(status)).not.toContain(token);
  const ledger = fs.readFileSync(
    path.join(home, "recordatorios-sync.json"),
    "utf8",
  );
  expect(
    (await request("/recordatorios/disconnect", { confirm: false })).status,
  ).toBe(400);
  expect(
    (await request("/recordatorios/disconnect", { confirm: true })).status,
  ).toBe(200);
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  expect(
    fs.readFileSync(path.join(home, "recordatorios-sync.json"), "utf8"),
  ).toBe(ledger);
  expect(listTasks(home)[0]!.text).toBe("Conservar tarea local");
  expect(readConfig(home).recordatorios).toBeUndefined();
});
it("reports required two-factor code without logging out of HELEN or persisting a partial connection", async () => {
  twoFactor = true;
  const response = await request("/recordatorios/connect", credentials);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ twoFactorRequired: true });
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  expect((await request("/recordatorios/status")).status).toBe(200);
});
it("does not pretend connected when the required remote sync endpoint is not deployed", async () => {
  pendingDeployment = true;
  const response = await request("/recordatorios/connect", credentials);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    connected: false,
    pendingDeployment: true,
  });
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  expect(readConfig(home).recordatorios).toBeUndefined();
});
it("rejects mismatched login/sync accounts and later switches before mixing personal data", async () => {
  accountId = "another-account";
  expect((await request("/recordatorios/connect", credentials)).status).toBe(
    400,
  );
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  accountId = "account-1";
  expect((await request("/recordatorios/connect", credentials)).status).toBe(
    200,
  );
  const saved = fs.readFileSync(
    path.join(home, "recordatorios-auth.json"),
    "utf8",
  );
  loginAccount = accountId = "account-2";
  expect((await request("/recordatorios/connect", credentials)).status).toBe(
    400,
  );
  expect(
    fs.readFileSync(path.join(home, "recordatorios-auth.json"), "utf8"),
  ).toBe(saved);
});
it("does not resurrect a connection that completes after explicit disconnection", async () => {
  let release!: () => void;
  pauseSync = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    syncStarted = resolve;
  });
  const connecting = request("/recordatorios/connect", credentials);
  await started;
  expect(
    (await request("/recordatorios/disconnect", { confirm: true })).status,
  ).toBe(200);
  release();
  expect((await connecting).status).toBe(400);
  expect(fs.existsSync(path.join(home, "recordatorios-auth.json"))).toBe(false);
  expect(readConfig(home).recordatorios).toBeUndefined();
});
