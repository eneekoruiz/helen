import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { SpawnSyncOptionsWithStringEncoding } from "node:child_process";
import { subscriptionEnvironment } from "./jobRuntime.js";

export const CAPABILITY_NAMES = [
  "read",
  "write",
  "exec",
  "browser",
  "mcp",
  "nativeQuestions",
] as const;
export type CapabilityName = (typeof CAPABILITY_NAMES)[number];
export type CapabilityProvider = "codex" | "claude";
export type CapabilityState =
  | "unknown"
  | "installed"
  | "configured"
  | "authenticated"
  | "advertised"
  | "actually-observed"
  | "unavailable";

export interface CapabilityEvidence {
  state: CapabilityState;
  configured: boolean | null;
  advertised: boolean | null;
  observations: CapabilityObservation[];
  reason: string;
}
export interface ProviderCapabilities {
  provider: CapabilityProvider;
  installed: boolean;
  version: string | null;
  authenticated: boolean | null;
  authMode: "chatgpt" | "claude.ai" | null;
  includedOnlyAuthorized: boolean;
  configured: boolean;
  capabilities: Record<CapabilityName, CapabilityEvidence>;
  probes: Array<{
    name: "lookup" | "version" | "auth" | "help";
    ok: boolean;
    reason: string;
  }>;
}
export interface CapabilityReport {
  schemaVersion: 1;
  checkedAt: string;
  environment: { id: string; platform: NodeJS.Platform; architecture: string };
  providers: ProviderCapabilities[];
  rejectedObservations: number;
  modelCalls: 0;
  projectWrites: 0;
}
export interface CapabilityOptions {
  cwd: string;
  providers?: CapabilityProvider[];
  configured?: Partial<
    Record<CapabilityProvider, Partial<Record<CapabilityName, boolean>>>
  >;
  billing?: {
    codexCreditsUnavailable?: boolean;
    claudeExtraUsageDisabled?: boolean;
  };
}

/** A receipt is evidence to verify, not a provider's assertion of its own ability. */
export interface CapabilityObservation {
  provider: CapabilityProvider;
  capability: CapabilityName;
  environmentId: string;
  providerVersion: string;
  observedAt: string;
  source: "runtime-bridge" | "manual-ui-review";
  invocationId: string;
  evidenceId: string;
  evidence:
    | { kind: "file-read"; contentDigest: string }
    | {
        kind: "file-write";
        beforeDigest: string;
        afterDigest: string;
        verified: true;
      }
    | { kind: "process-exit"; exitCode: 0 }
    | { kind: "browser-state"; surfaceId: string; stateDigest: string }
    | { kind: "mcp-result"; server: string; tool: string; isError: false }
    | NativeQuestionsObservation;
}
export interface NativeQuestionsObservation {
  kind: "native-question-answer";
  surfaceId: string;
  formId: string;
  presentedEvidenceId: string;
  answerEvidenceId: string;
  incorporationEvidenceId: string;
  questionIds: string[];
  answeredQuestionIds: string[];
  incorporatedQuestionIds: string[];
  /** Actual rendered native form; transcript or headless JSON does not qualify. */
  presentation: "native-ui";
}
export type ObservationVerifier = (
  observation: CapabilityObservation,
) => boolean;

interface ProbeResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}
export interface CapabilityDependencies {
  run: (
    file: string,
    args: string[],
    options: SpawnSyncOptionsWithStringEncoding,
  ) => ProbeResult;
  platform: NodeJS.Platform;
  architecture: string;
  env: NodeJS.ProcessEnv;
  now: () => Date;
}
const PROBE_TIMEOUT_MS = 5000;
const PROBE_OUTPUT_BYTES = 64 * 1024;
const fingerprint = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const safeVersion = (value: string): string | null =>
  value.match(
    /\b\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?\b/,
  )?.[0] ?? null;

