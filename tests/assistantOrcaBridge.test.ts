import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cancelOrcaTask,
  queueOrcaTask,
  readOrcaState,
  resolveTaskId,
  summarizeOrcaWork,
  validateQueueRequest,
  type OrcaExec,
} from "../src/assistant/orcaBridge.js";
import { understand } from "../src/assistant/intents.js";

const NOW = new Date("2026-11-10T08:00:00Z");
const ID_A = "task-" + "a".repeat(32);
const ID_A2 = "task-" + "a".repeat(8) + "b".repeat(24);
const ID_B = "task-" + "b".repeat(32);
const ID_C = "task-" + "c".repeat(32);
let dir: string;

function task(
  id: string,
  status: string,
  agent: string,
  goal: string,
  iso?: string,
) {
  return { id, status, agent, goal, targetIso: iso, scheduledTime: "19:00" };
}
function write(tasks: unknown[], resets: unknown[] = []) {
  // PowerShell writes a BOM; the reader must cope with it.
  fs.writeFileSync(
    path.join(dir, "orca_nightly_queue.json"),
    "\uFEFF" + JSON.stringify({ tasks }),
  );
  fs.writeFileSync(
    path.join(dir, "quota_resets.json"),
    "\uFEFF" + JSON.stringify(resets),
  );
}
const view = (extra: Partial<Parameters<typeof summarizeOrcaWork>[0]> = {}) =>
  summarizeOrcaWork({
    dir,
    lang: "es",
    now: NOW,
    timezone: "Europe/Madrid",
    locale: "es-ES",
    owner: true,
    showGoals: true,
    ...extra,
  });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-orca-"));
  fs.writeFileSync(path.join(dir, "orca-queue.ps1"), "# engine");
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

it("reads a BOM-prefixed queue and skips records without a valid id", () => {
  write([
    task(ID_A, "PENDING", "codex", "x"),
    { id: "task-bad", status: "PENDING" },
    { status: "PENDING" },
  ]);
  const state = readOrcaState(dir);
  expect(state.tasks.map((t) => t.id)).toEqual([ID_A]);
  expect(state.warnings).toEqual([]);
});

it("reports a missing or oversized queue instead of throwing", () => {
  expect(readOrcaState(dir).warnings).toContain("queue");
  fs.writeFileSync(
    path.join(dir, "orca_nightly_queue.json"),
    " ".repeat(3_000_000),
  );
  expect(readOrcaState(dir).warnings).toContain("queue");
});

it("groups open work by provider, with quota returns, and hides goals on channels without private access", () => {
  write(
    [
      task(
        ID_A,
        "PENDING",
        "codex",
        "Audita el diseño",
        "2026-11-10T18:00:00Z",
      ),
      task(
        ID_B,
        "WAITING_QUOTA",
        "claude",
        "Refactor secreto",
        "2026-11-10T19:00:00Z",
      ),
      task(ID_C, "COMPLETED", "claude", "ya hecho"),
    ],
    [
      {
        platform: "claude",
        title: "Claude Pro",
        resetIso: "2026-11-10T18:00:00",
      },
      { platform: "codex", title: "old", resetIso: "2026-11-01T18:00:00" },
    ],
  );
  const full = view();
  expect(full.text).toContain("2 abiertas");
  expect(full.text).toMatch(/Claude\n• .*espera cuota — Refactor secreto/);
  expect(full.text).toMatch(/Codex\n• .*pendiente — Audita el diseño/);
  expect(full.text).not.toContain("ya hecho");
  expect(full.text).toContain("Claude vuelve");
  expect(full.text).not.toContain("Codex vuelve");
  expect(full.speech).not.toContain("secreto");

  const hidden = view({ showGoals: false });
  expect(hidden.text).not.toContain("Refactor secreto");
  expect(hidden.text).toContain("espera cuota");
});

it("filters by provider and redacts credentials in goals", () => {
  write([
    task(ID_A, "PENDING", "codex", "usa sk-" + "x".repeat(40)),
    task(ID_B, "PENDING", "claude", "otra"),
  ]);
  const codex = view({ provider: "codex" });
  expect(codex.text).toContain("Codex");
  expect(codex.text).not.toContain("Claude\n");
  expect(codex.text).not.toContain("x".repeat(40));
});

it("reads nothing for a channel that is not the verified owner", () => {
  write([task(ID_A, "PENDING", "codex", "x")]);
  const spy = vi.spyOn(fs, "readFileSync");
  const denied = view({ owner: false });
  expect(denied.text).toMatch(/verificado/);
  expect(spy).not.toHaveBeenCalled();
});

it("resolves an id prefix only to one cancellable task", () => {
  write([
    task(ID_A, "PENDING", "codex", "x"),
    task(ID_A2, "PENDING", "claude", "y"),
    task(ID_B, "COMPLETED", "claude", "z"),
    task(ID_C, "DISPATCHED", "claude", "w"),
  ]);
  expect(resolveTaskId(dir, "aaaaaaaa")).toEqual({ error: "ambiguous" });
  expect(resolveTaskId(dir, "aaaaaaaaa")).toEqual({ id: ID_A });
  expect(resolveTaskId(dir, "bbbbbb")).toEqual({ error: "not_found" });
  expect(resolveTaskId(dir, "cccccc")).toEqual({ error: "not_found" });
  expect(resolveTaskId(dir, "zz")).toEqual({ error: "invalid" });
});

