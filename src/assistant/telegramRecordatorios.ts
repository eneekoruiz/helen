import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import {
  RecordatoriosHttpError,
  recordatoriosRawRequest,
} from "./recordatorios.js";
import type { TelegramOptions } from "./telegram.js";

const RemoteTask = z.object({
  id: z.string().min(1).max(200),
  version: z.number().int().nonnegative().safe(),
  deleted: z.boolean(),
  task: z.object({
    text: z.string().max(300),
    status: z.enum(["open", "done"]),
  }),
});
const usage =
  "Usa /recordatorios vincular <código>, /recordatorios tareas, /recordatorios añadir <texto> o /recordatorios completar <id> <versión>. El código se genera en los ajustes de tu cuenta de Recordatorios.";

/** Only an allowlisted private Telegram actor reaches the task-only service bridge. */
export async function handleTelegramRecordatorios(
  text: string,
  actor: {
    chat: number;
    sender?: number;
    type?: string;
    updateId: number;
    forwarded: boolean;
  },
  options: Pick<TelegramOptions, "config" | "env" | "fetcher" | "signal">,
): Promise<string> {
  const telegram = options.config.channels.telegram;
  if (
    actor.type !== "private" ||
    actor.sender !== actor.chat ||
    actor.forwarded ||
    !Number.isSafeInteger(actor.chat) ||
    actor.chat <= 0 ||
    !Number.isSafeInteger(actor.updateId) ||
    actor.updateId < 0 ||
    !telegram?.allowedChats.includes(actor.chat)
  )
    return "El puente requiere un mensaje propio en tu chat privado autorizado.";
  const bridge = telegram.recordatoriosBridge;
  if (!bridge?.enabled)
    return "El puente de Recordatorios está deshabilitado. Actívalo en la configuración local de Helen; no se ha enviado ninguna operación.";
  const secret = (options.env ?? process.env)[bridge.secretEnv];
  if (!secret || !/^[!-~]{32,16000}$/.test(secret))
    return "Falta un secreto de servicio válido en el entorno local. No pegues tokens ni contraseñas en el chat.";
  const command = text.trim().replace(/^\/recordatorios(?:\s+|$)/i, "");
  const link = /^vincular\s+([a-f0-9]{64})$/i.exec(command);
  const add = /^añadir\s+([\s\S]+)$/i.exec(command);
  const complete = /^completar\s+(\S{1,200})\s+(\d{1,15})$/i.exec(command);
  const read = /^tareas$/i.test(command);
  if (!link && !add && !complete && !read) return usage;
  const subject = String(actor.sender);
  const eventId = String(actor.updateId);
  let mutation:
    | {
        id: string;
        expectedVersion: number | null;
        patch: { text: string } | { status: "done" };
      }
    | undefined;
  if (add) {
    const title = add[1]!.trim();
    if (
      !title ||
      title.length > 300 ||
      [...title].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      findSecrets(title).length
    )
      return "La tarea necesita texto de hasta 300 caracteres, sin credenciales ni caracteres de control.";
    mutation = {
      id: `telegram-${subject}-${eventId}`,
      expectedVersion: null,
      patch: { text: title },
    };
  }
  if (complete) {
    const version = Number(complete[2]);
    if (!Number.isSafeInteger(version)) return usage;
    mutation = {
      id: complete[1]!,
      expectedVersion: version,
      patch: { status: "done" },
    };
  }
  try {
    const { result } = await recordatoriosRawRequest(
      bridge.url,
      secret,
      `/api/channel-bridge/telegram/${link ? "redeem" : "operations"}`,
      link
        ? { subject, code: link[1]!.toLowerCase() }
        : {
            subject,
            eventId,
            operation: mutation ? "write" : "read",
            ...(mutation ? { payload: { mutations: [mutation] } } : {}),
          },
      options,
    );
    if (result.uncertain === true)
      return "El resultado sigue sin confirmar. Consulta las tareas y el estado del vínculo antes de enviar otra operación; no repitas la escritura con un identificador nuevo.";
    if (link) {
      z.object({
        linked: z.literal(true),
        scopes: z
          .array(z.string())
          .refine(
            (scopes) =>
              scopes.includes("tasks:read") && scopes.includes("tasks:write"),
          ),
      }).parse(result);
      return "Vínculo de tareas confirmado por Recordatorios para este chat. Puedes usar /recordatorios tareas. Para revocarlo, abre los ajustes de tu cuenta. No habilita finanzas ni comandos de sistema.";
    }
    if (read) {
      const tasks = z
        .array(RemoteTask)
        .max(10000)
        .parse(result.tasks)
        .filter((task) => !task.deleted);
      return tasks.length
        ? tasks
            .slice(0, 5)
            .map(
              (task) =>
                `${task.task.status === "done" ? "Hecha" : "Pendiente"}: ${task.task.text.slice(0, 160)}\nID: ${task.id} · versión: ${task.version}`,
            )
            .join("\n\n") +
            (tasks.length > 5
              ? `\nY ${tasks.length - 5} más; consulta la aplicación.`
              : "")
        : "No hay tareas en la cuenta vinculada.";
    }
    const response = z
      .object({
        applied: z.array(RemoteTask).max(200),
        conflicts: z.array(RemoteTask).max(200),
      })
      .parse(result);
    if (response.conflicts.length)
      return "La tarea cambió o ya no existe: no se confirmó el cambio. Usa /recordatorios tareas y revisa su versión antes de volver a solicitarlo.";
    const applied = response.applied.find(
      (task) => task.id === mutation!.id && !task.deleted,
    );
    if (
      !applied ||
      (add
        ? applied.task.text !== add[1]!.trim()
        : applied.task.status !== "done")
    )
      return "No se ha confirmado el cambio esperado. Consulta las tareas antes de volver a solicitarlo.";
    return `${add ? "Tarea registrada" : "Tarea completada"} en Recordatorios.\nID: ${applied.id} · versión: ${applied.version}`;
  } catch (error) {
    if (error instanceof RecordatoriosHttpError && error.status === 409)
      return "Recordatorios rechazó el código o detectó un conflicto de evento. Revisa el vínculo y las tareas antes de enviar otra operación.";
    return "No se pudo confirmar la operación con Recordatorios. Revisa el vínculo, el secreto y las tareas desde la aplicación; una avería puede dejar una escritura parcial. No se ha creado una alternativa local.";
  }
}
