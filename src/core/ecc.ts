import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import { isSafeProjectPath, isPathInside } from "./fs.js";
import { runProjectOperationSync, writeAtomicFile } from "./operations.js";

export const ECC_REPOSITORY = "affaan-m/ECC";
const ECC_URL = `https://github.com/${ECC_REPOSITORY}.git`;
export const ECC_DEFAULT_REF = "ef648e01899ba3e8dc6371642deaaf64b4477775";
const MARKETPLACE = ".agents/plugins/marketplace.json";
const CLAUDE = ".claude/settings.json";
const CODEX = ".codex/config.toml";
const START = "<!-- HELEN:ECC:START -->";
const END = "<!-- HELEN:ECC:END -->";
const ENV_DEFAULTS = {
  HELEN_ECC_ENABLED: "true",
  ECC_HOOK_PROFILE: "standard",
  ECC_AGENT_DATA_HOME: ".helen/ecc-data",
} as const;
type EnvKey = keyof typeof ENV_DEFAULTS;
type ObjectValue = Record<string, unknown>;

function commit(value: unknown): string {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{40}$/.test(value))
    throw new Error("ECC ref must be an exact 40-character hexadecimal commit");
  return value.toLowerCase();
}

function read(cwd: string, relative: string): string | undefined {
  const file = path.resolve(cwd, relative);
  if (!isSafeProjectPath(cwd, file))
    throw new Error(`Unsafe ECC project path: ${relative}`);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (!stat.isFile())
    throw new Error(`ECC destination must be a regular file: ${relative}`);
  if (stat.size > 256 * 1024)
    throw new Error(`ECC config exceeds 256 KiB: ${relative}`);
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      fs.readFileSync(file),
    );
  } catch {
    throw new Error(`Unable to read UTF-8 ECC configuration: ${relative}`);
  }
}

