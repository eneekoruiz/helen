import { spawn } from "node:child_process";
import type { AssistantConfig } from "./home.js";
import { helenHome } from "./home.js";
import { recordatoriosPushChannel } from "./recordatoriosPush.js";

/**
 * Where HELEN speaks up on its own: reminders and the daily briefing. Local channels (the terminal running
 * the server, a desktop notification) may show private text; remote ones (webhook, ntfy, Telegram) only get
 * a neutral "you have a private reminder" for items marked sensitive.
 */
export interface Notification {
  id?: string;
  title: string;
  text: string;
  sensitive: boolean;
  kind: "reminder" | "briefing" | "test";
  lang: "es" | "en";
}

export interface DeliveryResult {
  channel: string;
  ok: boolean;
  /** The channel is not usable here (no notify-send, no token...): not a failure of this delivery. */
  skipped?: boolean;
  error?: string;
  uncertain?: boolean;
}

export interface DeliveryChannel {
  name: string;
  local: boolean;
  send(notification: Notification): Promise<void>;
}

export class ChannelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelUnavailableError";
  }
}

/** The provider explicitly rejected delivery; safe to retry without duplicating an accepted send. */
export class DeliveryRejectedError extends Error {}

const TIMEOUT_MS = 10_000;

function privateText(notification: Notification): string {
  if (notification.kind === "briefing")
    return notification.lang === "es"
      ? "Tu resumen del día está listo en HELEN."
      : "Your daily summary is ready in HELEN.";
  return notification.lang === "es"
    ? "Tienes un recordatorio privado: míralo en HELEN."
    : "You have a private reminder: check it in HELEN.";
}

/** The text a channel may carry. */
export function visibleText(
  notification: Notification,
  channel: Pick<DeliveryChannel, "local">,
): string {
  return notification.sensitive && !channel.local
    ? privateText(notification)
    : notification.text;
}

function run(
  program: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      stdio: "ignore",
      windowsHide: true,
      env,
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${program} did not finish in time`));
    }, TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? new ChannelUnavailableError(`${program} is not installed`)
          : error,
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${program} exited with code ${code}`));
    });
  });
}

/** A desktop notification with the tool each system already has. No text ever reaches a shell. */
export function desktopChannel(
  platform: NodeJS.Platform = process.platform,
): DeliveryChannel {
  return {
    name: "desktop",
    local: true,
    send: async (notification) => {
      const text = notification.text.slice(0, 500);
      if (platform === "darwin") {
        await run("osascript", [
          "-e",
          "on run argv",
          "-e",
          "display notification (item 1 of argv) with title (item 2 of argv)",
          "-e",
          "end run",
          text,
          notification.title,
        ]);
      } else if (platform === "win32") {
        // The script reads the text from the environment, so nothing the reminder says is parsed as PowerShell.
        const script = [
          "Add-Type -AssemblyName System.Windows.Forms",
          "$n = New-Object System.Windows.Forms.NotifyIcon",
          "$n.Icon = [System.Drawing.SystemIcons]::Information",
          "$n.Visible = $true",
          '$n.ShowBalloonTip(10000, $env:HELEN_NOTIFY_TITLE, $env:HELEN_NOTIFY_TEXT, "Info")',
          "Start-Sleep -Seconds 7",
          "$n.Dispose()",
        ].join("; ");
        await run(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            Buffer.from(script, "utf16le").toString("base64"),
          ],
          {
            ...process.env,
            HELEN_NOTIFY_TITLE: notification.title,
            HELEN_NOTIFY_TEXT: text,
          },
        );
      } else {
        await run("notify-send", [
          "--app-name=HELEN",
          notification.title,
          text,
        ]);
      }
    },
  };
}

export function consoleChannel(write: (line: string) => void): DeliveryChannel {
  return {
    name: "console",
    local: true,
    send: async (notification) => {
      write(`[${notification.title}] ${notification.text}`);
    },
  };
}

async function post(
  url: string,
  body: string,
  headers: Record<string, string>,
  fetcher: typeof fetch,
): Promise<void> {
  const response = await fetcher(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok)
    throw response.status >= 400 && response.status < 500
      ? new DeliveryRejectedError(
          `HTTP ${response.status} from ${new URL(url).host}`,
        )
      : new Error(`HTTP ${response.status} from ${new URL(url).host}`);
}

