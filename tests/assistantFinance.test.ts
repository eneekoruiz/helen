import { expect, it } from "vitest";
import {
  FinanceCopySchema,
  previewFinanceMessage,
} from "../src/assistant/finance.js";

it("previews the requested sale and follow-up without guessing an account or settlement", () => {
  const result = previewFinanceMessage(
    "He vendido una camiseta por 20 €; recuérdame mañana enviarla",
  );
  expect(result).toMatchObject({
    writes: false,
    status: "needs-clarification",
    proposal: {
      operation: "Venta",
      amount: "20",
      concept: "una camiseta",
      reminder: "recuérdame mañana enviarla",
    },
  });
  expect(result.missing).toContain("cuenta o caja");
  expect(
    previewFinanceMessage("He vendido algo por 25,50 euros"),
  ).toMatchObject({ proposal: { amount: "25.50" } });
  for (const text of [
    "He vendido algo",
    "He vendido algo por 0 €",
    "He vendido algo por 1.999 €",
    "Compra algo por 20 €",
  ]) {
    expect(previewFinanceMessage(text)).not.toHaveProperty("proposal");
  }
});

it("requires complete explicit accounting fields and refuses extra executable instructions", () => {
  const valid = {
    source: "source.xlsx",
    directory: "copies",
    requestId: "sale-1",
    movement: {
      date: "2026-11-04",
      operation: "Venta",
      person: "",
      account: "Caja",
      amount: "20.00",
      cashImpact: "0.00",
      concept: "Venta pendiente",
    },
  };
  expect(FinanceCopySchema.safeParse(valid).success).toBe(true);
  expect(
    FinanceCopySchema.safeParse({ ...valid, command: "anything" }).success,
  ).toBe(false);
  expect(
    FinanceCopySchema.safeParse({
      ...valid,
      movement: { ...valid.movement, account: "" },
    }).success,
  ).toBe(false);
  expect(
    FinanceCopySchema.safeParse({
      ...valid,
      movement: { ...valid.movement, amount: "1.001" },
    }).success,
  ).toBe(false);
});
