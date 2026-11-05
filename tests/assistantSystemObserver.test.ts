import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, type ChildProcess } from "node:child_process";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { getConversation } from "../src/assistant/conversation.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
import {
  readSystemObserver,
  requestSystemObserver,
} from "../src/assistant/systemObserver.js";

vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  execFile: vi.fn(),
}));
let home: string;
let profile: string;
let queueFile: string;
const actor = {
  owner: "Test",
  verified: true,
  private: true,
  channel: "cli" as const,
};
const target = "2026-11-04T18:00:00+01:00";
const request = { goal: "Revisar los tests del proyecto", in: "15m" };
const id = "task-" + "a".repeat(32);
const saveQueue = (tasks: object[]) =>
  fs.writeFileSync(queueFile, JSON.stringify({ tasks }));
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-observer-"));
  profile = path.join(home, "profile");
  fs.mkdirSync(path.join(home, "project"));
  fs.mkdirSync(path.join(profile, "ai-ecosystem"), { recursive: true });
  fs.writeFileSync(
    path.join(profile, "system-observer.ps1"),
    "# synthetic: never executed",
  );
  queueFile = path.join(profile, "ai-ecosystem", "orca_nightly_queue.json");
  saveQueue([]);
  writeConfig(
    {
      owner: "Test",
      observer: {
        profileRoot: profile,
        projectRoot: path.join(home, "project"),
        agent: "codex",
        allowedChannels: ["cli"],
        permissions: ["system:read", "automation:queue"],
      },
    },
    home,
  );
  vi.spyOn(os, "platform").mockReturnValue("win32");
  vi.mocked(execFile)
    .mockReset()
    .mockImplementation(((...args: unknown[]) => {
      const argv = args[1] as string[];
      const callback = args.at(-1) as (
        error: Error | null,
        stdout: string,
        stderr: string,
      ) => void;
      const goal = argv[argv.indexOf("-Goal") + 1];
      if (!argv.includes("-DryRun"))
        saveQueue([
          {
            id,
            goal,
            projectPath: path.join(home, "project"),
            agent: "codex",
            status: "PENDING",
            targetIso: target,
          },
        ]);
      callback(
        null,
        JSON.stringify({ scheduled: false, targetIso: target }),
        "",
      );
      return {} as ChildProcess;
    }) as typeof execFile);
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});
const ask = (text: string, overrides = {}) =>
  handleMessage(text, { home, channel: "cli", model: null, ...overrides });

it("reads only bounded queue counts/status/dates without reconciling receipts or exposing goals", () => {
  saveQueue([
    {
      status: "PENDING",
      goal: "PRIVATE_GOAL_NEVER_EXPORT",
      projectPath: "PRIVATE_PATH",
      queuedAt: target,
      targetIso: target,
    },
    { status: "COMPLETED", providerReceipt: { secret: "PRIVATE_SECRET" } },
  ]);
  const before = fs.readFileSync(queueFile);
  const result = readSystemObserver(home, actor);
  expect(result.counts).toEqual({ PENDING: 1, COMPLETED: 1 });
  expect(result.nextTargetAt).toBe("2026-11-04T17:00:00.000Z");
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
  expect(fs.readFileSync(queueFile)).toEqual(before);
  expect(execFile).not.toHaveBeenCalled();
  fs.writeFileSync(queueFile, "invalid");
  expect(() => readSystemObserver(home, actor)).toThrow();
});

it("uses the existing hidden Observer with literal arguments, configured paths and preview without writes", async () => {
  const before = fs.readFileSync(queueFile);
  expect(await requestSystemObserver(home, actor, request, true)).toMatchObject(
    { status: "preview", scheduled: false },
  );
  expect(fs.readFileSync(queueFile)).toEqual(before);
  const args = vi.mocked(execFile).mock.calls[0];
  expect(args[1]).toEqual(
    expect.arrayContaining([
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-DryRun",
      "-NoNotification",
      profile + path.sep + "system-observer.ps1",
      path.join(home, "project"),
      request.goal,
    ]),
  );
  expect(args[1]).not.toContain("-RunDue");
  expect(args[2]).toMatchObject({
    windowsHide: true,
    timeout: 15000,
    env: { ORCA_QUEUE_PATH: queueFile },
  });
});

