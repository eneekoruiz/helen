import fs from "node:fs";
import path from "node:path";
import { handleMessage } from "./brain.js";
import { writePrivate, type AssistantConfig } from "./home.js";
import type { LanguageModel } from "./llm.js";

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
    from?: { first_name?: string; username?: string };
    text?: string;
  };
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

/** Answer one update; returns what was sent (for logs and tests). */
export async function handleUpdate(
  update: TelegramUpdate,
  options: TelegramOptions & { token: string },
): Promise<string | null> {
  const message = update.message;
  if (!message?.text) return null;
  const fetcher = options.fetcher ?? fetch;
  const telegram = options.config.channels.telegram!;
  const chat = message.chat.id;
  const lang = options.config.locale.startsWith("es") ? "es" : "en";
  let text: string;
  if (!telegram.allowedChats.includes(chat)) {
    text =
      lang === "es"
        ? `Este chat no está autorizado. Si eres el dueño de este HELEN, ejecuta en tu ordenador:\nhelen assistant telegram allow ${chat}`
        : `This chat is not allowed. If you own this HELEN, run on your computer:\nhelen assistant telegram allow ${chat}`;
    options.log?.(
      `Telegram: message from a chat that is not allowed (${chat}).`,
    );
  } else {
    const reply = await handleMessage(commandToText(message.text, lang), {
      home: options.home,
      channel: "telegram",
      conversation: String(chat),
      config: options.config,
      ...(options.model !== undefined ? { model: options.model } : {}),
    });
    text = reply.text || reply.speech;
  }
  await call(
    fetcher,
    options.token,
    "sendMessage",
    {
      chat_id: chat,
      text: text.slice(0, 4000),
      reply_to_message_id: message.message_id,
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
  while (!options.signal?.aborted) {
    try {
      const updates = await call<TelegramUpdate[]>(
        fetcher,
        token,
        "getUpdates",
        { offset, timeout: poll, allowed_updates: ["message"] },
        (poll + 10) * 1000,
        options.signal,
      );
      for (const update of updates) {
        offset = update.update_id + 1;
        // Saved before answering: a crash never makes HELEN answer the same message twice.
        writePrivate(
          stateFile(options.home),
          `${JSON.stringify({ offset })}\n`,
        );
        try {
          await handleUpdate(update, { ...options, token });
        } catch (error) {
          options.log?.(
            `Telegram: could not answer an update: ${(error as Error).message}`,
          );
        }
      }
      backoff = 1000;
    } catch (error) {
      if (options.signal?.aborted) break;
      options.log?.(
        `Telegram: ${(error as Error).message.replace(token, "<token>")}; retrying in ${Math.round(backoff / 1000)} s.`,
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
}
