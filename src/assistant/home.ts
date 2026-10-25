import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { GmailConfigSchema } from "./gmail.js";
import { withLockSync } from "../core/fileLock.js";
import { isValidTimeZone } from "./time.js";

/**
 * HELEN's personal home: memory, reminders and tasks of one person. It lives outside every project
 * (default ~/.helen, override with HELEN_HOME) so personal data never ends up in a repository.
 */
export function helenHome(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(env.HELEN_HOME || path.join(os.homedir(), ".helen"));
}

/** Create the home with private permissions. */
export function ensureHome(home: string = helenHome()): string {
  if (fs.existsSync(path.join(home, ".restore-transaction.json")))
    throw new Error(
      "An interrupted restore needs recovery: run helen assistant restore-recover.",
    );
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(home, "memory"), { recursive: true, mode: 0o700 });
  return home;
}

const ownedLocks = new Set<string>();
export function withHomeLock<T>(
  home: string,
  action: () => T,
  options: { allowRestore?: boolean } = {},
): T {
  if (!fs.existsSync(path.join(home, ".restore-transaction.json")))
    ensureHome(home);
  const key = fs.realpathSync.native(home);
  const checkRestore = () => {
    if (
      !options.allowRestore &&
      fs.existsSync(path.join(home, ".restore-transaction.json"))
    )
      throw new Error(
        "An interrupted restore needs recovery: run helen assistant restore again before changing data.",
      );
  };
  checkRestore();
  // Synchronous nested store calls share the transaction; the outer call owns the process lock.
  if (ownedLocks.has(key)) return action();
  return withLockSync(path.join(home, ".lock"), () => {
    checkRestore();
    ownedLocks.add(key);
    try {
      return action();
    } finally {
      ownedLocks.delete(key);
    }
  });
}

/** Write a private file atomically. */
export function writePrivate(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, content, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

const ChannelsSchema = z
  .object({
    console: z.boolean().default(true),
    desktop: z.boolean().default(true),
    webhook: z
      .object({
        url: z.string().url(),
        format: z.enum(["json", "ntfy", "slack", "discord"]).default("json"),
      })
      .optional(),
    telegram: z
      .object({
        tokenEnv: z
          .string()
          .regex(/^[A-Z_][A-Z0-9_]*$/)
          .default("HELEN_TELEGRAM_TOKEN"),
        allowedChats: z.array(z.number().int()).default([]),
      })
      .optional(),
  })
  .prefault({});

const ProviderSchema = z
  .object({
    /** anthropic: the Claude API with tools (HELEN acts on memory, reminders and lists). command: any local CLI that answers on stdout. */
    type: z.enum(["anthropic", "command"]),
    /** Required for anthropic: the model id, as listed in the provider's documentation. HELEN ships no default. */
    model: z.string().min(1).optional(),
    /** Name of the environment variable holding the API key. Unset: the SDK's own lookup (ANTHROPIC_API_KEY, ...). The key is never stored. */
    keyEnv: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .optional(),
    baseUrl: z.string().url().optional(),
    /** Reasoning effort, when the chosen model supports it. */
    effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
    /** Enable only for a model that supports adaptive thinking. */
    thinking: z.enum(["adaptive", "off"]).optional(),
    maxOutputTokens: z.number().int().min(256).max(16000).optional(),
    /** For type command: argv of a local CLI that reads the prompt on stdin and prints the answer, e.g. ["claude", "-p"]. */
    command: z.array(z.string().min(1)).min(1).optional(),
    /** Opt into the validated JSON tool protocol for a trusted subscription/local CLI. */
    commandTools: z.boolean().optional(),
    /** Strip API credentials from a subscription CLI's environment; included billing remains an account setting. */
    subscriptionOnly: z.boolean().optional(),
    /** fallback: rules first, the model only for what they do not understand. always: every message goes to the model. */
    mode: z.enum(["fallback", "always"]).default("fallback"),
    /** Send items marked sensitive to the provider. Off by default. */
    allowSensitive: z.boolean().default(false),
    maxRounds: z.number().int().min(1).max(10).default(6),
    timeoutMs: z.number().int().min(1000).max(600_000).default(60_000),
    /** Voice assistants wait about 8 seconds: past this, HELEN answers from its own rules and memory instead. */
    voiceTimeoutMs: z.number().int().min(1000).max(7_500).default(6_000),
  })
  .superRefine((value, ctx) => {
    if (value.type === "anthropic" && !value.model)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["model"],
        message: "Set the model id from the provider documentation",
      });
    if (value.type === "command" && !value.command)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["command"],
        message: 'Set the command, e.g. ["claude", "-p"]',
      });
  });

export const CHANNEL_NAMES = [
  "cli",
  "http",
  "web",
  "telegram",
  "alexa",
  "mcp",
] as const;
export type ChannelName = (typeof CHANNEL_NAMES)[number];

