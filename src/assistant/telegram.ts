import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { handleMessage } from "./brain.js";
import { createCapture, extractCaptureAttachment } from "./capture.js";
import { getConversation, saveConversation } from "./conversation.js";
import { looksSensitive, redact } from "../core/secrets.js";
import { withHomeLock, writePrivate, type AssistantConfig } from "./home.js";
import type { LanguageModel } from "./llm.js";
import {
  completeTask,
  listTasks,
  rescheduleOverdueTasks,
  TaskSchema,
} from "./tasks.js";
import { completeShoppingItem, shoppingList } from "./shopping.js";
import { updateCollection } from "./store.js";
import { fold } from "./text.js";

/**
 * Talk to HELEN from Telegram: a bot of your own (created with @BotFather) that long-polls Telegram, so the
 * server needs no public address. Only chats on the allow list are answered; anyone else is told their chat id
 * and how the owner can allow it, and learns nothing else. The bot token stays in an environment variable.
 */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    from?: { id?: number; first_name?: string; username?: string };
    text?: string;
    voice?: { file_id: string; mime_type?: string; file_size?: number };
    photo?: Array<{
      file_id: string;
      file_size?: number;
      width?: number;
      height?: number;
    }>;
    document?: {
      file_id: string;
      mime_type?: string;
      file_size?: number;
      file_name?: string;
    };
    caption?: string;
    forward_origin?: unknown;
    forward_date?: number;
    forward_from?: unknown;
    forward_from_chat?: unknown;
    forward_sender_name?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; username?: string };
    message?: {
      message_id: number;
      chat: { id: number; type?: string };
      text?: string;
      forward_origin?: unknown;
      forward_date?: number;
      forward_from?: unknown;
      forward_from_chat?: unknown;
      forward_sender_name?: string;
    };
    data?: string;
  };
}
function isForwarded(message: object): boolean {
  return [
    "forward_origin",
    "forward_date",
    "forward_from",
    "forward_from_chat",
    "forward_sender_name",
  ].some((key) => (message as Record<string, unknown>)[key] !== undefined);
}

export interface TelegramOptions {
  home: string;
  config: AssistantConfig;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  log?: (message: string) => void;
  model?: LanguageModel | null;
  /** Seconds Telegram holds a getUpdates call open (long polling). */
  pollSeconds?: number;
}

function stateFile(home: string): string {
  return path.join(home, "telegram-state.json");
}

function readOffset(home: string): number {
  try {
    const value = (
      JSON.parse(fs.readFileSync(stateFile(home), "utf8")) as {
        offset?: number;
      }
    ).offset;
    return Number.isInteger(value) ? value! : 0;
  } catch {
    return 0;
  }
}

/** Telegram commands are shortcuts for sentences HELEN already understands. */
export function commandToText(text: string, lang: "es" | "en"): string {
  const match = /^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return text;
  const rest = match[2]?.trim() ?? "";
  const es = lang === "es";
  switch (match[1]!.toLowerCase()) {
    case "start":
      return es ? "hola" : "hello";
    case "ayuda":
    case "help":
      return es ? "ayuda" : "help";
    case "agenda":
    case "hoy":
    case "today":
      return es ? "qué tengo hoy" : "what do I have today";
    case "manana":
    case "tomorrow":
      return es ? "qué tengo mañana" : "what do I have tomorrow";
    case "semana":
    case "week":
      return es ? "agenda de esta semana" : "my agenda for this week";
    case "compra":
    case "shopping":
      return rest
        ? es
          ? `añade ${rest} a la lista de la compra`
          : `add ${rest} to my shopping list`
        : es
          ? "qué hay en la lista de la compra"
          : "what's on my shopping list";
    case "tareas":
    case "tasks":
      return es ? "qué tengo pendiente" : "what do I need to do";
    case "tarea":
    case "task":
      return rest
        ? es
          ? `añade la tarea ${rest}`
          : `add task ${rest}`
        : es
          ? "qué tengo pendiente"
          : "what do I need to do";
    case "urgente":
    case "urgent":
      return es ? "qué es lo más urgente" : "what is most urgent";
    case "cierre":
    case "shutdown":
      return es ? "cierro por hoy" : "daily shutdown";
    case "kickoff":
      return es ? "cómo arranco mañana" : "morning kickoff";
    case "hueco":
    case "slot":
      return es ? "qué puedo hacer en este hueco" : "what can i do now";
    case "codex":
      return es ? "qué estábamos haciendo en codex" : "codex status";
    case "paso":
    case "step":
      return rest
        ? es
          ? `siguiente paso de ${rest}`
          : `next step of ${rest}`
        : es
          ? "siguiente paso"
          : "next step";
    case "hecho":
    case "done":
      return rest
        ? es
          ? `marca como hecho ${rest}`
          : `mark as done ${rest}`
        : es
          ? "completa el siguiente paso"
          : "complete next step";
    case "planifica":
    case "plan":
      return rest
        ? es
          ? `planifica mi dia con ${rest}`
          : `plan my day with ${rest}`
        : es
          ? "planifica mi dia"
          : "plan my day";
    case "huecos":
    case "slots":
      return es ? "huecos libres hoy" : "free slots today";
    case "recordatorios":
    case "reminders":
      return es ? "qué recordatorios tengo" : "what reminders do I have";
    case "recuerda":
    case "remember":
      return rest
        ? es
          ? `recuerda que ${rest}`
          : `remember that ${rest}`
        : es
          ? "ayuda"
          : "help";
    case "recuerdame":
    case "remind":
      return rest
        ? es
          ? `recuérdame ${rest}`
          : `remind me ${rest}`
        : es
          ? "ayuda"
          : "help";
    case "busca":
    case "search":
      return rest
        ? es
          ? `qué sabes de ${rest}`
          : `what do you know about ${rest}`
        : es
          ? "ayuda"
          : "help";
    default:
      return rest || (es ? "ayuda" : "help");
  }
}

