import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  writeConfig,
  readConfig,
  type AssistantConfig,
} from "../src/assistant/home.js";
import { createAssistantServer } from "../src/assistant/server.js";
import { listTasks, addTasks } from "../src/assistant/tasks.js";

let home: string;
let config: AssistantConfig;
let server: http.Server;
let base: string;
beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-life-http-"));
  config = writeConfig(
    {
      owner: "Test",
      timezone: "Europe/Madrid",
      privacy: { showSensitiveOn: ["web"] },
    },
    home,
  );
  server = createAssistantServer({
    home,
    config,
    token: "test-token",
    model: null,
    rateLimit: 200,
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(home, { recursive: true, force: true });
});
function request(route: string, body?: unknown, channel = "web") {
  return fetch(`${base}${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "x-helen-client": channel,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("private life assistant HTTP endpoints", () => {
  it("authenticates uploads before parsing and rejects public channels, speakers and request-provided executables", async () => {
    expect(
      (await fetch(`${base}/capture`, { method: "POST", body: "invalid JSON" }))
        .status,
    ).toBe(401);
    expect(
      (
        await request(
          "/capture",
          { conversation: "one", text: "Comprar pan" },
          "http",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/capture", {
          conversation: "one",
          speaker: true,
          text: "Comprar pan",
        })
      ).status,
    ).toBe(403);
    expect((await request("/capture", { text: "Comprar pan" })).status).toBe(
      400,
    );
    expect(
      (
        await request("/capture", {
          conversation: "one",
          text: "Comprar pan",
          extractor: { command: "anything" },
        })
      ).status,
    ).toBe(400);
    expect(listTasks(home)).toEqual([]);
  });
  it("stages UTF-8 attachment, isolates conversations, edits and confirms only the reviewed version once", async () => {
    const response = await request("/capture", {
      conversation: "one",
      attachment: {
        base64: Buffer.from("Comprar café").toString("base64"),
        mime: "text/plain",
      },
    });
    expect(response.status).toBe(201);
    const { draft } = await response.json();
    expect(listTasks(home)).toEqual([]);
    expect(
      (await request(`/capture/${draft.id}?conversation=other`)).status,
    ).toBe(400);
    expect(
      (await request(`/capture/${draft.id}?conversation=one`)).status,
    ).toBe(200);
    expect(
      (await request(`/capture/${draft.id}?conversation=one&speaker=true`))
        .status,
    ).toBe(403);
    const items = [{ text: "Comprar café y té", missing: [] }];
    const changed = await request(`/capture/${draft.id}/edit`, {
      conversation: "one",
      version: draft.version,
      items,
    });
    const { draft: edited } = await changed.json();
    expect(edited.version).toBe(2);
    expect(
      (
        await request(`/capture/${draft.id}/confirm`, {
          conversation: "one",
          version: draft.version,
          items: draft.items,
        })
      ).status,
    ).toBe(400);
    const approval = {
      conversation: "one",
      version: edited.version,
      items: edited.items,
    };
    expect(
      (await request(`/capture/${draft.id}/confirm`, approval)).status,
    ).toBe(200);
    expect(
      (await request(`/capture/${draft.id}/confirm`, approval)).status,
    ).toBe(200);
    expect(listTasks(home)).toHaveLength(1);
  });
  it("validates canonical base64, MIME and media availability without writing tasks", async () => {
    for (const base64 of ["!!!!", "YQ=", "YR=="])
      expect(
        (
          await request("/capture", {
            conversation: "one",
            attachment: { base64, mime: "text/plain" },
          })
        ).status,
      ).toBe(400);
    const response = await request("/capture", {
      conversation: "one",
      attachment: {
        base64: Buffer.from("%PDF-1.7 test").toString("base64"),
        mime: "application/pdf",
      },
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("local media extractor");
    expect(listTasks(home)).toEqual([]);
  });
  it("keeps normal bodies at 64 KiB while capture accepts bounded larger attachments", async () => {
    const content = "咖啡\n".repeat(10000);
    const largeCapture = await request("/capture", {
      conversation: "one",
      attachment: {
        base64: Buffer.from(content).toString("base64"),
        mime: "text/plain",
      },
    });
    expect(largeCapture.status).toBe(400);
    expect((await largeCapture.json()).error).toContain("20 candidate lines");
    const normal = await request("/chat", { text: "x".repeat(70000) });
    expect(normal.status).toBe(413);
  });
  it("persists only allowed preferences and applies them to subsequent page renders", async () => {
    expect((await request("/preferences", undefined, "http")).status).toBe(403);
    expect(
      (
        await request("/preferences", {
          privacy: { showSensitiveOn: ["http"] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/preferences", {
          locale: "en-US",
          assistance: {
            detail: "brief",
            simpleLanguage: true,
            stepByStep: true,
          },
        })
      ).status,
    ).toBe(200);
    const preferences = await (await request("/preferences")).json();
    expect(preferences).toEqual({
      locale: "en-US",
      assistance: { detail: "brief", simpleLanguage: true, stepByStep: true },
    });
    expect(readConfig(home).locale).toBe("en-US");
    expect(Object.keys(preferences).sort()).toEqual(["assistance", "locale"]);
    expect(await (await fetch(`${base}/`)).text()).toContain('lang="en"');
  });
  it("creates workflows, tracks waiting and plans with actual channel privacy", async () => {
    const response = await request("/workflows", {
      title: "Viaje",
      items: [{ text: "Preparar maleta" }],
    });
    expect(response.status).toBe(201);
    const { workflow } = await response.json();
    expect(
      (
        await request("/workflows/status", {
          workflowId: workflow.id,
          itemId: workflow.items[0].id,
          status: "waiting",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/workflows/status", {
          workflowId: workflow.id,
          itemId: workflow.items[0].id,
          status: "waiting",
          waitingReason: "Respuesta del hotel",
        })
      ).status,
    ).toBe(200);
    const list = await (await request("/workflows")).json();
    expect(list.workflows[0].progress.done).toBe(0);
    expect(list.workflows[0].items[0].status).toBe("waiting");
    addTasks(home, { text: "Renovar pasaporte" });
    const now = Date.now();
    const plan = await request(
      "/plan",
      {
        from: new Date(now).toISOString(),
        to: new Date(now + 3600000).toISOString(),
        availableMinutes: 20,
        timezone: "Europe/Madrid",
        showSensitive: true,
      },
      "http",
    );
    expect(plan.status).toBe(200);
    expect(JSON.stringify(await plan.json())).not.toContain("pasaporte");
    expect(
      (
        await request(
          "/workflows",
          { title: "Blocked", items: [{ text: "One" }] },
          "http",
        )
      ).status,
    ).toBe(403);
  });
});