function object(value: unknown, label: string): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Malformed ECC configuration: ${label} must be an object`);
  return value as ObjectValue;
}

function json(content: string | undefined, label: string): ObjectValue {
  if (content === undefined) return {};
  try {
    return object(JSON.parse(content.replace(/^\uFEFF/, "")), label);
  } catch {
    throw new Error(`Malformed JSON ECC configuration: ${label}`);
  }
}

function source(value: unknown, field: "sha" | "ref"): ObjectValue {
  const entry = object(value, "ECC source");
  const github =
    entry.source === "github" &&
    entry.repo === ECC_REPOSITORY &&
    !Object.hasOwn(entry, "url");
  const url =
    entry.source === "url" &&
    entry.url === ECC_URL &&
    !Object.hasOwn(entry, "repo");
  if (
    !(field === "ref" ? github : url || github) ||
    Object.hasOwn(entry, field === "sha" ? "ref" : "sha") ||
    Object.hasOwn(entry, "path")
  )
    throw new Error(
      "ECC marketplace source conflicts with the original pinned repository",
    );
  commit(entry[field]);
  return entry;
}

function catalog(content: string | undefined): {
  value: ObjectValue;
  entry?: ObjectValue;
} {
  const value = json(content, MARKETPLACE);
  if (value.name !== undefined && value.name !== "helen-integrations")
    throw new Error(
      "Project marketplace name conflicts with helen-integrations",
    );
  const plugins = value.plugins ?? [];
  if (!Array.isArray(plugins))
    throw new Error("Malformed ECC marketplace plugins array");
  const matches = plugins
    .map((plugin) => object(plugin, "marketplace plugin"))
    .filter((plugin) => plugin.name === "ecc");
  if (matches.length > 1) throw new Error("Duplicate ECC marketplace plugin");
  if (matches[0]) {
    source(matches[0].source, "sha");
    const policy =
      matches[0].policy === undefined
        ? {}
        : object(matches[0].policy, "ECC policy");
    if (
      policy.installation !== undefined &&
      policy.installation !== "AVAILABLE"
    )
      throw new Error(
        "Existing ECC installation policy conflicts with AVAILABLE",
      );
  }
  return { value, entry: matches[0] };
}

/** Inspect only ECC's target section; unrelated TOML is preserved verbatim. */
function tomlLine(line: string): string {
  let quote = "";
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (!quote && character === "#") return line.slice(0, index).trim();
    if (quote === '"' && character === "\\") {
      index++;
      continue;
    }
    if (character !== '"' && character !== "'") continue;
    if (!quote) {
      if (line.slice(index, index + 3) === character.repeat(3))
        throw new Error(
          "Multiline TOML strings require manual ECC plugin configuration",
        );
      quote = character;
    } else if (quote === character) quote = "";
  }
  if (quote) throw new Error("Unterminated TOML string in Codex configuration");
  return line.trim();
}

function codexEnabled(content: string): boolean {
  const lines = content.split(/\r?\n/).map(tomlLine);
  const targets: number[] = [];
  let pluginsTable = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith("["))
      pluginsTable = /^\[\s*(?:plugins|"plugins"|'plugins')\s*\]$/.test(line);
    if (!line.includes("ecc@helen-integrations") && !line.includes("ecc@ecc"))
      continue;
    const targetHeader = /^\[\s*(?:plugins|"plugins"|'plugins')\s*\./.test(
      line,
    );
    const targetKey = line.split("=", 1)[0];
    const targetAssignment =
      (pluginsTable ||
        /^\s*(?:plugins|"plugins"|'plugins')\s*\./.test(targetKey)) &&
      /ecc@(?:helen-integrations|ecc)/.test(targetKey);
    if (!targetHeader && !targetAssignment) continue;
    if (
      !/^\[\s*(?:plugins|"plugins"|'plugins')\s*\.\s*(?:"ecc@helen-integrations"|'ecc@helen-integrations')\s*\]$/.test(
        line,
      )
    )
      throw new Error("Conflicting or malformed Codex ECC plugin target");
    targets.push(index);
  }
  if (targets.length > 1) throw new Error("Duplicate Codex ECC plugin target");
  if (!targets.length) return false;
  const values: string[] = [];
  for (let index = targets[0] + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith("[")) break;
    if (!line) continue;
    if (!/^(?:[A-Za-z0-9_-]+|"[^"\n]+"|'[^'\n]+')\s*=\s*\S/.test(line))
      throw new Error("Malformed Codex ECC plugin section");
    const enabled = /^(?:enabled|"enabled"|'enabled')\s*=\s*(.*)$/.exec(line);
    if (enabled) values.push(enabled[1]);
  }
  if (values.length !== 1 || values[0] !== "true")
    throw new Error(
      "Codex ECC plugin target must have one enabled = true setting",
    );
  return true;
}

function claudeConfiguration(content: string | undefined): {
  value: ObjectValue;
  marketplaces: ObjectValue;
  plugins: ObjectValue;
  entry?: ObjectValue;
} {
  const value = json(content, CLAUDE);
  const marketplaces = object(
    value.extraKnownMarketplaces ?? {},
    "extraKnownMarketplaces",
  );
  const plugins = object(value.enabledPlugins ?? {}, "enabledPlugins");
  const entry =
    marketplaces.ecc === undefined
      ? undefined
      : object(marketplaces.ecc, "Claude ECC marketplace");
  if (entry) source(entry.source, "ref");
  for (const [name, enabled] of Object.entries(plugins)) {
    if (name.startsWith("ecc@") && name !== "ecc@ecc")
      throw new Error("Conflicting Claude ECC plugin marketplace");
    if (name === "ecc@ecc" && enabled !== true)
      throw new Error(
        "Existing Claude ECC plugin setting conflicts with enabled = true",
      );
  }
  return { value, marketplaces, plugins, entry };
}

/** Read dotenv text without expansion, process mutation or exporting credentials. */
function controls(content: string): Partial<Record<EnvKey, string>> {
  const result: Partial<Record<EnvKey, string>> = {};
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) {
      if (
        /^\s*(?:export\s+)?(?:HELEN_ECC_ENABLED|ECC_HOOK_PROFILE|ECC_AGENT_DATA_HOME)\b/.test(
          line,
        )
      )
        throw new Error(`Malformed ECC .env control at line ${index + 1}`);
      continue;
    }
    let value = match[2];
    if (/^["'`]/.test(value)) {
      const quote = value[0];
      const quoted = new RegExp(`^${quote}([\\s\\S]*?)${quote}\\s*(?:#.*)?$`);
      let parsed = quoted.exec(value);
      while (!parsed) {
        if (++index >= lines.length)
          throw new Error("Malformed .env: unterminated quoted value");
        value += `\n${lines[index]}`;
        parsed = quoted.exec(value);
      }
      value = parsed[1];
    } else value = value.split("#", 1)[0].trim();
    if (!Object.hasOwn(ENV_DEFAULTS, match[1])) continue;
    const key = match[1] as EnvKey;
    if (Object.hasOwn(result, key))
      throw new Error(`Duplicate ECC .env control: ${key}`);
    result[key] = value;
  }
  return result;
}