async function call<T>(
  fetcher: typeof fetch,
  token: string,
  method: string,
  body: unknown,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetcher(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
    },
  );
  const data = (await response.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  if (!response.ok || !data.ok)
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${data.description ?? ""}`.trim(),
    );
  return data.result as T;
}

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

async function downloadMedia(
  file: { file_id: string; file_size?: number },
  options: TelegramOptions & { token: string },
): Promise<Buffer> {
  const id = z.string().min(1).max(500).parse(file.file_id);
  if (file.file_size !== undefined)
    z.number().int().min(1).max(MAX_MEDIA_BYTES).parse(file.file_size);
  const fetcher = options.fetcher ?? fetch;
  const metadata = z
    .object({
      file_path: z.string().min(1).max(500),
      file_size: z.number().int().min(1).max(MAX_MEDIA_BYTES).optional(),
    })
    .parse(
      await call(
        fetcher,
        options.token,
        "getFile",
        { file_id: id },
        15_000,
        options.signal,
      ),
    );
  if (
    !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(metadata.file_path) ||
    metadata.file_path.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error("Telegram returned an unsafe file path.");
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
    : AbortSignal.timeout(15_000);
  const response = await fetcher(
    `https://api.telegram.org/file/bot${options.token}/${metadata.file_path}`,
    { redirect: "error", signal },
  );
  if (!response.ok || response.status >= 300 || !response.body)
    throw new Error("Telegram media download failed.");
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_MEDIA_BYTES)) {
    await response.body.cancel();
    throw new Error("Telegram attachment exceeds 10 MiB.");
  }
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_MEDIA_BYTES)
        throw new Error("Telegram attachment exceeds 10 MiB.");
      chunks.push(chunk.value);
    }
    if (!size) throw new Error("Telegram attachment is empty.");
    return Buffer.concat(chunks, size);
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