export const AssistantConfigSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(60)
    .default(() => safeUsername()),
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .default("es-ES"),
  timezone: z
    .string()
    .refine(isValidTimeZone, "Use a valid IANA time zone")
    .default(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
  defaultTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("09:00"),
  quietHours: z
    .object({
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .refine(
      (value) => value.start !== value.end,
      "Quiet hours must have different start and end times",
    )
    .optional(),
  channels: ChannelsSchema,
  provider: ProviderSchema.optional(),
  assistance: z
    .object({
      detail: z.enum(["brief", "balanced", "detailed"]).default("balanced"),
      simpleLanguage: z.boolean().default(false),
      stepByStep: z.boolean().default(false),
      preferredLanguage: z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
        .optional(),
    })
    .prefault({}),
  capture: z
    .object({
      extractor: z
        .object({
          command: z.string().min(1).max(1000),
          args: z.array(z.string().max(2000)).max(30).optional(),
          timeoutMs: z.number().int().min(100).max(120000).optional(),
        })
        .optional(),
    })
    .optional(),
  gmail: z.lazy(() => GmailConfigSchema).optional(),
  gmailRedirectUri: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.pathname === "/gmail/callback" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      );
    })
    .optional(),
  gmailAuth: z
    .object({
      clientIdEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
      clientSecretEnv: z
        .string()
        .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
        .optional(),
      redirectUri: z
        .string()
        .url()
        .refine((value) => {
          const url = new URL(value);
          return (
            !url.username &&
            !url.password &&
            (url.protocol === "https:" ||
              (url.protocol === "http:" &&
                ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
          );
        }),
    })
    .optional(),
  server: z
    .object({
      host: z.string().default("127.0.0.1"),
      port: z.number().int().min(1).max(65535).default(8787),
    })
    .prefault({}),
  alexa: z
    .object({
      skillIds: z
        .array(z.string().regex(/^amzn1\.ask\.skill\.[0-9a-f-]+$/))
        .default([]),
      /** Alexa account ids allowed to talk to HELEN. Empty: anyone who can use the (private) skill. */
      userIds: z.array(z.string().min(10).max(500)).default([]),
      /** Also create a native reminder on the Echo when a reminder is made by voice (needs the reminders permission). */
      nativeReminders: z.boolean().default(true),
    })
    .prefault({}),
  privacy: z
    .object({
      /** Channels that may show items marked sensitive. Voice never does. */
      showSensitiveOn: z
        .array(z.enum(CHANNEL_NAMES))
        .default(["cli", "http", "web"]),
    })
    .prefault({}),
  /** A daily summary pushed to the delivery channels (empty: off). */
  briefing: z
    .object({
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
      shutdownTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
    })
    .prefault({}),
  /** Expose all memory to MCP clients, not just items shared with agents. Off by default. */
  shareAllMemoryWithAgents: z.boolean().default(false),
});

export type AssistantConfig = z.infer<typeof AssistantConfigSchema>;

function safeUsername(): string {
  try {
    return os.userInfo().username || "me";
  } catch {
    return "me";
  }
}

export function configFile(home: string = helenHome()): string {
  return path.join(home, "config.json");
}

export function readConfig(home: string = helenHome()): AssistantConfig {
  const file = configFile(home);
  const raw: unknown = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const parsed = AssistantConfigSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      `Invalid ${file}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    );
  return parsed.data;
}

/** Validate and store the config. Unknown keys are dropped; secrets never belong here. */
export function writeConfig(
  config: unknown,
  home: string = helenHome(),
): AssistantConfig {
  const parsed = AssistantConfigSchema.parse(config);
  withHomeLock(home, () =>
    writePrivate(configFile(home), `${JSON.stringify(parsed, null, 2)}\n`),
  );
  return parsed;
}

/** Set one dotted key, e.g. timezone or channels.webhook.url, validating the result. */
export function setConfigValue(
  key: string,
  value: string,
  home: string = helenHome(),
): AssistantConfig {
  if (!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/.test(key))
    throw new Error(`Invalid key "${key}"`);
  const current = JSON.parse(JSON.stringify(readConfig(home))) as Record<
    string,
    unknown
  >;
  const parts = key.split(".");
  let cursor = current;
  for (const part of parts.slice(0, -1)) {
    if (
      cursor[part] === undefined ||
      typeof cursor[part] !== "object" ||
      cursor[part] === null
    )
      cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  let parsedValue: unknown = value;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    // Plain strings stay strings.
  }
  cursor[parts.at(-1)!] = parsedValue;
  return writeConfig(current, home);
}

/** Bearer token for the HTTP API, created on first use. HELEN_TOKEN overrides it. */
export function apiToken(
  home: string = helenHome(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.HELEN_TOKEN) return env.HELEN_TOKEN;
  const file = path.join(home, "token");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const token = crypto.randomBytes(32).toString("base64url");
  ensureHome(home);
  writePrivate(file, `${token}\n`);
  return token;
}

/** Problems with how the home is protected (POSIX only). */
export function homePermissionProblems(home: string = helenHome()): string[] {
  if (process.platform === "win32" || !fs.existsSync(home)) return [];
  const problems: string[] = [];
  const mode = fs.statSync(home).mode & 0o777;
  if (mode & 0o077)
    problems.push(
      `${home} is readable by other users (mode ${mode.toString(8)}); run: chmod 700 "${home}"`,
    );
  return problems;
}
