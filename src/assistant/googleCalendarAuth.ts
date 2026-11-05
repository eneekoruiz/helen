import { z } from "zod";
import {
  startGmailAuth,
  completeGmailAuth,
  disconnectGmail,
  readGmailConnection,
  type GmailAuthOptions,
} from "./gmailAuth.js";
import { readConfig, writeConfig } from "./home.js";
import type { CalendarActor } from "./googleCalendar.js";
function owner(home: string, actor: CalendarActor) {
  const config = readConfig(home);
  if (
    !actor.verified ||
    !actor.private ||
    actor.owner !== config.owner ||
    !config.privacy.showSensitiveOn.includes(actor.channel) ||
    actor.channel !== "cli"
  )
    throw new Error(
      "Calendar connection management requires the private verified local owner",
    );
  return config;
}
export function startGoogleCalendarConnection(
  home: string,
  actor: CalendarActor,
  raw: unknown,
  options: { env?: NodeJS.ProcessEnv; now?: () => number } = {},
) {
  const config = owner(home, actor);
  const envName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
  const input = z
    .object({
      account: z.email().max(254),
      clientIdEnv: envName,
      clientSecretEnv: envName.optional(),
      redirectUri: z.string().url(),
    })
    .strict()
    .parse(raw);
  const env = options.env ?? process.env;
  const clientId = env[input.clientIdEnv],
    clientSecret = input.clientSecretEnv
      ? env[input.clientSecretEnv]
      : undefined;
  if (!clientId || (input.clientSecretEnv && !clientSecret))
    throw new Error(
      "Set the local Calendar OAuth client environment references; do not paste credentials into chat",
    );
  const result = startGmailAuth(
    home,
    {
      clientId,
      ...(clientSecret ? { clientSecret } : {}),
      redirectUri: input.redirectUri,
      owner: config.owner,
      expectedAccount: input.account,
    },
    { service: "calendar", now: options.now },
  );
  writeConfig(
    {
      ...config,
      googleCalendar: {
        account: input.account,
        calendarId:
          config.googleCalendar?.account === input.account
            ? config.googleCalendar.calendarId
            : "primary",
        redirectUri: input.redirectUri,
        allowedChannels: ["cli"],
        permissions: ["calendar:read"],
      },
    },
    home,
  );
  return {
    authorizationUrl: result.url,
    expiresAt: result.expiresAt,
    callback: input.redirectUri,
    readOnly: true,
  };
}
export const readGoogleCalendarConnection = (home: string) =>
  readGmailConnection(home, "calendar");
export async function completeGoogleCalendarConnection(
  home: string,
  input: { state: string; code: string; redirectUri: string },
  options: GmailAuthOptions = {},
) {
  try {
    return await completeGmailAuth(home, input, {
      ...options,
      service: "calendar",
    });
  } catch {
    throw new Error(
      "Calendar OAuth could not be verified; start a new connection without sharing credentials",
    );
  }
}
export async function disconnectGoogleCalendarConnection(
  home: string,
  actor: CalendarActor,
  revoke: boolean,
  options: GmailAuthOptions = {},
) {
  owner(home, actor);
  return disconnectGmail(home, { revoke }, { ...options, service: "calendar" });
}