it("requires private owner and separate permissions; rejects routing/path overrides, credentials and cancelled calls", async () => {
  for (const invalid of [
    { ...actor, private: false },
    { ...actor, verified: false },
    { ...actor, owner: "Other" },
  ]) {
    expect(() => readSystemObserver(home, invalid)).toThrow();
    await expect(
      requestSystemObserver(home, invalid, request, false),
    ).rejects.toThrow();
  }
  for (const input of [
    { ...request, goal: "@codex C:/other | override" },
    { ...request, projectRoot: "C:/other" },
    { ...request, in: "0m" },
  ])
    await expect(
      requestSystemObserver(home, actor, input, false),
    ).rejects.toThrow();
  await expect(
    requestSystemObserver(home, actor, request, false, AbortSignal.abort()),
  ).rejects.toThrow();
  writeConfig(
    {
      ...readConfig(home),
      observer: { ...readConfig(home).observer!, permissions: ["system:read"] },
    },
    home,
  );
  await expect(
    requestSystemObserver(home, actor, request, false),
  ).rejects.toThrow();
  expect(execFile).not.toHaveBeenCalled();
});

it("confirms a durable queued item only, never provider execution or Windows schedule registration", async () => {
  expect(await requestSystemObserver(home, actor, request, false)).toEqual({
    status: "queued",
    id,
    targetAt: "2026-11-04T17:00:00.000Z",
    execution: "not-verified",
    windowsSchedule: "not-verified",
  });
  vi.mocked(execFile).mockImplementation(((...args: unknown[]) => {
    (args.at(-1) as (error: Error, stdout: string, stderr: string) => void)(
      new Error("PRIVATE_STDERR"),
      "",
      "PRIVATE_GOAL",
    );
    return {} as ChildProcess;
  }) as typeof execFile);
  const uncertain = await requestSystemObserver(home, actor, request, false);
  expect(uncertain).toMatchObject({
    status: "unconfirmed",
    mayHaveQueued: true,
  });
  expect(JSON.stringify(uncertain)).not.toContain("PRIVATE_");
});

it("wires explicit private chat preview/approval, consumes approval before queueing, and bypasses model/history", async () => {
  const answer = vi.fn();
  const model = { kind: "command" as const, usesTools: false, answer };
  const preview = await ask(
    `automatizaciones proponer ${JSON.stringify(request)}`,
    { model },
  );
  const confirm = /confirmar [a-f0-9]{64}/.exec(preview.text)![0];
  expect(vi.mocked(execFile).mock.calls).toHaveLength(1);
  expect((await ask("sí", { model })).text).toContain("exacta");
  expect(vi.mocked(execFile).mock.calls).toHaveLength(1);
  expect((await ask(confirm, { model })).text).toContain('"status": "queued"');
  expect(getConversation(home, "cli:default").pending).toBeUndefined();
  expect(getConversation(home, "cli:default").history).toBeUndefined();
  expect(answer).not.toHaveBeenCalled();
  expect(vi.mocked(execFile).mock.calls).toHaveLength(2);
});

it("invalidates approval when local settings change and denies voice/unverified status queries", async () => {
  const preview = await ask(
    `automatizaciones proponer ${JSON.stringify(request)}`,
  );
  const confirm = /confirmar [a-f0-9]{64}/.exec(preview.text)![0];
  writeConfig(
    {
      ...readConfig(home),
      observer: { ...readConfig(home).observer!, agent: "claude" },
    },
    home,
  );
  expect((await ask(confirm)).text).toContain("cambiado");
  await ask("sistema estado", { speaker: true });
  await ask("sistema estado", { ownerVerified: false });
  expect(vi.mocked(execFile).mock.calls).toHaveLength(1);
});