it("cancels through the engine with an argument array and maps exit codes", async () => {
  const calls: Array<{ file: string; args: string[] }> = [];
  const exec =
    (code: number): OrcaExec =>
    async (file, args) => {
      calls.push({ file, args });
      return { code, stdout: "{}", stderr: "" };
    };
  expect(await cancelOrcaTask(dir, ID_A, exec(0))).toEqual({
    ok: true,
    message: "cancelled",
  });
  expect(calls[0].args).toEqual(
    expect.arrayContaining(["-Cancel", ID_A, "-Json"]),
  );
  expect(calls[0].args.join(" ")).toContain(path.join(dir, "orca-queue.ps1"));
  expect(await cancelOrcaTask(dir, ID_A, exec(3))).toEqual({
    ok: false,
    reason: "not_found",
  });
  expect(await cancelOrcaTask(dir, ID_A, exec(4))).toEqual({
    ok: false,
    reason: "not_cancellable",
  });
  expect(await cancelOrcaTask(dir, ID_A, exec(1))).toEqual({
    ok: false,
    reason: "failed",
  });
  const before = calls.length;
  expect(await cancelOrcaTask(dir, "task-x; rm -rf /", exec(0))).toEqual({
    ok: false,
    reason: "invalid",
  });
  expect(calls.length).toBe(before);
});

it("refuses to run when the engine script is missing", async () => {
  fs.rmSync(path.join(dir, "orca-queue.ps1"));
  const exec: OrcaExec = vi.fn();
  expect(await cancelOrcaTask(dir, ID_A, exec)).toEqual({
    ok: false,
    reason: "engine",
  });
  expect(exec).not.toHaveBeenCalled();
});

it("validates queue requests before they reach the engine", () => {
  const base = {
    agent: "codex" as const,
    due: new Date(NOW.getTime() + 3 * 3_600_000),
    goal: "continúa con el plan",
    projectPath: "C:\\proyecto",
  };
  expect(validateQueueRequest(base, NOW)).toBeUndefined();
  expect(validateQueueRequest({ ...base, goal: "-Clear" }, NOW)).toBe(
    "goal_chars",
  );
  expect(validateQueueRequest({ ...base, goal: "/xyz" }, NOW)).toBe(
    "goal_chars",
  );
  expect(validateQueueRequest({ ...base, goal: "a\nb" }, NOW)).toBe(
    "goal_chars",
  );
  expect(validateQueueRequest({ ...base, goal: "ab" }, NOW)).toBe(
    "goal_length",
  );
  expect(validateQueueRequest({ ...base, due: NOW }, NOW)).toBe("past");
  expect(
    validateQueueRequest(
      { ...base, due: new Date(NOW.getTime() + 25 * 3_600_000) },
      NOW,
    ),
  ).toBe("too_far");
  expect(validateQueueRequest({ ...base, projectPath: "" }, NOW)).toBe(
    "project",
  );
  expect(validateQueueRequest({ ...base, conversationId: "nope" }, NOW)).toBe(
    "conversation",
  );
  expect(
    validateQueueRequest(
      { ...base, conversationId: "123e4567-e89b-12d3-a456-426614174000" },
      NOW,
    ),
  ).toBeUndefined();
});

it("queues with the goal as one argument and the provider-cli backend", async () => {
  let seen: string[] = [];
  const exec: OrcaExec = async (_f, args) => {
    seen = args;
    return { code: 0, stdout: "", stderr: "" };
  };
  const goal = "haz esto; y luego `aquello` $(whoami)";
  const out = await queueOrcaTask(
    dir,
    {
      agent: "claude",
      due: new Date(NOW.getTime() + 90 * 60_000),
      goal,
      projectPath: "C:\\p",
    },
    NOW,
    exec,
  );
  expect(out.ok).toBe(true);
  expect(seen).toEqual(
    expect.arrayContaining([
      "-Goal",
      goal,
      "-Agent",
      "claude",
      "-In",
      "90m",
      "-ExecutionBackend",
      "provider-cli",
    ]),
  );
  expect(seen.filter((a) => a === goal)).toHaveLength(1);
});

it("recognises the automation phrases without stealing existing ones", () => {
  const name = (text: string) => understand(text).intent.name;
  expect(name("¿Qué hay pendiente en la cola?")).toBe("automation.status");
  expect(name("estado de la cola")).toBe("automation.status");
  expect(name("tareas programadas")).toBe("automation.status");
  expect(understand("cuota de claude").intent).toEqual({
    name: "automation.status",
    provider: "claude",
  });
  expect(understand("cancela la tarea 8B230D42").intent).toEqual({
    name: "automation.cancel",
    id: "8b230d42",
  });
  const queued = understand(
    "programa en codex mañana a las 9: Continúa con el Plan",
  ).intent;
  expect(queued).toMatchObject({
    name: "automation.queue",
    agent: "codex",
    goal: "Continúa con el Plan",
  });
  expect(name("mis tareas pendientes")).toBe("tasks.list");
  expect(name("cancela el recordatorio del dentista")).not.toBe(
    "automation.cancel",
  );
});
