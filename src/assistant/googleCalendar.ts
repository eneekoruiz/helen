import { z } from "zod";
import { gmailRequest, googleOAuthHeaders } from "./gmail.js";
import {
  gmailAuthEnvironment,
  readGmailConnection,
  savedGmailConfig,
  GOOGLE_CALENDAR_SCOPES,
} from "./gmailAuth.js";
import { readConfig, type ChannelName } from "./home.js";
import { isValidTimeZone } from "./time.js";

export interface CalendarActor {
  owner: string;
  verified: boolean;
  private: boolean;
  channel: ChannelName;
}
export const GoogleCalendarQuerySchema = z
  .object({
    timeMin: z.string().datetime({ offset: true }),
    timeMax: z.string().datetime({ offset: true }),
    timeZone: z.string().refine(isValidTimeZone).default("UTC"),
  })
  .strict()
  .refine((value) => {
    const span = Date.parse(value.timeMax) - Date.parse(value.timeMin);
    return span > 0 && span <= 31 * 86400000;
  }, "Choose an increasing window of at most 31 days with explicit offsets");
const calendarApi = "https://www.googleapis.com/calendar/v3";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = Date.parse(value + "T00:00:00Z");
    return (
      Number.isFinite(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value
    );
  });
const instant = z
  .object({
    date: date.optional(),
    dateTime: z.string().datetime({ offset: true }).optional(),
    timeZone: z.string().max(100).refine(isValidTimeZone).optional(),
  })
  .refine((value) => Boolean(value.date) !== Boolean(value.dateTime));
const event = z
  .object({
    id: z.string().min(1).max(1024),
    status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
    summary: z.string().max(2000).optional(),
    start: instant,
    end: instant,
    transparency: z.enum(["opaque", "transparent"]).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.start.date) === Boolean(value.end.date) &&
      Date.parse(value.end.dateTime ?? value.end.date!) >
        Date.parse(value.start.dateTime ?? value.start.date!),
  );
function settings(home: string, actor: CalendarActor) {
  const local = readConfig(home),
    config = local.googleCalendar;
  if (
    !actor.verified ||
    !actor.private ||
    actor.owner !== local.owner ||
    !local.privacy.showSensitiveOn.includes(actor.channel) ||
    !config?.allowedChannels.includes(actor.channel) ||
    !config.permissions.includes("calendar:read")
  )
    throw new Error(
      "Calendar requires the verified owner, a private channel and calendar:read permission",
    );
  return config;
}
export function googleCalendarStatus(home: string, actor: CalendarActor) {
  settings(home, actor);
  const connection = readGmailConnection(home, "calendar");
  return {
    configured: true,
    credentialStored: Boolean(connection),
    connection: connection ?? null,
    verification: "local-credential-state; remote access not checked",
  };
}
/** Readonly Google calls: results stay in the explicitly authorized private channel. */
export async function queryGoogleCalendar(
  home: string,
  actor: CalendarActor,
  mode: "events" | "busy",
  raw: unknown,
  options: { fetch?: typeof fetch; signal?: AbortSignal } = {},
) {
  const config = settings(home, actor);
  const query = GoogleCalendarQuerySchema.parse(raw);
  if (mode !== "events" && mode !== "busy")
    throw new Error("Unsupported Calendar operation");
  options.signal?.throwIfAborted();
  const connection = readGmailConnection(home, "calendar"),
    credentials = savedGmailConfig(home, "calendar");
  if (
    !connection ||
    !credentials ||
    connection.account.toLowerCase() !== config.account.toLowerCase() ||
    connection.scopes.length !== 1 ||
    connection.scopes[0] !== GOOGLE_CALENDAR_SCOPES[0]
  )
    throw new Error(
      "Connect a separate readonly Calendar grant for the configured account",
    );
  const deadline = AbortSignal.timeout(30000);
  const transport = {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, deadline])
      : deadline,
    env: {
      ...process.env,
      ...gmailAuthEnvironment(home, Date.now(), "calendar"),
    },
  };
  const headers = await googleOAuthHeaders(credentials, transport);
  const primary = z
    .object({
      id: z.email(),
      primary: z.literal(true),
      accessRole: z.literal("owner"),
    })
    .parse(
      await gmailRequest(
        calendarApi + "/users/me/calendarList/primary",
        { headers },
        transport,
      ),
    );
  if (primary.id.toLowerCase() !== config.account.toLowerCase())
    throw new Error("Calendar OAuth account does not match configuration");
  const calendarId =
    config.calendarId === "primary" ? primary.id : config.calendarId;
  if (mode === "busy") {
    const response = await gmailRequest(
      calendarApi + "/freeBusy",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...query,
          items: [{ id: calendarId }],
          calendarExpansionMax: 1,
        }),
      },
      transport,
    );
    const result = z
      .object({
        calendars: z.record(
          z.string(),
          z.object({
            errors: z.array(z.unknown()).optional(),
            busy: z
              .array(
                z
                  .object({
                    start: z.string().datetime({ offset: true }),
                    end: z.string().datetime({ offset: true }),
                  })
                  .refine(
                    (value) => Date.parse(value.end) > Date.parse(value.start),
                  ),
              )
              .max(1000)
              .optional(),
          }),
        ),
      })
      .parse(response).calendars[calendarId];
    if (!result || result.errors?.length || !result.busy)
      throw new Error(
        "Availability could not be verified; do not assume the calendar is free",
      );
    return {
      operation: "busy",
      calendarId,
      ...query,
      busy: result.busy,
      verified: true,
    };
  }
  const events: Array<z.infer<typeof event>> = [];
  const seen = new Set<string>(),
    pages = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < 4; page++) {
    const url = new URL(
      calendarApi + "/calendars/" + encodeURIComponent(calendarId) + "/events",
    );
    url.search = new URLSearchParams({
      ...query,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "50",
      fields: "items(id,status,summary,start,end,transparency),nextPageToken",
      ...(pageToken ? { pageToken } : {}),
    }).toString();
    const response = z
      .object({
        items: z.array(z.unknown()).max(50).default([]),
        nextPageToken: z.string().min(1).max(4096).optional(),
      })
      .parse(await gmailRequest(url.href, { headers }, transport));
    for (const item of response.items) {
      if (
        item &&
        typeof item === "object" &&
        "status" in item &&
        item.status === "cancelled"
      )
        continue;
      const parsed = event.parse(item);
      if (!seen.has(parsed.id)) {
        seen.add(parsed.id);
        events.push(parsed);
      }
    }
    pageToken = response.nextPageToken;
    if (!pageToken) break;
    if (pages.has(pageToken))
      throw new Error(
        "Calendar pagination repeated a token; results are not complete",
      );
    pages.add(pageToken);
  }
  return {
    operation: "events",
    calendarId,
    ...query,
    events,
    truncated: Boolean(pageToken),
    verified: true,
  };
}
