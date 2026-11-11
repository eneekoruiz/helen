import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { writeConfig } from "../src/assistant/home.js";
import { writeFinanceCopy } from "../src/assistant/finance.js";
import { executeSaleAndTask } from "../src/assistant/orchestrate.js";
import { completeTask, listTasks } from "../src/assistant/tasks.js";

vi.mock("../src/assistant/finance.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/assistant/finance.js")>()),
  writeFinanceCopy: vi.fn(),
}));
let home: string;
const actor = {
  owner: "Test",
  verified: true,
  permissions: ["finance:copy", "tasks:write"],
};
const request = {
  requestId: "sale-1",
  finance: {
    source: "source.xlsx",
    directory: "copies",
    movement: {
      date: "2026-11-04",
      operation: "Venta",
      person: "",
      account: "Caja",
      amount: "20.00",
      cashImpact: "20.00",
      concept: "Camiseta",
    },
  },
  task: { text: "Enviar camiseta", due: "2026-11-05T10:00:00.000Z" },
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-orchestrate-"));
  writeConfig({ owner: "Test", timezone: "Europe/Madrid" }, home);
  vi.mocked(writeFinanceCopy).mockReset().mockResolvedValue({
    output: "copy.xlsx",
    row: 16,
    duplicate: false,
    recalculation: "pending-excel",
  });
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

it("composes two operations, reserves IDs and never recreates a completed task on replay", async () => {
  expect((await executeSaleAndTask(home, request, actor)).status).toBe(
    "succeeded",
  );
  const task = listTasks(home)[0]!;
  completeTask(home, task.id);
  const replay = await executeSaleAndTask(home, request, actor);
  expect(replay.status).toBe("succeeded");
  expect(replay.results.every((result) => result.reused)).toBe(true);
  expect(writeFinanceCopy).toHaveBeenCalledTimes(2);
  expect(listTasks(home, { status: "all" })).toHaveLength(1);
  expect(listTasks(home)).toHaveLength(0);
  await expect(
    executeSaleAndTask(
      home,
      { ...request, task: { ...request.task, text: "Otra tarea" } },
      actor,
    ),
  ).rejects.toThrow(/requestId/);
});

it("reports a failed finance action separately, keeps the task and retries without duplication", async () => {
  vi.mocked(writeFinanceCopy).mockRejectedValueOnce(
    new Error("source unavailable"),
  );
  const first = await executeSaleAndTask(home, request, actor);
  expect(first.status).toBe("partial-or-failed");
  expect(first.results.map((result) => result.status)).toEqual([
    "failed",
    "succeeded",
  ]);
  expect((await executeSaleAndTask(home, request, actor)).status).toBe(
    "succeeded",
  );
  expect(listTasks(home)).toHaveLength(1);
});

it("requires verified owner identity and both operation permissions before any mutation", async () => {
  for (const invalid of [
    { ...actor, verified: false },
    { ...actor, owner: "Other" },
    { ...actor, permissions: ["tasks:write"] },
  ]) {
    await expect(executeSaleAndTask(home, request, invalid)).rejects.toThrow(
      /verified/,
    );
  }
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  expect(listTasks(home)).toEqual([]);
  expect(fs.existsSync(path.join(home, "operation-receipts.json"))).toBe(false);
});

it("does not recreate deliberately removed tasks and refuses a damaged receipt ledger", async () => {
  await executeSaleAndTask(home, request, actor);
  fs.writeFileSync(
    path.join(home, "tasks.json"),
    JSON.stringify({ version: 1, items: [] }),
  );
  expect(
    (await executeSaleAndTask(home, request, actor)).results[1]?.status,
  ).toBe("failed");
  fs.writeFileSync(
    path.join(home, "operation-receipts.json"),
    JSON.stringify({ version: 1, items: [{ malformed: true }] }),
  );
  await expect(executeSaleAndTask(home, request, actor)).rejects.toThrow(
    /ledger/,
  );
});
