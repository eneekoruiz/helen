import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const execCalls: string[][] = [];
vi.mock("node:child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  return {
    ...real,
    execFile: (
      _file: string,
      args: string[],
      _opts: unknown,
      done: (e: Error | null, out: string, err: string) => void,
    ) => {
      execCalls.push(args);
      done(null, "{}", "");
    },
  };
});

const { handleMessage } = await import("../src/assistant/brain.js");
const { writeConfig } = await import("../src/assistant/home.js");

const NOW = new Date("2026-11-10T08:00:00Z");
const ID = "task-" + "a".repeat(32);
let home: string;
let eco: string;

beforeEach(() => {
  execCalls.length = 0;
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-home-"));
  eco = fs.mkdtempSync(path.join(os.tmpdir(), "helen-eco-"));
  fs.writeFileSync(path.join(eco, "orca-queue.ps1"), "# engine");
  fs.writeFileSync(
    path.join(eco, "orca_nightly_queue.json"),
    JSON.stringify({
      tasks: [
        {
          id: ID,
          status: "PENDING",
          agent: "codex",
          goal: "Audita el diseño",
          targetIso: "2026-11-10T18:00:00Z",
        },
      ],
    }),
  );
  fs.writeFileSync(path.join(eco, "quota_resets.json"), "[]");
  writeConfig(
    {
      owner: "Eneko",
      timezone: "Europe/Madrid",
      locale: "es-ES",
      automation: { ecosystemDir: eco, projectPath: "C:\\proyecto" },
    },
    home,
  );
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(eco, { recursive: true, force: true });
});
const ask = (text: string, extra: Record<string, unknown> = {}) =>
  handleMessage(text, {
    home,
    channel: "telegram",
    conversation: "chat",
    now: NOW,
    model: null,
    ownerVerified: true,
    ...extra,
  });

it("answers what is pending and where, only to the verified owner", async () => {
  const ok = await ask("qué hay en la cola");
  expect(ok.intent).toBe("automation.status");
  expect(ok.text).toContain("Codex");
  expect(ok.text).toContain("[aaaaaaaa]");
  const denied = await ask("qué hay en la cola", { ownerVerified: false });
  expect(denied.text).not.toContain("Codex");
});

it("cancels only after an explicit yes, and calls the engine once", async () => {
  const first = await ask("cancela la tarea aaaaaaaa");
  expect(first.text).toContain("¿Cancelo");
  expect(execCalls).toHaveLength(0);
  const done = await ask("sí");
  expect(done.text).toBe("Tarea cancelada.");
  expect(execCalls).toHaveLength(1);
  expect(execCalls[0]).toEqual(expect.arrayContaining(["-Cancel", ID]));
});

it("does not run the engine when the owner says no or the channel is unverified", async () => {
  await ask("cancela la tarea aaaaaaaa");
  expect((await ask("no")).text).toMatch(/dejo/);
  expect(execCalls).toHaveLength(0);
  const stranger = await ask("cancela la tarea aaaaaaaa", {
    ownerVerified: false,
  });
  expect(stranger.text).toMatch(/verificado/);
  expect(execCalls).toHaveLength(0);
});

it("queues after confirmation with the parsed time and refuses unsafe goals", async () => {
  const ask1 = await ask(
    "programa en claude hoy a las 18:00: Revisa el informe",
  );
  expect(ask1.text).toContain("¿Programo en Claude");
  expect(execCalls).toHaveLength(0);
  expect((await ask("sí")).text).toContain("Programada");
  expect(execCalls[0]).toEqual(
    expect.arrayContaining(["-Goal", "Revisa el informe", "-Agent", "claude"]),
  );
  execCalls.length = 0;
  const unsafe = await ask("programa en claude hoy a las 18:00: -Clear");
  expect(unsafe.text).toMatch(/objetivo/);
  expect(execCalls).toHaveLength(0);
});

it("explains how to configure the bridge when it is off", async () => {
  writeConfig(
    { owner: "Eneko", timezone: "Europe/Madrid", locale: "es-ES" },
    home,
  );
  expect((await ask("qué hay en la cola")).text).toContain(
    "automation.ecosystemDir",
  );
});
