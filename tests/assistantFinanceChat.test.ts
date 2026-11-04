import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import {
  getConversation,
  saveConversation,
} from "../src/assistant/conversation.js";
import { queryFinance, writeFinanceCopy } from "../src/assistant/finance.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
import { listTasks } from "../src/assistant/tasks.js";

vi.mock("../src/assistant/finance.js", async (original) => ({
  ...(await original<typeof import("../src/assistant/finance.js")>()),
  writeFinanceCopy: vi.fn(),
  queryFinance: vi.fn(),
}));
let home: string;
const now = new Date("2026-11-04T10:00:00Z");
const movement = {
  date: "2026-11-04",
  operation: "Venta",
  person: "",
  account: "Caja",
  amount: "20.00",
  cashImpact: "20.00",
  concept: "Camiseta",
};
const draft = {
  requestId: "sale-1",
  movement,
  task: { text: "Enviar camiseta", due: "2026-11-05T10:00:00.000Z" },
};
const ask = (text: string, overrides = {}) =>
  handleMessage(text, { home, channel: "cli", now, model: null, ...overrides });
const proposal = () => ask(`finanzas proponer ${JSON.stringify(draft)}`);
const confirmation = (text: string) => /confirmar [a-f0-9]{64}/.exec(text)![0];
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-finance-chat-"));
  fs.writeFileSync(path.join(home, "source.xlsx"), "synthetic: writes mocked");
  writeConfig(
    {
      owner: "Test",
      timezone: "Europe/Madrid",
      finance: {
        source: path.join(home, "source.xlsx"),
        directory: path.join(home, "copies"),
        allowedChannels: ["cli"],
        permissions: ["finance:read", "finance:copy", "tasks:write"],
      },
    },
    home,
  );
  vi.mocked(writeFinanceCopy).mockReset().mockResolvedValue({
    output: "copy.xlsx",
    row: 2,
    duplicate: false,
    recalculation: "pending-excel",
  });
  vi.mocked(queryFinance)
    .mockReset()
    .mockResolvedValue({ count: 0 } as never);
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

it("previews without writes, requires exact approval and executes both operations once", async () => {
  const preview = await proposal();
  expect(preview.text).toContain('"cashImpact": "20.00"');
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  expect((await ask("sí")).text).toContain("exactamente");
  const approve = confirmation(preview.text);
  expect((await ask(`${approve} extra`)).text).toContain("exactamente");
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  expect((await ask(approve)).text).toContain('"status": "succeeded"');
  expect(listTasks(home)).toHaveLength(1);
  expect(readConfig(home).finance!.source).toBe("copy.xlsx");
  await ask(approve);
  expect(writeFinanceCopy).toHaveBeenCalledTimes(1);
});

it("binds approval to owner, conversation, expiry, permissions and current revision", async () => {
  const preview = await proposal();
  const approve = confirmation(preview.text);
  await ask(approve, { conversation: "other" });
  await ask(approve, { ownerVerified: false });
  await ask(approve, { speaker: true });
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  writeConfig({ ...readConfig(home), owner: "Other" }, home);
  await ask(approve);
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  writeConfig(
    {
      ...readConfig(home),
      owner: "Test",
      finance: { ...readConfig(home).finance!, source: "changed.xlsx" },
    },
    home,
  );
  await ask(approve);
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  await ask(approve, { now: new Date(now.getTime() + 11 * 60_000) });
  expect(writeFinanceCopy).not.toHaveBeenCalled();
});

it("rejects edited approvals and missing fields, and asks for debt/transfer rules", async () => {
  const preview = await proposal();
  const conversation = getConversation(home, "cli:default", now);
  const stored = JSON.parse(conversation.pending!.text!);
  stored.input.finance.movement.amount = "21.00";
  conversation.pending!.text = JSON.stringify(stored);
  saveConversation(home, conversation, now);
  await ask(confirmation(preview.text));
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  await ask("cancelar");
  for (const operation of ["Deuda", "Transferencia"]) {
    expect(
      (
        await ask(
          `finanzas proponer ${JSON.stringify({ ...draft, movement: { ...movement, operation } })}`,
        )
      ).text,
    ).toContain("regla");
  }
  expect((await ask("He vendido camiseta por 20 €")).text).toContain(
    "cuenta o caja",
  );
  await ask(
    `finanzas proponer ${JSON.stringify({ ...draft, movement: { ...movement, account: "" } })}`,
  );
  expect(writeFinanceCopy).not.toHaveBeenCalled();
});

it("rejects source content changes even when its configured path stays identical", async () => {
  const approve = confirmation((await proposal()).text);
  fs.appendFileSync(readConfig(home).finance!.source, " changed");
  await ask(approve);
  expect(writeFinanceCopy).not.toHaveBeenCalled();
  expect(listTasks(home)).toEqual([]);
});

it("keeps partial failures truthful and retries the identical approved operation without duplicate tasks", async () => {
  const approve = confirmation((await proposal()).text);
  vi.mocked(writeFinanceCopy).mockRejectedValueOnce(new Error("unavailable"));
  expect((await ask(approve)).text).toContain("partial-or-failed");
  expect(listTasks(home)).toHaveLength(1);
  expect((await ask(approve)).text).toContain('"status": "succeeded"');
  expect(listTasks(home)).toHaveLength(1);
});

it("keeps financial requests, responses and task details away from a configured model", async () => {
  const answer = vi.fn().mockResolvedValue({ text: "OK", toolCalls: [] });
  const model = { kind: "command" as const, usesTools: false, answer };
  await ask("He gastado material por 12 euros", { model });
  await ask("finanzas mes 2026-11", { model });
  expect(answer).not.toHaveBeenCalled();
  expect(getConversation(home, "cli:default", now).history).toBeUndefined();
  const approve = confirmation((await proposal()).text);
  await ask(approve, { model });
  await ask("Muéstrame las tareas", { model: null });
  await ask("Explica un transistor", { model });
  expect(answer).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(answer.mock.calls)).not.toContain("Enviar camiseta");
});
