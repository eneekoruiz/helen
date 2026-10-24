import crypto from "node:crypto";
import { z } from "zod";
import { findSecrets, looksSensitive, redact } from "../core/secrets.js";
import { updateCollection } from "./store.js";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export const RegressionCaseSchema = z.object({
  id: z.string().uuid(),
  at: z.string().datetime(),
  timezone: z.string().min(1).max(100),
  requiresModel: z.boolean(),
  messages: z.array(MessageSchema).min(2).max(6),
  expected: z.string().min(1).max(1000),
});
export type RegressionCase = z.infer<typeof RegressionCaseSchema>;

/** Best-effort redaction: the owner must review names and indirect identifiers in the preview. */
function sanitize(text: string): string {
  if (findSecrets(text).length)
    throw new Error("No se guardan pruebas con credenciales.");
  const clean = redact(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d ()-]{5,}\d/g, (value) =>
      value.replace(/\D/g, "").length >= 7 ? "[number]" : value,
    );
  if (looksSensitive(clean))
    throw new Error("No se guardan pruebas con contenido sensible.");
  return clean;
}

export function prepareRegression(
  history: Array<{
    role: "user" | "assistant";
    content: string;
    sensitive: boolean;
  }>,
  expected: string,
  options: { now: Date; timezone: string; requiresModel: boolean },
): RegressionCase {
  const messages = history.slice(-6);
  if (messages.some((turn) => turn.sensitive))
    throw new Error("No se guardan pruebas de una conversación privada.");
  const example = RegressionCaseSchema.parse({
    id: crypto.randomUUID(),
    at: options.now.toISOString(),
    timezone: options.timezone,
    requiresModel: options.requiresModel,
    messages: messages.map(({ role, content }) => ({
      role,
      content: sanitize(content),
    })),
    expected: sanitize(expected),
  });
  if (JSON.stringify(example).length > 18000)
    throw new Error("La conversación es demasiado larga para esta prueba.");
  return example;
}

export function saveRegression(home: string, value: unknown): RegressionCase {
  const example = RegressionCaseSchema.parse(value);
  updateCollection(
    home,
    "assistant-regressions",
    RegressionCaseSchema,
    (items) => {
      if (items.some((item) => item.id === example.id)) return;
      if (items.length >= 100)
        throw new Error(
          "Límite de 100 pruebas: revisa y elimina ejemplos antiguos.",
        );
      items.push(example);
    },
  );
  return example;
}
