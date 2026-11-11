import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  FinanceMovementSchema,
  previewFinanceMessage,
  queryFinance,
  writeFinanceCopy,
} from "./finance.js";
import { pendingFor, type Conversation } from "./conversation.js";
import {
  readConfig,
  withHomeLock,
  writeConfig,
  type ChannelName,
} from "./home.js";
import { executeSaleAndTask, SaleAndTaskSchema } from "./orchestrate.js";

const DraftSchema = z
  .object({
    requestId: SaleAndTaskSchema.shape.requestId,
    movement: FinanceMovementSchema,
    task: SaleAndTaskSchema.shape.task.optional(),
  })
  .strict();
const approvalHash = (owner: string, input: unknown, sourceHash: string) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify({ owner, input, sourceHash }))
    .digest("hex");
function workbookHash(source: string): string {
  if (
    !path.isAbsolute(source) ||
    path.extname(source).toLowerCase() !== ".xlsx" ||
    fs.statSync(source).size > 20 * 1024 * 1024
  )
    throw new Error("Configura una copia XLSX local absoluta de hasta 20 MB.");
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(source))
    .digest("hex");
}

/** Local deterministic route: financial messages and results never enter model history. */
export async function handleFinanceChat(
  text: string,
  ctx: {
    home: string;
    channel: ChannelName;
    ownerVerified: boolean;
    showSensitive: boolean;
    speaker: boolean;
    conversation: Conversation;
    now: Date;
    signal?: AbortSignal;
  },
): Promise<string | null> {
  const pending = ctx.conversation.pending;
  if (
    pending?.kind !== "finance" &&
    !/^(?:finanzas?|finance)(?:\s|$)|^(?:he vendido|he ingresado|he gastado|he comprado|debo|me deben|he transferido)\b|\b(?:euros?|financiero|financiera|saldo|beneficio|vinted)\b|€|^¿?cu[aá]nto gan[eé] este mes/i.test(
      text.trim(),
    )
  )
    return null;
  const config = readConfig(ctx.home);
  const settings = config.finance;
  if (
    !ctx.ownerVerified ||
    ctx.speaker ||
    !ctx.showSensitive ||
    !settings?.allowedChannels.includes(ctx.channel)
  )
    return "Finanzas requiere un canal privado del propietario habilitado localmente; no se ha ejecutado ninguna operación.";
  const requirePermission = (
    permission: "finance:read" | "finance:copy" | "tasks:write",
  ) => {
    if (!settings.permissions.includes(permission))
      throw new Error(`Permiso local requerido: ${permission}.`);
  };
  if (ctx.signal?.aborted) throw new Error("Petición cancelada.");
  if (pending?.kind === "finance") {
    if (/^(?:no|cancelar|cancela|cancel)$/i.test(text.trim())) {
      delete ctx.conversation.pending;
      return "Propuesta financiera cancelada; sin escrituras.";
    }
    const draft = JSON.parse(pending.text!);
    const input = SaleAndTaskSchema.omit({ task: true })
      .extend({ task: SaleAndTaskSchema.shape.task.optional() })
      .parse(draft.input);
    const hash = approvalHash(config.owner, input, draft.sourceHash);
    if (draft.owner !== config.owner || draft.hash !== hash)
      throw new Error(
        "La propuesta o el propietario han cambiado; genera otra vista previa.",
      );
    if (text.trim() !== `confirmar ${hash}`)
      return `Revisa la propuesta completa. Para aprobar exactamente esa operación escribe: confirmar ${hash}. Para descartarla: cancelar.`;
    requirePermission("finance:copy");
    if (input.task) requirePermission("tasks:write");
    const lock = path.join(ctx.home, "finance-operation.lock");
    const fd = fs.openSync(lock, "wx", 0o600);
    try {
      const current = readConfig(ctx.home);
      if (workbookHash(input.finance.source) !== draft.sourceHash)
        throw new Error(
          "El contenido del libro ha cambiado; genera otra vista previa.",
        );
      if (
        current.finance?.source !== input.finance.source &&
        current.finance?.source !== draft.sourceAfter
      )
        throw new Error(
          "La revisión del libro ha cambiado; genera otra vista previa.",
        );
      const result = input.task
        ? await executeSaleAndTask(
            ctx.home,
            input,
            {
              owner: config.owner,
              verified: true,
              permissions: settings.permissions,
            },
            ctx.now,
          )
        : {
            status: "succeeded",
            results: [
              {
                operation: "finance",
                status: "succeeded",
                output: await writeFinanceCopy({
                  ...input.finance,
                  requestId: `${input.requestId}-finance`,
                }),
              },
            ],
          };
      const financial = result.results.find(
        (operation) =>
          operation.operation === "finance" && operation.status === "succeeded",
      );
      if (financial) {
        const output = z
          .object({ output: z.string() })
          .parse(financial.output).output;
        withHomeLock(ctx.home, () => {
          const latest = readConfig(ctx.home);
          if (
            latest.owner !== config.owner ||
            !latest.finance ||
            latest.finance.source !== current.finance!.source
          )
            throw new Error(
              "Copia escrita; no se pudo avanzar la revisión configurada. Revisa los recibos locales antes de repetir.",
            );
          writeConfig(
            { ...latest, finance: { ...latest.finance, source: output } },
            ctx.home,
          );
        });
        draft.sourceAfter = output;
        pending.text = JSON.stringify(draft);
      }
      if (result.status === "succeeded") delete ctx.conversation.pending;
      return JSON.stringify(result, null, 2);
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(lock);
    }
  }
  const command =
    /^(?:finanzas?|finance)\s+(recientes|mes)(?:\s+(\S+))?\s*$/i.exec(
      text.trim(),
    );
  if (command) {
    requirePermission("finance:read");
    const month = command[1]!.toLowerCase() === "mes" ? command[2] : null;
    if (month === undefined)
      return "Indica el mes: finanzas mes AAAA-MM. El resultado muestra importes registrados, no beneficio.";
    return JSON.stringify(
      await queryFinance({
        source: settings.source,
        month,
        limit:
          command[1]!.toLowerCase() === "recientes" && command[2]
            ? Number(command[2])
            : 10,
      }),
      null,
      2,
    );
  }
  const prepare = /^(?:finanzas?|finance)\s+proponer\s+([\s\S]+)$/i.exec(
    text.trim(),
  );
  if (prepare) {
    requirePermission("finance:copy");
    const draft = DraftSchema.parse(JSON.parse(prepare[1]!));
    if (
      !["Venta", "Ingreso", "Gasto", "Compra"].includes(
        draft.movement.operation,
      )
    )
      return "Deudas y transferencias requieren dirección, contrapartida y una regla de representación revisada en este libro. No se ha escrito nada.";
    if (draft.task) requirePermission("tasks:write");
    const input = {
      requestId: draft.requestId,
      finance: {
        source: settings.source,
        directory: settings.directory,
        movement: draft.movement,
      },
      ...(draft.task ? { task: draft.task } : {}),
    };
    if (!path.isAbsolute(settings.directory))
      throw new Error("Configura un directorio local absoluto de copias.");
    const sourceHash = workbookHash(settings.source);
    const hash = approvalHash(config.owner, input, sourceHash);
    ctx.conversation.pending = pendingFor(
      "finance",
      {
        text: JSON.stringify({ owner: config.owner, hash, input, sourceHash }),
      },
      ctx.now,
    );
    return `Vista previa local; sin escrituras:\n${JSON.stringify(input, null, 2)}\nRevisión SHA-256: ${sourceHash}\nPara aprobar exactamente esta propuesta: confirmar ${hash}. Para descartarla: cancelar.`;
  }
  return JSON.stringify(
    {
      ...previewFinanceMessage(text.replace(/^(?:finanzas?|finance)\s+/i, "")),
      next: "Completa explícitamente los campos y usa finanzas proponer {requestId,movement:{date,operation,person,account,amount,cashImpact,concept},task?:{text,due}}. Para consultas: finanzas recientes 10; finanzas mes AAAA-MM. No se infiere beneficio, deuda ni contrapartida.",
    },
    null,
    2,
  );
}