async function mediaMessage(
  update: TelegramUpdate,
  options: TelegramOptions & { token: string },
  lang: "es" | "en",
): Promise<string> {
  const message = update.message!;
  const es = lang === "es";
  const voice = message.voice;
  const photo = message.photo?.at(-1);
  const file = voice ?? photo ?? message.document;
  if (!file) throw new Error("No supported attachment found.");
  let mime = voice
    ? (voice.mime_type ?? "audio/ogg")
    : photo
      ? "image/jpeg"
      : (message.document?.mime_type ?? "");
  const allowed = voice
    ? ["audio/ogg", "audio/mpeg", "audio/wav"]
    : photo
      ? ["image/jpeg", "image/png"]
      : ["application/pdf", "text/plain", "text/markdown"];
  if (!allowed.includes(mime))
    throw new Error(
      es
        ? "Formato no compatible. Usa voz OGG/MP3/WAV, foto JPEG/PNG o documento PDF/texto."
        : "Unsupported format. Use OGG/MP3/WAV voice, JPEG/PNG photos or PDF/text documents.",
    );
  const extractor = options.config.capture?.extractor;
  if (!mime.startsWith("text/") && !extractor)
    throw new Error(
      es
        ? "Configura capture.extractor con un transcriptor/OCR local de confianza para procesar voz, fotos o PDF."
        : "Configure capture.extractor with a trusted local transcription/OCR command to process voice, photos or PDF.",
    );
  const data = await downloadMedia(file, options);
  if (
    photo &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    mime = "image/png";
  const transcript = await extractCaptureAttachment({ data, mime }, extractor);
  options.signal?.throwIfAborted();
  const forwarded =
    message.forward_origin !== undefined ||
    message.forward_date !== undefined ||
    message.forward_from !== undefined ||
    message.forward_from_chat !== undefined ||
    message.forward_sender_name !== undefined;
  if (voice && !forwarded) {
    if (transcript.length > 4000)
      throw new Error(
        es
          ? "La transcripción supera 4000 caracteres; divide el audio para revisar cada petición completa."
          : "The transcript exceeds 4000 characters; split the audio so each complete request can be reviewed.",
      );
    const reply = await handleMessage(commandToText(transcript, lang), {
      home: options.home,
      channel: "telegram",
      conversation: String(message.chat.id),
      config: options.config,
      ownerVerified: true,
      requestId: `telegram-${update.update_id}`,
      signal: options.signal,
      fetcher: options.fetcher,
      ...(options.model !== undefined ? { model: options.model } : {}),
    });
    return reply.text || reply.speech;
  }
  return stageTelegramSource(
    [transcript, message.caption].filter(Boolean).join("\n"),
    message.chat.id,
    options,
    lang,
  );
}

async function stageTelegramSource(
  source: string,
  chat: number,
  options: TelegramOptions & { token: string },
  lang: "es" | "en",
): Promise<string> {
  const es = lang === "es";
  const now = new Date();
  const owner = `telegram:${chat}`;
  if (
    !options.config.privacy.showSensitiveOn.includes("telegram") &&
    looksSensitive(source)
  )
    return es
      ? "El archivo contiene información privada. Revísalo desde un canal autorizado para datos sensibles; no se guardó ni se ejecutó su contenido."
      : "The file contains private information. Review it from a channel authorized for sensitive data; its content was neither saved nor executed.";
  const draft = await createCapture(
    options.home,
    { owner, text: source },
    {
      now,
      timezone: options.config.timezone,
      locale: options.config.locale,
      defaultTime: options.config.defaultTime,
    },
  );
  const preview = `${es ? "Borrador del archivo; su contenido no se ejecutó ni se añadieron tareas." : "File draft; its content was not executed and no tasks were added."}\n${draft.items.map((item, index) => `${index + 1}. ${item.text}${item.due ? ` — ${item.due}` : ""}${item.missing.length ? ` (${item.missing.join("; ")})` : ""}`).join("\n")}\n${es ? "Revisa todos los elementos y responde sí para guardarlos o no para cancelar." : "Review all items and reply yes to save them or no to cancel."}`;
  if (preview.length > 3900)
    throw new Error(
      es
        ? "La vista previa no cabe en un mensaje; divide el archivo antes de aprobar elementos."
        : "The complete preview does not fit in one message; split the file before approving items.",
    );
  const conversation = getConversation(options.home, owner, now);
  conversation.pending = {
    kind: "capture",
    text: JSON.stringify({
      id: draft.id,
      version: draft.version,
      items: draft.items,
    }),
    expires: new Date(now.getTime() + 10 * 60000).toISOString(),
  };
  saveConversation(options.home, conversation, now);
  return preview;
}

/** Answer one update; returns what was sent (for logs and tests). */
export async function handleUpdate(
  update: TelegramUpdate,
  options: TelegramOptions & { token: string; now?: Date },
): Promise<string | null> {
  const fetcher = options.fetcher ?? fetch;
  const telegram = options.config.channels.telegram!;
  const lang = options.config.locale.startsWith("es") ? "es" : "en";
  const es = lang === "es";

  // Manejo de botones interactivos (Inline Keyboards)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chat = cb.message?.chat.id;

    if (
      !cb.message ||
      chat === undefined ||
      !telegram.allowedChats.includes(chat) ||
      cb.message.chat.type !== "private" ||
      cb.from?.id !== chat ||
      isForwarded(cb.message)
    ) {
      await call(
        fetcher,
        options.token,
        "answerCallbackQuery",
        {
          callback_query_id: cb.id,
          text: es ? "Chat no autorizado." : "Unauthorized chat.",
        },
        10_000,
        options.signal,
      );
      return null;
    }

    const data = cb.data ?? "";
    let toast = es ? "Botón no válido." : "Invalid button.";
    let refreshed: ReturnType<typeof shoppingList> | undefined;
    const shoppingDone = /^shop:done:(t[0-9a-f]{6}):(\d{1,5})$/.exec(data);
    const shoppingPage = /^shop:page:(\d{1,5})$/.exec(data);

    if (shoppingDone || shoppingPage) {
      try {
        if (shoppingDone)
          completeShoppingItem(options.home, shoppingDone[1]!, options.now);
        refreshed = shoppingList(
          options.home,
          lang,
          Number(shoppingDone?.[2] ?? shoppingPage?.[1]),
        );
        toast = shoppingDone
          ? es
            ? "✓ Producto tachado"
            : "✓ Item checked off"
          : es
            ? "Lista actualizada"
            : "List updated";
      } catch {
        toast = es
          ? "Ese producto ya no está disponible."
          : "That shopping item is unavailable.";
      }
    } else if (/^done:t[0-9a-f]{6}$/.test(data)) {
      const taskId = data.slice(5);
      try {
        withHomeLock(options.home, () => {
          const task = listTasks(options.home, { status: "all" }).find(
            (item) => item.id === taskId,
          );
          if (!task)
            throw new Error(es ? "Tarea no encontrada." : "Task not found.");
          if (task.status !== "done")
            completeTask(options.home, task.id, options.now ?? new Date());
        });
        toast = es ? "✓ Tarea completada" : "✓ Task completed";
      } catch (e) {
        toast = (e as Error).message;
      }
    } else if (/^snooze:t[0-9a-f]{6}$/.test(data)) {
      try {
        const tomorrow = new Date(
          (options.now ?? new Date()).getTime() + 86_400_000,
        );
        updateCollection(options.home, "tasks", TaskSchema, (items) => {
          const task = items.find(
            (item) => item.id === data.slice(7) && item.status === "open",
          );
          if (!task)
            throw new Error(es ? "Tarea no encontrada." : "Task not found.");
          task.due = tomorrow.toISOString();
          task.updated = (options.now ?? new Date()).toISOString();
        });
        toast = es ? "📅 Tarea pospuesta 1 día" : "📅 Task postponed 1 day";
      } catch (e) {
        toast = (e as Error).message;
      }
    } else if (data === "snooze_overdue") {
      try {
        const tomorrow = new Date(
          (options.now ?? new Date()).getTime() + 86_400_000,
        );
        rescheduleOverdueTasks(
          options.home,
          tomorrow,
          options.now ?? new Date(),
        );
        toast = es
          ? "📅 Vencidas pospuestas a mañana"
          : "📅 Overdue postponed to tomorrow";
      } catch (e) {
        toast = (e as Error).message;
      }
    }

    await call(
      fetcher,
      options.token,
      "answerCallbackQuery",
      {
        callback_query_id: cb.id,
        text: redact(toast.replaceAll(options.token, "<token>")).slice(0, 180),
      },
      10_000,
      options.signal,
    );

    if (cb.message?.message_id && cb.message.text) {
      await call(
        fetcher,
        options.token,
        "editMessageText",
        {
          chat_id: chat,
          message_id: cb.message.message_id,
          text:
            refreshed?.text ??
            `${cb.message.text.slice(0, 3700)}\n\n[${redact(toast).slice(0, 180)}]`,
          ...(refreshed
            ? { reply_markup: { inline_keyboard: refreshed.buttons } }
            : {}),
        },
        10_000,
        options.signal,
      ).catch(() => {});
    }

    return toast;
  }

  const message = update.message;
  if (
    !message ||
    (!message.text &&
      !message.voice &&
      !message.photo?.length &&
      !message.document)
  )
    return null;

  const chat = message.chat.id;
  let text: string;
  let buttons:
    Array<Array<{ text: string; callback_data: string }>> | undefined =
    undefined;

  if (!telegram.allowedChats.includes(chat)) {
    text =
      lang === "es"
        ? `Este chat no está autorizado. Si eres el dueño de este HELEN, ejecuta en tu ordenador:\nhelen assistant telegram allow ${chat}`
        : `This chat is not allowed. If you own this HELEN, run on your computer:\nhelen assistant telegram allow ${chat}`;
    options.log?.(
      `Telegram: message from a chat that is not allowed (${chat}).`,
    );
  } else if (message.chat.type !== "private" || message.from?.id !== chat) {
    text =
      lang === "es"
        ? "Las gestiones y los archivos personales solo se procesan en un chat privado autorizado."
        : "Personal requests and files are only processed in an authorized private chat.";
  } else if (message.voice || message.photo?.length || message.document) {
    if (
      message.chat.type !== "private" ||
      (message.from?.id !== undefined && message.from.id !== chat)
    )
      text =
        lang === "es"
          ? "Envía el archivo desde tu chat privado autorizado."
          : "Send the file from your authorized private chat.";
    else
      try {
        text = await mediaMessage(update, options, lang);
      } catch (error) {
        if (options.signal?.aborted) throw error;
        text = `${lang === "es" ? "No pude procesar el archivo" : "Could not process the file"}: ${redact((error as Error).message.replaceAll(options.token, "<token>"))}`;
      }
  } else if (
    message.forward_origin !== undefined ||
    message.forward_date !== undefined ||
    message.forward_from !== undefined ||
    message.forward_from_chat !== undefined ||
    message.forward_sender_name !== undefined
  ) {
    if (message.chat.type !== "private")
      text =
        lang === "es"
          ? "Reenvía el texto desde tu chat privado autorizado."
          : "Forward text from your authorized private chat.";
    else
      try {
        text = await stageTelegramSource(message.text!, chat, options, lang);
      } catch (error) {
        text = redact(
          (error as Error).message.replaceAll(options.token, "<token>"),
        );
      }
  } else if (
    /^(?:que hay en la lista de la compra|what's on my shopping list|lista de la compra|shopping list)[.!?]?$/.test(
      fold(commandToText(message.text!, lang)),
    )
  ) {
    const shopping = shoppingList(options.home, lang);
    text = shopping.text;
    buttons = shopping.buttons;
  } else {
    const reply = await handleMessage(commandToText(message.text!, lang), {
      home: options.home,
      channel: "telegram",
      conversation: String(chat),
      config: options.config,
      ownerVerified:
        message.chat.type === "private" &&
        message.from?.id === chat &&
        (options.config.channels.telegram?.allowedChats ?? []).includes(chat),
      requestId: `telegram-${update.update_id}`,
      signal: options.signal,
      fetcher: options.fetcher,
      ...(options.now ? { now: options.now } : {}),
      ...(options.model !== undefined ? { model: options.model } : {}),
    });
    text = reply.text || reply.speech;
    buttons = reply.buttons;
  }
  await call(
    fetcher,
    options.token,
    "sendMessage",
    {
      chat_id: chat,
      text: text.slice(0, 4000),
      reply_to_message_id: message.message_id,
      ...(buttons && buttons.length > 0
        ? { reply_markup: { inline_keyboard: buttons } }
        : {}),
    },
    15_000,
    options.signal,
  );
  return text;
}