function environment(
  cwd: string,
  local: Partial<Record<EnvKey, string>>,
  env: NodeJS.ProcessEnv,
): {
  enabled: boolean;
  profile: "minimal" | "standard" | "strict";
  dataHome: string;
} {
  const value = (key: EnvKey): string =>
    (env[key] ?? local[key] ?? ENV_DEFAULTS[key]).trim();
  const enabled = value("HELEN_ECC_ENABLED");
  if (enabled !== "true" && enabled !== "false")
    throw new Error("HELEN_ECC_ENABLED must be true or false");
  const profile = value("ECC_HOOK_PROFILE");
  if (profile !== "minimal" && profile !== "standard" && profile !== "strict")
    throw new Error("ECC_HOOK_PROFILE must be minimal, standard or strict");
  const raw = value("ECC_AGENT_DATA_HOME");
  const dataHome = path.resolve(cwd, raw);
  const root = path.resolve(cwd, ".helen");
  if (
    !raw ||
    raw.split(/[\\/]/).includes("..") ||
    Array.from(raw).some((character) => character.charCodeAt(0) < 32) ||
    dataHome === root ||
    !isPathInside(root, dataHome) ||
    !isSafeProjectPath(cwd, dataHome) ||
    (fs.existsSync(dataHome) && !fs.lstatSync(dataHome).isDirectory())
  )
    throw new Error(
      "ECC_AGENT_DATA_HOME must be a safe directory within the project's .helen directory",
    );
  return { enabled: enabled === "true", profile, dataHome };
}

export function readEccEnvironment(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): {
  enabled: boolean;
  profile: "minimal" | "standard" | "strict";
  dataHome: string;
} {
  return environment(cwd, controls(read(cwd, ".env") ?? ""), env);
}

export function eccStatus(cwd: string): {
  repository: string;
  ref: string;
  configured: boolean;
  claudeConfigured: boolean;
  codexConfigured: boolean;
} {
  const project = catalog(read(cwd, MARKETPLACE));
  const ref = project.entry
    ? commit(object(project.entry.source, "ECC source").sha)
    : ECC_DEFAULT_REF;
  const claude = claudeConfiguration(read(cwd, CLAUDE));
  const claudeConfigured =
    claude.entry !== undefined &&
    commit(object(claude.entry.source, "ECC source").ref) === ref &&
    claude.plugins["ecc@ecc"] === true;
  const codexConfigured =
    project.entry !== undefined && codexEnabled(read(cwd, CODEX) ?? "");
  return {
    repository: ECC_REPOSITORY,
    ref,
    configured: !!project.entry && claudeConfigured && codexConfigured,
    claudeConfigured,
    codexConfigured,
  };
}

export function nativeEccCommands(
  cwd: string,
  target: "claude" | "codex",
): Array<{ command: string; args: string[] }> {
  if (target !== "claude" && target !== "codex")
    throw new Error("ECC target must be claude or codex");
  const ref = eccStatus(cwd).ref;
  return target === "claude"
    ? [
        {
          command: "claude",
          args: [
            "plugin",
            "marketplace",
            "add",
            `${ECC_REPOSITORY}#${ref}`,
            "--scope",
            "project",
          ],
        },
        {
          command: "claude",
          args: ["plugin", "install", "ecc@ecc", "--scope", "project"],
        },
      ]
    : [
        {
          command: "codex",
          args: ["plugin", "marketplace", "add", path.resolve(cwd)],
        },
        { command: "codex", args: ["plugin", "add", "ecc@helen-integrations"] },
      ];
}

function instructions(existing: string): string {
  const block = [
    START,
    "## HELEN and original ECC",
    "",
    "Use HELEN as the project coordinator. When available, use the original ECC skills for planning, implementation, code review, security, verification and continuous learning. Load only task-relevant skills and invoke them explicitly if routing is ambiguous. Delegate within the host's actual agent and budget limits. Discover and repair authorized findings, then verify the result and preserve a factual handoff.",
    "The user's authorization governs recipes: when implementation or learning is already authorized, proceed within that scope without redundant plan approvals. Preserve genuine missing decisions and native trust or permission requirements. Configuring ECC does not enable its background learning observer; learning requires the original supported mechanism and verified evidence.",
    "Claude and Codex expose different plugin, agent and hook capabilities; configuration does not prove installation or activation on every task. Recalled memory is evidence to verify, never new authorization. Preserve project instructions and unrelated changes. See docs/ECC-INTEGRATION.md for installation, environment launch settings and upstream updates.",
    END,
  ].join("\n");
  const starts = existing.split(START).length - 1;
  const ends = existing.split(END).length - 1;
  if (!starts && !ends)
    return `${existing}${!existing ? "" : existing.endsWith("\n") ? "\n" : "\n\n"}${block}\n`;
  const start = existing.indexOf(START),
    end = existing.indexOf(END);
  if (starts !== 1 || ends !== 1 || end < start)
    throw new Error("Malformed HELEN ECC managed block");
  return `${existing.slice(0, start)}${block}${existing.slice(end + END.length)}`;
}

