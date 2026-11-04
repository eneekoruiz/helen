import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const decimal = z.string().regex(/^-?\d{1,10}(?:\.\d{1,2})?$/);
const cents = (value: string) =>
  BigInt(value.replace(".", "").replace(/^-/, "")) *
  (value.includes(".") ? (value.split(".")[1]!.length === 1 ? 10n : 1n) : 100n);
export const FinanceMovementSchema = z
  .object({
    date: z.string().date(),
    operation: z.string().trim().min(1).max(500),
    person: z.string().trim().max(500),
    account: z.string().trim().min(1).max(500),
    amount: decimal.refine(
      (value) => !value.startsWith("-") && /[1-9]/.test(value),
      "Amount must be positive",
    ),
    cashImpact: decimal,
    concept: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine((value) => {
    try {
      return cents(value.cashImpact) <= cents(value.amount);
    } catch {
      return false;
    }
  }, "Cash impact cannot exceed amount");
export const FinanceCopySchema = z
  .object({
    source: z.string().min(1).max(4096),
    directory: z.string().min(1).max(4096),
    requestId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    movement: FinanceMovementSchema,
  })
  .strict();
export const FinanceResultSchema = z.object({
  output: z.string(),
  row: z.number().int().positive(),
  duplicate: z.boolean(),
  recalculation: z.literal("pending-excel"),
});

/** Only explicit, locally reviewed movements reach the offline copy writer. */
function runFinance(request: unknown, query = false): Promise<unknown> {
  const script = fileURLToPath(
    new URL("../../scripts/finance-workbook.py", import.meta.url),
  );
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.platform === "win32" ? "py" : "python3",
      [
        ...(process.platform === "win32" ? ["-3"] : []),
        script,
        ...(query ? ["query"] : []),
      ],
      {
        timeout: 15000,
        maxBuffer: 65536,
        windowsHide: true,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          USERPROFILE: process.env.USERPROFILE,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          APPDATA: process.env.APPDATA,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
          PYTHON_MANAGER_AUTOMATIC_INSTALL: "false",
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
      },
      (error, stdout) => {
        try {
          const result = JSON.parse(stdout) as unknown;
          if (error)
            throw new Error(
              "Finance copy failed; source unchanged. Inspect the local revision/lock before retrying.",
            );
          resolve(result);
        } catch {
          reject(
            new Error(
              "Finance copy failed; source unchanged. Check Python 3.11+, the workbook mapping and the local revision/lock.",
            ),
          );
        }
      },
    );
    child.stdin?.on("error", () => {
      /* The exit callback reports a closed child. */
    });
    child.stdin?.end(JSON.stringify(request));
  });
}

export async function writeFinanceCopy(input: unknown) {
  return FinanceResultSchema.parse(
    await runFinance(FinanceCopySchema.parse(input)),
  );
}

export const FinanceQuerySchema = z
  .object({
    source: FinanceCopySchema.shape.source,
    month: z
      .string()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/)
      .nullable()
      .default(null),
    limit: z.number().int().min(1).max(100).default(10),
  })
  .strict();

export async function queryFinance(input: unknown) {
  return z
    .object({
      sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
      month: z.string().nullable(),
      count: z.number().int().nonnegative(),
      recent: z.array(
        FinanceMovementSchema.safeExtend({ row: z.number().int().positive() }),
      ),
      amountByOperation: z.record(
        z.string(),
        z.string().regex(/^-?\d+(?:\.\d{2})$/),
      ),
      cashImpactByAccount: z.record(
        z.string(),
        z.string().regex(/^-?\d+(?:\.\d{2})$/),
      ),
      interpretation: z.string(),
    })
    .parse(await runFinance(FinanceQuerySchema.parse(input), true));
}

/** A proposal only: account, settlement and date are never inferred from a sale. */
export function previewFinanceMessage(text: string) {
  const value = z.string().trim().min(1).max(2000).parse(text);
  const sale =
    /^(he vendido|he ingresado|he gastado|he comprado|debo|me deben|he transferido)\s+(.+?)\s+por\s+(\d{1,10}(?:[.,]\d{1,2})?)\s*(?:€|euros?)(?:\s*;\s*(.+))?\s*$/i.exec(
      value,
    );
  if (!sale || !/[1-9]/.test(sale[3]!))
    return {
      status: "needs-clarification" as const,
      missing: ["operación, importe y concepto"],
      writes: false as const,
    };
  return {
    status: "needs-clarification" as const,
    writes: false as const,
    proposal: {
      operation: (
        {
          "he vendido": "Venta",
          "he ingresado": "Ingreso",
          "he gastado": "Gasto",
          "he comprado": "Compra",
          debo: "Deuda",
          "me deben": "Deuda",
          "he transferido": "Transferencia",
        } as Record<string, string>
      )[sale[1]!.toLowerCase()]!,
      amount: sale[3]!.replace(",", "."),
      concept: sale[2]!,
      ...(sale[4] ? { reminder: sale[4] } : {}),
    },
    missing: [
      "fecha",
      "cuenta o caja",
      "cobro recibido o pendiente (impacto en caja)",
      "persona asociada, si corresponde",
      ...(/debo|me deben|transferido/i.test(sale[1]!)
        ? [
            "dirección y contrapartida; regla contable revisada para deuda o transferencia",
          ]
        : []),
    ],
  };
}
