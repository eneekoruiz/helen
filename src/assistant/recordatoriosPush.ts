import crypto from "node:crypto";
import { z } from "zod";
import {
  recordatoriosRequest,
  RecordatoriosHttpError,
  type RecordatoriosConfig,
  type RecordatoriosOptions,
} from "./recordatorios.js";
import {
  DeliveryRejectedError,
  visibleText,
  type DeliveryChannel,
} from "./notify.js";

export function recordatoriosPushChannel(
  home: string,
  config: RecordatoriosConfig,
  options: RecordatoriosOptions = {},
): DeliveryChannel {
  const channel: DeliveryChannel = {
    name: "recordatorios-push",
    local: false,
    send: async (notification) => {
      try {
        const result = z
          .object({
            delivered: z.number().int().nonnegative(),
            skipped: z.boolean().optional(),
            uncertain: z.boolean().optional(),
          })
          .parse(
            await recordatoriosRequest(
              home,
              config,
              "/api/push/helen",
              {
                id: notification.id ?? crypto.randomUUID(),
                title: notification.title.slice(0, 100),
                text: visibleText(notification, channel).slice(0, 500),
                sensitive: notification.sensitive,
                kind: notification.kind,
              },
              options,
            ),
          );
        if (result.uncertain)
          throw new Error(
            "Web Push pendiente de comprobación; no se repetirá automáticamente.",
          );
        if (!result.delivered && !result.skipped)
          throw new DeliveryRejectedError(
            "Activa los avisos móviles en Recordatorios.",
          );
      } catch (error) {
        if (
          error instanceof RecordatoriosHttpError &&
          [400, 401, 403, 404, 409, 413, 429, 503].includes(error.status)
        )
          throw new DeliveryRejectedError(error.message);
        throw error;
      }
    },
  };
  return channel;
}
