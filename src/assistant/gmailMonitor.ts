import { setTimeout as delay } from "node:timers/promises";
import type { AssistantConfig } from "./home.js";
import { gmailConnection } from "./mail.js";
import { listGmailWatches, runGmailWatches } from "./gmailWatch.js";

export async function runGmailMonitor(options: {
  home: string;
  config: AssistantConfig;
  signal: AbortSignal;
  log?: (message: string) => void;
  fetcher?: typeof fetch;
  pollMs?: number;
}): Promise<void> {
  const interval = options.pollMs ?? 120000;
  if (!Number.isSafeInteger(interval) || interval < 10)
    throw new Error("Invalid Gmail polling interval");
  while (!options.signal.aborted) {
    try {
      if (
        listGmailWatches(options.home).some((item) => item.state === "active")
      ) {
        const connection = gmailConnection(options);
        const result = await runGmailWatches(
          options.home,
          connection.config,
          connection.options,
        );
        if (result.errors.length)
          options.log?.(
            "Gmail: no se pudieron comprobar algunos seguimientos; se reintentará sin duplicar avisos.",
          );
      }
    } catch {
      if (!options.signal.aborted)
        options.log?.(
          "Gmail: seguimiento pendiente; revisa la conexión y el estado local.",
        );
    }
    try {
      await delay(interval, undefined, { signal: options.signal });
    } catch {
      break;
    }
  }
}