/** Long-poll until aborted. Network errors back off and retry; the offset survives restarts. */
export async function runTelegramBot(options: TelegramOptions): Promise<void> {
  const telegram = options.config.channels.telegram;
  if (!telegram)
    throw new Error(
      'Telegram is not configured: helen assistant config set channels.telegram \'{"tokenEnv":"HELEN_TELEGRAM_TOKEN"}\'',
    );
  const env = options.env ?? process.env;
  const token = env[telegram.tokenEnv];
  if (!token)
    throw new Error(
      `Set ${telegram.tokenEnv} to your bot token (from @BotFather).`,
    );
  const fetcher = options.fetcher ?? fetch;
  const poll = options.pollSeconds ?? 50;
  let offset = readOffset(options.home);
  let backoff = 1000;
  const pending = new Set<Promise<void>>();
  while (!options.signal?.aborted) {
    try {
      if (pending.size >= 16) await Promise.race(pending);
      if (options.signal?.aborted) break;
      const updates = await call<TelegramUpdate[]>(
        fetcher,
        token,
        "getUpdates",
        {
          offset,
          timeout: poll,
          limit: Math.max(1, 16 - pending.size),
          allowed_updates: ["message", "callback_query"],
        },
        (poll + 10) * 1000,
        options.signal,
      );
      for (const update of updates) {
        if (pending.size >= 16) await Promise.race(pending);
        if (options.signal?.aborted) break;
        offset = update.update_id + 1;
        // Saved before answering: a crash never makes HELEN answer the same message twice.
        writePrivate(
          stateFile(options.home),
          `${JSON.stringify({ offset })}\n`,
        );
        // Keep polling so an authorized stop message can interrupt a slow model response.
        const task = handleUpdate(update, { ...options, token })
          .then(() => undefined)
          .catch((error) => {
            options.log?.(
              `Telegram: could not answer an update: ${(error as Error).message}`,
            );
          })
          .finally(() => pending.delete(task));
        pending.add(task);
      }
      backoff = 1000;
    } catch (error) {
      if (options.signal?.aborted) break;
      options.log?.(
        `Telegram: ${(error as Error).message.replaceAll(token, "<token>")}; retrying in ${Math.round(backoff / 1000)} s.`,
      );
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, backoff);
        options.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      backoff = Math.min(backoff * 2, 60_000);
    }
  }
  await Promise.allSettled(pending);
}