function executable(
  provider: CapabilityProvider,
  cwd: string,
  deps: CapabilityDependencies,
  probe: (file: string, args: string[]) => ProbeResult,
): string | null {
  if (deps.platform === "win32") {
    const root =
      Object.entries(deps.env).find(([key]) =>
        /^systemroot$/i.test(key),
      )?.[1] ?? "C:\\Windows";
    const found = probe(path.win32.join(root, "System32", "where.exe"), [
      `$PATH:${provider}.exe`,
    ]);
    const candidates = found.stdout.trim().split(/\r?\n/);
    if (found.status !== 0 || found.error) return null;
    return (
      candidates.find(
        (candidate) =>
          path.win32.isAbsolute(candidate) &&
          /\.exe$/i.test(candidate) &&
          !Array.from(candidate).some(
            (character) => character.charCodeAt(0) < 32,
          ) &&
          path.win32.relative(
            path.win32.resolve(cwd),
            path.win32.dirname(candidate),
          ) !== "",
      ) ?? null
    );
  }
  const searchPath =
    Object.entries(deps.env).find(([key]) => /^path$/i.test(key))?.[1] ?? "";
  for (const directory of searchPath.split(path.delimiter)) {
    if (
      !path.isAbsolute(directory) ||
      path.resolve(directory) === path.resolve(cwd)
    )
      continue;
    const candidate = path.join(directory, provider);
    try {
      if (fs.statSync(candidate).isFile()) {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      }
    } catch {
      /* Missing PATH entries are not capabilities. */
    }
  }
  return null;
}

