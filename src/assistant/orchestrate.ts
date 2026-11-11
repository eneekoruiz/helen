import crypto from "node:crypto";
import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { readConfig, withHomeLock } from "./home.js";
import {
  FinanceCopySchema,
  FinanceResultSchema,
  writeFinanceCopy,
} from "./finance.js";
import { readCollection, updateCollection } from "./store.js";
import { TaskSchema } from "./tasks.js";

export const SaleAndTaskSchema = z
  .object({
    requestId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    finance: FinanceCopySchema.omit({ requestId: true }),
    task: z
      .object({
        text: z.string().trim().min(1).max(300),
        due: z.string().datetime(),
      })
      .strict(),
  })
  .strict();
const ReceiptSchema = z.object({
  requestId: z.string(),
  owner: z.string(),
  fingerprint: z.string(),
  taskId: TaskSchema.shape.id,
  finance: FinanceResultSchema.optional(),
  taskDone: z.boolean().default(false),
});
const NAME = "operation-receipts";

/** One private home per owner. Permissions come from the authenticated adapter, never message text. */
export async function executeSaleAndTask(
  home: string,
  raw: unknown,
  actor: {
    owner: string;
    verified: boolean;
    permissions: readonly string[];
  },
  now = new Date(),
) {
  if (
    !actor.verified ||
    actor.owner !== readConfig(home).owner ||
    !["finance:copy", "tasks:write"].every((permission) =>
      actor.permissions.includes(permission),
    )
  )
    throw new Error(
      "Requires the verified home owner and finance:copy and tasks:write permissions.",
    );
  const input = SaleAndTaskSchema.parse(raw);
  if (findSecrets(input.task.text).length)
    throw new Error("Do not put credentials in tasks.");
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify({ owner: actor.owner, input }))
    .digest("hex");
  const receipt = withHomeLock(home, () => {
    if (readCollection(home, NAME, ReceiptSchema).invalid.length)
      throw new Error("Repair the operation receipt ledger before retrying.");
    return updateCollection(home, NAME, ReceiptSchema, (receipts) => {
      const previous = receipts.find(
        (item) => item.requestId === input.requestId,
      );
      if (previous) {
        if (
          previous.owner !== actor.owner ||
          previous.fingerprint !== fingerprint
        )
          throw new Error(
            "requestId belongs to different operation data or owner.",
          );
        return previous;
      }
      if (receipts.length >= 200)
        throw new Error(
          "Operation receipt limit reached; archive completed receipts safely first.",
        );
      const used = new Set([
        ...readCollection(home, "tasks", TaskSchema).items.map(
          (task) => task.id,
        ),
        ...receipts.map((item) => item.taskId),
      ]);
      let taskId: string;
      do taskId = `t${crypto.randomBytes(3).toString("hex")}`;
      while (used.has(taskId));
      const created: z.infer<typeof ReceiptSchema> = {
        requestId: input.requestId,
        owner: actor.owner,
        fingerprint,
        taskId,
        taskDone: false,
      };
      receipts.push(created);
      return created;
    });
  });
  const remember = (change: Partial<z.infer<typeof ReceiptSchema>>) =>
    updateCollection(home, NAME, ReceiptSchema, (receipts) => {
      Object.assign(
        receipts.find((item) => item.requestId === input.requestId)!,
        change,
      );
    });
  const results: Array<{
    operation: "finance" | "task";
    status: "succeeded" | "failed";
    reused?: boolean;
    output?: unknown;
    error?: string;
  }> = [];
  try {
    const output = await writeFinanceCopy({
      ...input.finance,
      requestId: `${input.requestId}-finance`,
    });
    if (!receipt.finance) remember({ finance: output });
    results.push({
      operation: "finance",
      status: "succeeded",
      reused: Boolean(receipt.finance),
      output,
    });
  } catch {
    results.push({
      operation: "finance",
      status: "failed",
      error:
        "No financial success confirmed. Inspect the private workbook revision; retry with the same requestId after repair.",
    });
  }
  try {
    const task = TaskSchema.parse({
      id: receipt.taskId,
      text: input.task.text,
      due: input.task.due,
      list: "inbox",
      status: "open",
      priority: "normal",
      source: "orchestrator",
      created: now.toISOString(),
      updated: now.toISOString(),
    });
    updateCollection(home, "tasks", TaskSchema, (tasks) => {
      const existing = tasks.find((item) => item.id === task.id);
      if (
        existing &&
        (existing.source !== "orchestrator" ||
          existing.text !== task.text ||
          existing.due !== task.due)
      )
        throw new Error("Reserved task conflicts with existing data.");
      if (!existing && receipt.taskDone)
        throw new Error(
          "The recorded task was removed; do not recreate it automatically.",
        );
      if (!existing) tasks.push(task);
    });
    remember({ taskDone: true });
    results.push({
      operation: "task",
      status: "succeeded",
      reused: receipt.taskDone,
      output: {
        id: task.id,
        destination: "helen-inbox",
        remoteSync: "not-verified",
      },
    });
  } catch {
    results.push({
      operation: "task",
      status: "failed",
      error:
        "Task creation could not be confirmed. Repair the local task store before retrying.",
    });
  }
  return {
    requestId: input.requestId,
    status: results.every((result) => result.status === "succeeded")
      ? "succeeded"
      : "partial-or-failed",
    results,
  };
}
