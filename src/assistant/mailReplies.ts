import { redact as redactSecrets } from "../core/secrets.js";
import { gmailConnection, type MailContext } from "./mail.js";
import {
  getGmailReplies,
  createGmailWatch,
  listGmailWatches,
  cancelGmailWatch,
} from "./gmailWatch.js";

function minutes(value: string, unit: string): number {
  const amount =
    Number(value) * (/^d/i.test(unit) ? 1440 : /^h/i.test(unit) ? 60 : 1);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 525600)
    throw new Error("El plazo debe estar entre un minuto y un año.");
  return amount;
}
export async function handleMailReplies(
  input: string,
  ctx: MailContext,
): Promise<{ text: string } | null> {
  const text = input
    .trim()
    .replace(/^(?:oye|helen)[,\s]+/i, "")
    .replace(/^[¿¡]+|[?!¡¿.]+$/g, "");
  const read =
    /^(?:lee|resume)\s+(?:la\s+)?respuesta\s+de\s+(.+)$/i.exec(text) ??
    /^(.+?)\s+(?:me\s+)?ha\s+(?:respondido|contestado)(?:\s+al\s+correo(?:\s+que\s+le\s+envi[eé])?)?$/i.exec(
      text,
    ) ??
    /^ha\s+(?:respondido|contestado)\s+(.+?)(?:\s+al\s+correo)?$/i.exec(text);
  const watch =
    /^av[ií]same\s+cuando\s+(.+?)\s+(?:responda|conteste)(?:\s+y\s+recu[eé]rdamelo(?:\s+en\s+(\d+)\s+(minutos?|horas?|d[ií]as?))?)?$/i.exec(
      text,
    );
  const overdue =
    /^av[ií]same\s+si\s+(.+?)\s+no\s+(?:responde|contesta)\s+en\s+(\d+)\s+(minutos?|horas?|d[ií]as?)$/i.exec(
      text,
    );
  const list = /^mis\s+avisos\s+de\s+correo$/i.test(text);
  const cancel = /^cancela\s+seguimiento\s+([0-9a-f-]{36})$/i.exec(text);
  if (!read && !watch && !overdue && !list && !cancel) return null;
  if (!ctx.ownerVerified)
    throw new Error("El correo requiere un canal del propietario verificado.");
  ctx.signal?.throwIfAborted();
  if (list || cancel) {
    const owned = listGmailWatches(ctx.home).filter(
      (item) => item.owner === ctx.conversation.id,
    );
    if (cancel) {
      if (!owned.some((item) => item.id === cancel[1]))
        throw new Error("No encuentro ese seguimiento en esta conversación.");
      cancelGmailWatch(ctx.home, cancel[1]!);
      return { text: "Seguimiento y recordatorios pendientes cancelados." };
    }
    return {
      text:
        owned
          .filter((item) => item.state === "active")
          .map((item) => `Seguimiento ${item.id}`)
          .join("\n") ||
        "No tienes seguimientos de correo activos en esta conversación.",
    };
  }
  // Correspondence is private regardless of whether a heuristic detects sensitive words.
  if (read && !ctx.showSensitive)
    return {
      text: "Consulta la respuesta en un canal privado autorizado para mostrar información personal.",
    };
  const { config, options } = gmailConnection(ctx);
  if (read) {
    const replies = await getGmailReplies(
      ctx.home,
      config,
      { contact: read[1]!.trim() },
      options,
    );
    const latest = replies.at(-1);
    if (!latest)
      return {
        text: "Todavía no encuentro respuesta al correo enviado y verificado.",
      };
    const body = redactSecrets(latest.body);
    // shortcut: extractive summary without a model; semantic summaries require an authenticated model.
    const summary = /^resume/i.test(text)
      ? body
          .split(/(?<=[.!?])\s+|\n+/)
          .filter(Boolean)
          .slice(0, 3)
          .join(" ")
          .slice(0, 1200)
      : body;
    return {
      text: `${/^resume/i.test(text) ? "Extracto de la respuesta" : "Respuesta recibida"} de ${latest.from}\nAsunto: ${redactSecrets(latest.subject)}\n${summary || "El mensaje no contiene texto legible."}`,
    };
  }
  const contact = (watch?.[1] ?? overdue?.[1])!.trim();
  const automatic = !!watch && /recu[eé]rdamelo/i.test(text);
  const rule = createGmailWatch(
    ctx.home,
    config,
    {
      owner: ctx.conversation.id,
      channel: ctx.channel ?? "cli",
      conversation: ctx.conversation.id,
      contact,
      autoReminder: automatic,
      ...(automatic
        ? { reminderMinutes: watch?.[2] ? minutes(watch[2], watch[3]!) : 30 }
        : {}),
      ...(overdue
        ? { noReplyAfterMinutes: minutes(overdue[2]!, overdue[3]!) }
        : {}),
    },
    { now: ctx.now },
  );
  return {
    text: `Seguimiento activado (${rule.id}). Comprobaré el correo cada dos minutos mientras el servicio esté encendido.${automatic ? " También crearé un recordatorio para revisar la respuesta." : ""}${overdue ? " Te avisaré si vence el plazo sin respuesta." : ""}`,
  };
}