/** Local read-only probes. Never starts a model turn or changes authentication/settings. */
export async function inspectCapabilities(
  options: CapabilityOptions,
  overrides: Partial<CapabilityDependencies> = {},
): Promise<CapabilityReport> {
  const deps: CapabilityDependencies = {
    run: (file, args, settings) => spawnSync(file, args, settings),
    platform: process.platform,
    architecture: process.arch,
    env: subscriptionEnvironment(),
    now: () => new Date(),
    ...overrides,
  };
  deps.env = subscriptionEnvironment(deps.env);
  const providers = options.providers ?? ["codex", "claude"];
  if (
    !path.isAbsolute(options.cwd) ||
    !providers.length ||
    providers.some((provider) => !["codex", "claude"].includes(provider)) ||
    new Set(providers).size !== providers.length
  )
    throw new Error(
      "Capabilities require an absolute project path and distinct supported providers",
    );
  const checkedAt = deps.now().toISOString();
  const identities: unknown[] = [];
  const inspectProvider = (
    provider: CapabilityProvider,
  ): ProviderCapabilities => {
    const probes: ProviderCapabilities["probes"] = [];
    const probe = (file: string, args: string[]): ProbeResult => {
      try {
        const result = deps.run(file, args, {
          cwd: options.cwd,
          env: deps.env,
          encoding: "utf8",
          shell: false,
          windowsHide: true,
          timeout: PROBE_TIMEOUT_MS,
          maxBuffer: PROBE_OUTPUT_BYTES,
          stdio: ["ignore", "pipe", "pipe"],
        });
        // Also bound injected runners. No raw provider diagnostics are returned.
        if (
          Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) >
          PROBE_OUTPUT_BYTES
        )
          return {
            status: null,
            stdout: "",
            stderr: "",
            error: new Error("output-limit"),
          };
        return result;
      } catch {
        return {
          status: null,
          stdout: "",
          stderr: "",
          error: new Error("probe-failed"),
        };
      }
    };
    const file = executable(provider, options.cwd, deps, probe);
    probes.push({
      name: "lookup",
      ok: file !== null,
      reason: file
        ? "Native CLI located on PATH"
        : "Native CLI unavailable on PATH",
    });
    let version: string | null = null;
    let authenticated: boolean | null = null;
    let help: string | null = null;
    if (file) {
      const result = probe(file, ["--version"]);
      version =
        result.status === 0 && !result.error
          ? safeVersion(result.stdout)
          : null;
      probes.push({
        name: "version",
        ok: version !== null,
        reason: version
          ? "CLI version verified"
          : "CLI version could not be verified",
      });
      // Unknown versions fail closed; do not invoke further commands against an unverified executable.
      if (version) {
        const auth = probe(
          file,
          provider === "codex"
            ? [
                "-c",
                'forced_login_method="chatgpt"',
                "-c",
                'model_provider="openai"',
                "login",
                "status",
              ]
            : ["auth", "status"],
        );
        authenticated = false;
        if (auth.status === 0 && !auth.error) {
          if (provider === "codex")
            authenticated = /^Logged in using ChatGPT\s*$/im.test(
              auth.stdout + "\n" + auth.stderr,
            );
          else {
            try {
              const parsed = JSON.parse(auth.stdout) as Record<string, unknown>;
              authenticated =
                parsed.loggedIn === true && parsed.authMethod === "claude.ai";
            } catch {
              /* Unknown/API/cloud authentication fails closed. */
            }
          }
        }
        probes.push({
          name: "auth",
          ok: authenticated,
          reason: authenticated
            ? "Native subscription authentication verified"
            : "Native subscription authentication unverified or unavailable",
        });
        const advertised = probe(
          file,
          provider === "codex" ? ["exec", "--help"] : ["--help"],
        );
        help =
          advertised.status === 0 && !advertised.error
            ? advertised.stdout
            : null;
        probes.push({
          name: "help",
          ok: help !== null,
          reason:
            help !== null
              ? "CLI advertisement inspected; no operation attempted"
              : "CLI advertisements unavailable",
        });
      }
    }
    const configured = options.configured?.[provider] ?? {};
    const includedOnlyAuthorized =
      provider === "codex"
        ? options.billing?.codexCreditsUnavailable === true
        : options.billing?.claudeExtraUsageDisabled === true;
    const advertisements: Record<CapabilityName, RegExp> = {
      read: /\b(?:Read|read_file|file_read)\b/,
      write: /\b(?:Write|Edit|write_file|apply_patch)\b/,
      exec: /\b(?:Bash|shell_command|exec_command|shell_tool)\b/,
      browser: /\b(?:browser_use|computer_use|browser_open|Browser)\b/,
      mcp: /\b(?:MCP|mcp[-_]servers?|mcp[-_]config)\b/,
      nativeQuestions:
        /\b(?:request_user_input|AskUserQuestion|native_question_form)\b/,
    };
    const capabilities = Object.fromEntries<CapabilityEvidence>(
      CAPABILITY_NAMES.map((name) => {
        const configuration =
          typeof configured[name] === "boolean" ? configured[name]! : null;
        const advertised =
          help === null ? null : advertisements[name].test(help);
        const unavailable = !file || !version || configuration === false;
        const state: CapabilityState = unavailable
          ? "unavailable"
          : advertised
            ? "advertised"
            : configuration
              ? "configured"
              : authenticated
                ? "authenticated"
                : "installed";
        return [
          name,
          {
            state,
            configured: configuration,
            advertised,
            observations: [],
            reason: unavailable
              ? configuration === false
                ? "Explicitly disabled in supplied project configuration"
                : "Verified native CLI unavailable"
              : advertised
                ? "CLI help advertises a tool; successful runtime use remains unverified"
                : "No successful operation observed; missing help text does not prove absence",
          } satisfies CapabilityEvidence,
        ];
      }),
    ) as Record<CapabilityName, CapabilityEvidence>;
    identities.push({ provider, file, version, configured, authenticated });
    return {
      provider,
      installed: file !== null,
      version,
      authenticated,
      authMode: authenticated
        ? provider === "codex"
          ? "chatgpt"
          : "claude.ai"
        : null,
      includedOnlyAuthorized,
      configured: Object.values(configured).some((value) => value === true),
      capabilities,
      probes,
    };
  };
  const reports = providers.map(inspectProvider);
  return {
    schemaVersion: 1,
    checkedAt,
    environment: {
      id: fingerprint({
        cwd: path.resolve(options.cwd),
        platform: deps.platform,
        architecture: deps.architecture,
        identities,
      }),
      platform: deps.platform,
      architecture: deps.architecture,
    },
    providers: reports,
    rejectedObservations: 0,
    modelCalls: 0,
    projectWrites: 0,
  };
}