it("expires approvals and refuses replay without a second mutation", async () => {
  const now = new Date("2026-11-05T01:00:00Z");
  const preview = await ask(
    "automatizaciones proponer " + JSON.stringify(request),
    { now },
  );
  const confirm = /confirmar [a-f0-9]{64}/.exec(preview.text)![0];
  await ask(confirm, { now: new Date(now.getTime() + 11 * 60_000) });
  expect(vi.mocked(execFile).mock.calls).toHaveLength(1);
  const fresh = await ask(
    "automatizaciones proponer " + JSON.stringify(request),
    { now },
  );
  const approved = /confirmar [a-f0-9]{64}/.exec(fresh.text)![0];
  await ask(approved, { now });
  await ask(approved, { now });
  expect(vi.mocked(execFile).mock.calls).toHaveLength(3);
});
it("rejects oversized queues and symbolic links", () => {
  fs.writeFileSync(queueFile, " ".repeat(2 * 1024 * 1024 + 1));
  expect(() => readSystemObserver(home, actor)).toThrow();
  fs.unlinkSync(queueFile);
  const outside = path.join(home, "outside");
  fs.mkdirSync(outside);
  fs.rmSync(path.dirname(queueFile), { recursive: true });
  fs.symlinkSync(outside, path.dirname(queueFile), "junction");
  expect(() => readSystemObserver(home, actor)).toThrow();
});
it.skipIf(process.platform !== "win32")(
  "spawns a hidden offline PowerShell fixture with literal Unicode arguments and a private queue",
  async () => {
    const actual =
      await vi.importActual<typeof import("node:child_process")>(
        "node:child_process",
      );
    vi.mocked(execFile).mockImplementation(actual.execFile);
    fs.writeFileSync(
      path.join(profile, "system-observer.ps1"),
      `param([string]$Goal,[string]$ProjectPath,[string]$Agent,[string]$In,[switch]$NoNotification,[switch]$DryRun)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$target = '2026-11-05T04:00:00+01:00'
if ($DryRun) { @{ scheduled=$false; targetIso=$target } | ConvertTo-Json -Compress; exit 0 }
$task = @{ id='task-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; goal=$Goal; projectPath=$ProjectPath; agent=$Agent; targetIso=$target; status='PENDING' }
@{ tasks=@($task) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $env:ORCA_QUEUE_PATH -Encoding UTF8
`,
      "utf8",
    );
    const input = {
      goal: "Revisión literal; $(throw 'never') & pruebas",
      in: "15m",
    };
    expect(await requestSystemObserver(home, actor, input, true)).toMatchObject(
      { status: "preview" },
    );
    expect(JSON.parse(fs.readFileSync(queueFile, "utf8")).tasks).toHaveLength(
      0,
    );
    expect(
      await requestSystemObserver(home, actor, input, false),
    ).toMatchObject({ status: "queued", execution: "not-verified" });
    const tasks = JSON.parse(
      fs.readFileSync(queueFile, "utf8").replace(/^\uFEFF/, ""),
    ).tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].goal).toBe(input.goal);
  },
);

it("keeps rejected financial objectives out of models, history and pending while allowing finance source development", async () => {
  const answer = vi.fn();
  const model = { kind: "command" as const, usesTools: false, answer };
  for (const goal of [
    "Enviar 20 euros a Ana",
    "Leer cuenta bancaria",
    "Abrir libro personal",
    "Enviar copia.xlsx",
    "IBAN ES00",
    "€50 para Ana",
  ]) {
    await ask(
      "automatizaciones proponer " + JSON.stringify({ ...request, goal }),
      { model },
    );
    expect(getConversation(home, "cli:default").pending).toBeUndefined();
    expect(getConversation(home, "cli:default").history).toBeUndefined();
  }
  expect(answer).not.toHaveBeenCalled();
  expect(execFile).not.toHaveBeenCalled();
  await expect(
    requestSystemObserver(
      home,
      actor,
      { ...request, goal: "Auditar tests finanzas.ts y finance.ts" },
      true,
    ),
  ).resolves.toMatchObject({ status: "preview" });
  writeConfig(
    {
      ...readConfig(home),
      observer: { ...readConfig(home).observer!, projectRoot: home },
    },
    home,
  );
  expect(() => readSystemObserver(home, actor)).toThrow();
});
