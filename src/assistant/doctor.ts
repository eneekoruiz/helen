import fs from "node:fs";
import path from "node:path";
import { homePermissionProblems, readConfig } from "./home.js";
import { deliveryStatus } from "./scheduler.js";
import { isValidTimeZone } from "./time.js";
import { readGmailConnection } from "./gmailAuth.js";
import { listGmailDrafts } from "./gmail.js";
import { recordatoriosStatus } from "./recordatorios.js";

export interface AssistantDiagnostic {
  name: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

/** Read-only diagnosis: no model calls, credentials in output, or notification sends. */
export async function diagnoseAssistant(
  home: string,
  options: {
    env?: NodeJS.ProcessEnv;
    tunnel?: string;
    fetch?: typeof fetch;
  } = {},
): Promise<AssistantDiagnostic[]> {
  const checks: AssistantDiagnostic[] = [];
  const add = (
    name: string,
    status: AssistantDiagnostic["status"],
    detail: string,
  ) => checks.push({ name, status, detail });
  add(
    "home",
    fs.existsSync(home) ? "ok" : "warning",
    fs.existsSync(home)
      ? "Personal home exists"
      : "Personal home has not been created",
  );
  if (fs.existsSync(path.join(home, ".restore-transaction.json")))
    add(
      "restore",
      "error",
      "An interrupted restore blocks writes; recover it before starting the assistant",
    );
  for (const _problem of homePermissionProblems(home))
    add(
      "permissions",
      "error",
      "Home permissions allow other users; restrict access to the owner",
    );
  let config;
  try {
    config = readConfig(home);
    add("config", "ok", "Configuration validates");
  } catch {
    add("config", "error", "Configuration is invalid; correct config.json");
    return checks;
  }
  const env = options.env ?? process.env;
  try {
    const status = recordatoriosStatus(home, config.recordatorios);
    add(
      "recordatorios",
      status.connected ? "ok" : "warning",
      status.connected
        ? "Authorization saved; live Neon synchronization and phone delivery are not verified"
        : "Connect Recordatorios from the private chat settings; database and VAPID configuration stay in the PWA",
    );
  } catch {
    add(
      "recordatorios",
      "error",
      "Recordatorios state is invalid; local tasks are preserved and synchronization requires review",
    );
  }
  try {
    const connection = readGmailConnection(home);
    add(
      "gmail",
      connection ? "ok" : "warning",
      connection
        ? "Saved Google authorization present; live mail delivery is not tested"
        : "Connect Gmail from the private chat settings to enable mail",
    );
    const unresolved = listGmailDrafts(home).filter((item) =>
      ["inflight", "uncertain", "preparing"].includes(item.state),
    ).length;
    if (unresolved)
      add(
        "gmail-deliveries",
        "warning",
        `${unresolved} mail operations need review; do not resend automatically`,
      );
  } catch {
    add(
      "gmail",
      "error",
      "Google authorization or delivery state is invalid; reconnect or reconcile before sending",
    );
  }
  add(
    "capture",
    config.capture?.extractor ? "ok" : "warning",
    config.capture?.extractor
      ? "Local extractor configured; audio, OCR and PDF recognition are not calibrated"
      : "Text capture works; audio, photo and PDF capture need a trusted local extractor",
  );
  add(
    "timezone",
    isValidTimeZone(config.timezone) ? "ok" : "error",
    isValidTimeZone(config.timezone)
      ? "Timezone is valid"
      : "Set a valid IANA timezone",
  );
  try {
    const entries = deliveryStatus(home);
    const uncertain = entries.filter(
      (entry) => entry.state === "uncertain" || entry.state === "inflight",
    ).length;
    const failed = entries.filter((entry) => entry.state === "failed").length;
    add(
      "deliveries",
      uncertain || failed ? "warning" : "ok",
      `${uncertain} uncertain or in-flight deliveries; ${failed} failed. Use assistant delivery status to reconcile`,
    );
  } catch {
    add(
      "deliveries",
      "error",
      "Delivery ledger is invalid; inspect it before restarting delivery",
    );
  }
  if (!config.provider)
    add("model", "warning", "No conversational model configured");
  else if (config.provider.type === "anthropic")
    add(
      "model",
      env[config.provider.keyEnv ?? "ANTHROPIC_API_KEY"] ? "ok" : "error",
      env[config.provider.keyEnv ?? "ANTHROPIC_API_KEY"]
        ? "API credential is present (not authenticated)"
        : "Set the configured API credential environment variable",
    );
  else {
    const executable = config.provider.command![0]!;
    const candidates = path.isAbsolute(executable)
      ? [executable]
      : (env.PATH ?? env.Path ?? "")
          .split(path.delimiter)
          .flatMap((directory) =>
            process.platform === "win32"
              ? ["", ".exe", ".cmd", ".bat"].map((extension) =>
                  path.join(directory, executable + extension),
                )
              : [path.join(directory, executable)],
          );
    const exists = candidates.some((candidate) => {
      try {
        fs.accessSync(
          candidate,
          process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK,
        );
        return fs.statSync(candidate).isFile();
      } catch {
        return false;
      }
    });
    add(
      "model",
      exists ? "ok" : "error",
      exists
        ? "Model executable found (login and response untested)"
        : "Model executable not found on PATH",
    );
  }
  const telegram = config.channels.telegram;
  if (telegram) {
    add(
      "telegram-credential",
      env[telegram.tokenEnv] ? "ok" : "error",
      env[telegram.tokenEnv]
        ? "Bot credential present"
        : "Set the Telegram credential environment variable",
    );
    add(
      "telegram-allowlist",
      telegram.allowedChats.length ? "ok" : "error",
      telegram.allowedChats.length
        ? "Allowed chats configured"
        : "Allow your chat before starting the bot",
    );
  }
  add(
    "alexa-skill",
    config.alexa.skillIds.length ? "ok" : "warning",
    config.alexa.skillIds.length
      ? "Skill allowlist configured"
      : "Configure Alexa skill ids before exposing its endpoint",
  );
  add(
    "alexa-account",
    config.alexa.userIds.length ? "ok" : "warning",
    config.alexa.userIds.length
      ? "Account allowlist configured"
      : "Restrict Alexa access to your account",
  );
  const probe = async (name: string, address: string) => {
    try {
      const response = await (options.fetch ?? fetch)(address, {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      const body = (await response.json()) as { ok?: boolean; name?: string };
      add(
        name,
        response.ok && body.ok === true && body.name === "helen-assistant"
          ? "ok"
          : "error",
        response.ok && body.name === "helen-assistant"
          ? "HELEN health endpoint reachable"
          : "Endpoint did not return HELEN health",
      );
    } catch {
      add(
        name,
        "warning",
        "Health endpoint unavailable; check server or tunnel",
      );
    }
  };
  const host = ["0.0.0.0", "::"].includes(config.server.host)
    ? "127.0.0.1"
    : config.server.host;
  await probe(
    "server",
    `http://${host.includes(":") ? `[${host}]` : host}:${config.server.port}/health`,
  );
  if (options.tunnel) {
    try {
      const tunnel = new URL(options.tunnel);
      if (
        tunnel.protocol !== "https:" ||
        tunnel.username ||
        tunnel.password ||
        tunnel.search ||
        tunnel.hash
      )
        add(
          "tunnel",
          "error",
          "Use an HTTPS tunnel origin without credentials or query parameters",
        );
      else await probe("tunnel", new URL("/health", tunnel).href);
    } catch {
      add("tunnel", "error", "Use a valid HTTPS tunnel origin");
    }
  }
  return checks;
}