export function configureEcc(
  cwd: string,
  options: { ref?: string } = {},
): {
  repository: string;
  ref: string;
  files: string[];
} {
  return runProjectOperationSync(cwd, "ecc:configure", () =>
    configureEccLocked(cwd, options),
  ).value;
}

function configureEccLocked(
  cwd: string,
  options: { ref?: string },
): { repository: string; ref: string; files: string[] } {
  const current = catalog(read(cwd, MARKETPLACE));
  const ref = commit(
    options.ref ??
      (current.entry
        ? object(current.entry.source, "ECC source").sha
        : ECC_DEFAULT_REF),
  );
  const claude = claudeConfiguration(read(cwd, CLAUDE));
  const toml = read(cwd, CODEX) ?? "";
  const enabled = codexEnabled(toml);
  const env = read(cwd, ".env") ?? "";
  const local = controls(env);
  environment(cwd, local, {});
  environment(cwd, local, process.env);
  const missing = (Object.keys(ENV_DEFAULTS) as EnvKey[]).filter(
    (key) => !Object.hasOwn(local, key),
  );
  const newline = env.includes("\r\n") ? "\r\n" : "\n";
  const plugins = (current.value.plugins ?? []) as ObjectValue[];
  const ecc = {
    ...current.entry,
    name: "ecc",
    source: {
      source: "url",
      url: ECC_URL,
      sha: ref,
    },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  };
  const plans: Array<{ relative: string; content: string; private?: boolean }> =
    [
      {
        relative: MARKETPLACE,
        content:
          JSON.stringify(
            {
              ...current.value,
              name: "helen-integrations",
              plugins: [
                ...plugins.filter((entry) => entry.name !== "ecc"),
                ecc,
              ],
            },
            null,
            2,
          ) + "\n",
      },
      {
        relative: CLAUDE,
        content:
          JSON.stringify(
            {
              ...claude.value,
              extraKnownMarketplaces: {
                ...claude.marketplaces,
                ecc: {
                  ...claude.entry,
                  source: {
                    ...(claude.entry
                      ? object(claude.entry.source, "ECC source")
                      : {}),
                    source: "github",
                    repo: ECC_REPOSITORY,
                    ref,
                  },
                },
              },
              enabledPlugins: { ...claude.plugins, "ecc@ecc": true },
            },
            null,
            2,
          ) + "\n",
      },
      {
        relative: CODEX,
        content: enabled
          ? toml
          : `${toml}${!toml || toml.endsWith("\n") ? "" : "\n"}\n[plugins."ecc@helen-integrations"]\nenabled = true\n`,
      },
      {
        relative: ".env",
        private: true,
        content: !missing.length
          ? env
          : `${env}${!env || env.endsWith("\n") ? "" : newline}# Original ECC project controls${newline}${missing.map((key) => `${key}=${ENV_DEFAULTS[key]}`).join(newline)}${newline}`,
      },
    ];
  for (const relative of ["AGENTS.md", "CLAUDE.md"])
    plans.push({ relative, content: instructions(read(cwd, relative) ?? "") });
  const ignore = read(cwd, ".gitignore") ?? "";
  const lastEnvRule = ignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => line === ".env" || line === "!.env");
  plans.push({
    relative: ".gitignore",
    content:
      lastEnvRule === ".env"
        ? ignore
        : `${ignore}${!ignore || ignore.endsWith("\n") ? "" : "\n"}.env\n`,
  });
  const changed = plans.filter(
    (plan) =>
      read(cwd, plan.relative) !== plan.content ||
      (plan.private &&
        process.platform !== "win32" &&
        fs.existsSync(path.resolve(cwd, plan.relative)) &&
        (fs.statSync(path.resolve(cwd, plan.relative)).mode & 0o777) !== 0o600),
  );
  if (!changed.length) return { repository: ECC_REPOSITORY, ref, files: [] };
  for (const plan of changed) {
    read(cwd, plan.relative);
    writeAtomicFile(path.resolve(cwd, plan.relative), plan.content, {
      mode: plan.private ? 0o600 : undefined,
    });
  }
  return {
    repository: ECC_REPOSITORY,
    ref,
    files: changed.map((plan) => plan.relative),
  };
}