function nonempty(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(value)
  );
}
function receiptMatches(observation: CapabilityObservation): boolean {
  const evidence = observation.evidence;
  const digest = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);
  switch (observation.capability) {
    case "read":
      return evidence.kind === "file-read" && digest(evidence.contentDigest);
    case "write":
      return (
        evidence.kind === "file-write" &&
        evidence.verified === true &&
        digest(evidence.beforeDigest) &&
        digest(evidence.afterDigest) &&
        evidence.beforeDigest !== evidence.afterDigest
      );
    case "exec":
      return evidence.kind === "process-exit" && evidence.exitCode === 0;
    case "browser":
      return (
        evidence.kind === "browser-state" &&
        nonempty(evidence.surfaceId) &&
        digest(evidence.stateDigest)
      );
    case "mcp":
      return (
        evidence.kind === "mcp-result" &&
        evidence.isError === false &&
        nonempty(evidence.server) &&
        nonempty(evidence.tool)
      );
    case "nativeQuestions": {
      if (
        evidence.kind !== "native-question-answer" ||
        evidence.presentation !== "native-ui" ||
        ![
          evidence.surfaceId,
          evidence.formId,
          evidence.presentedEvidenceId,
          evidence.answerEvidenceId,
          evidence.incorporationEvidenceId,
        ].every(nonempty)
      )
        return false;
      const questions = evidence.questionIds;
      return (
        Array.isArray(questions) &&
        questions.length > 0 &&
        questions.length <= 3 &&
        questions.every(nonempty) &&
        new Set(questions).size === questions.length &&
        [evidence.answeredQuestionIds, evidence.incorporatedQuestionIds].every(
          (ids) =>
            Array.isArray(ids) &&
            ids.length === questions.length &&
            new Set(ids).size === ids.length &&
            ids.every((id) => questions.includes(id)),
        )
      );
    }
  }
}

/** No default trust: the caller must verify receipt IDs against actual runtime/UI evidence. */
export function recordCapabilityObservation(
  report: CapabilityReport,
  observation: CapabilityObservation,
  verify: ObservationVerifier,
  now: () => Date = () => new Date(),
): CapabilityReport {
  const result = structuredClone(report);
  const provider = result.providers.find(
    (candidate) => candidate.provider === observation?.provider,
  );
  let valid = false;
  try {
    const time = Date.parse(observation.observedAt);
    valid = Boolean(
      provider?.version &&
      provider.authenticated === true &&
      observation.environmentId === result.environment.id &&
      observation.providerVersion === provider.version &&
      Number.isFinite(time) &&
      time <= now().getTime() &&
      (observation.source === "runtime-bridge" ||
        observation.source === "manual-ui-review") &&
      nonempty(observation.invocationId) &&
      nonempty(observation.evidenceId) &&
      CAPABILITY_NAMES.includes(observation.capability) &&
      provider.capabilities[observation.capability].configured !== false &&
      receiptMatches(observation) &&
      typeof verify === "function" &&
      verify(observation) === true,
    );
  } catch {
    /* Malformed receipts and verifier failures cannot grant a capability. */
  }
  if (!valid || !provider) {
    result.rejectedObservations++;
    return result;
  }
  const capability = provider.capabilities[observation.capability];
  if (
    !capability.observations.some(
      (existing) => existing.evidenceId === observation.evidenceId,
    )
  )
    capability.observations.push(structuredClone(observation));
  capability.state = "actually-observed";
  capability.reason =
    "Successful operation verified for this environment and CLI version; no blanket permission grant";
  return result;
}