/** JSON, ntfy (push to a phone), Slack or Discord incoming webhooks. */
export function webhookChannel(
  webhook: NonNullable<AssistantConfig["channels"]["webhook"]>,
  fetcher: typeof fetch = fetch,
): DeliveryChannel {
  const channel: DeliveryChannel = {
    name: `webhook:${webhook.format}`,
    local: false,
    send: async (notification) => {
      const text = visibleText(notification, channel);
      if (webhook.format === "ntfy") {
        await post(
          webhook.url,
          text,
          {
            "Content-Type": "text/plain; charset=utf-8",
            Title: "HELEN",
            Tags: notification.kind === "reminder" ? "bell" : "calendar",
          },
          fetcher,
        );
      } else if (webhook.format === "slack") {
        await post(
          webhook.url,
          JSON.stringify({ text: `*${notification.title}*: ${text}` }),
          { "Content-Type": "application/json" },
          fetcher,
        );
      } else if (webhook.format === "discord") {
        await post(
          webhook.url,
          JSON.stringify({ content: `**${notification.title}**: ${text}` }),
          { "Content-Type": "application/json" },
          fetcher,
        );
      } else {
        await post(
          webhook.url,
          JSON.stringify({
            title: notification.title,
            text,
            kind: notification.kind,
            sensitive: notification.sensitive,
            at: new Date().toISOString(),
          }),
          { "Content-Type": "application/json" },
          fetcher,
        );
      }
    },
  };
  return channel;
}

/** Telegram messages to the allowed chats, with the bot token read from the environment (never stored). */
export function telegramChannel(
  telegram: NonNullable<AssistantConfig["channels"]["telegram"]>,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): DeliveryChannel {
  const channel: DeliveryChannel = {
    name: "telegram",
    local: false,
    send: async (notification) => {
      const token = env[telegram.tokenEnv];
      if (!token)
        throw new ChannelUnavailableError(`${telegram.tokenEnv} is not set`);
      if (telegram.allowedChats.length === 0)
        throw new ChannelUnavailableError("no allowed chats configured");
      const text = `${notification.kind === "reminder" ? "⏰ " : ""}${visibleText(notification, channel)}`;
      for (const chat of telegram.allowedChats) {
        await post(
          `https://api.telegram.org/bot${token}/sendMessage`,
          JSON.stringify({ chat_id: chat, text }),
          { "Content-Type": "application/json" },
          fetcher,
        );
      }
    },
  };
  return channel;
}

export interface ChannelOptions {
  home?: string;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  /** Where console notifications go (the server log); omitted: console channel off. */
  write?: (line: string) => void;
  platform?: NodeJS.Platform;
}

export function configuredChannels(
  config: AssistantConfig,
  options: ChannelOptions = {},
): DeliveryChannel[] {
  const channels: DeliveryChannel[] = [];
  if (config.recordatorios)
    channels.push(
      recordatoriosPushChannel(
        options.home ?? helenHome(),
        config.recordatorios,
        { fetcher: options.fetcher, env: options.env },
      ),
    );
  if (config.channels.console && options.write)
    channels.push(consoleChannel(options.write));
  if (config.channels.desktop) channels.push(desktopChannel(options.platform));
  if (config.channels.webhook)
    channels.push(webhookChannel(config.channels.webhook, options.fetcher));
  if (config.channels.telegram) {
    for (const chat of config.channels.telegram.allowedChats) {
      const channel = telegramChannel(
        { ...config.channels.telegram, allowedChats: [chat] },
        options.env,
        options.fetcher,
      );
      channel.name = `telegram:${chat}`;
      channels.push(channel);
    }
  }
  return channels;
}

/** Send to every channel; a failing channel never stops the others. */
export async function deliver(
  notification: Notification,
  channels: DeliveryChannel[],
): Promise<DeliveryResult[]> {
  return Promise.all(
    channels.map(async (channel) => {
      try {
        await channel.send(notification);
        return { channel: channel.name, ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return error instanceof ChannelUnavailableError
          ? { channel: channel.name, ok: false, skipped: true, error: message }
          : {
              channel: channel.name,
              ok: false,
              uncertain: !(error instanceof DeliveryRejectedError),
              error: message,
            };
      }
    }),
  );
}

/** Delivered means someone could see it: any channel other than the log, or the log when it is all there is. */
export function wasDelivered(results: DeliveryResult[]): boolean {
  const real = results.filter((result) => result.channel !== "console");
  if (real.some((result) => result.ok)) return true;
  return (
    real.every((result) => result.skipped) &&
    results.some((result) => result.channel === "console" && result.ok)
  );
}
