import { spawn } from "node:child_process";
import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { redact } from "../core/secrets.js";
import type { AssistantConfig } from "./home.js";

/**
 * The optional language model behind HELEN. Rules answer what they understand; the model handles the rest.
 *
 * - anthropic: the Claude API through the official SDK, with HELEN's tools (memory, reminders, lists, agenda)
 *   in a manual loop, so every tool call is validated, privacy-filtered and bounded.
 * - command: any local CLI that reads a prompt on stdin and prints an answer (for example `claude -p`).
 *   It gets the relevant context in the prompt but cannot act; HELEN's rules do the acting.
 *
 * Everything sent to a model passes through redact(), and items marked sensitive are left out unless the
 * owner allowed it. The model id is the owner's choice: HELEN ships no default.
 */
export interface AssistantTool {
  name: string;
  /** When to call it, not just what it does: the model decides from this. */
  description: string;
  schema: Anthropic.Tool["input_schema"];
  input: z.ZodType<Record<string, unknown>, z.ZodTypeDef, unknown>;
  run(input: Record<string, unknown>): Promise<string> | string;
}

export interface ModelRequest {
  system: string;
  user: string;
  tools: AssistantTool[];
  timeoutMs: number;
  maxRounds: number;
}

export interface ModelAnswer {
  text: string;
  /** Names of the tools the model used, in order. */
  toolCalls: string[];
  refused?: boolean;
  truncated?: boolean;
}

export interface LanguageModel {
  readonly kind: "anthropic" | "command";
  readonly usesTools: boolean;
  answer(request: ModelRequest): Promise<ModelAnswer>;
}

export class ModelError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ModelError";
  }
}

type Provider = NonNullable<AssistantConfig["provider"]>;

const MAX_TOOL_OUTPUT = 12_000;

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/** Describe an SDK failure without leaking request details; say whether trying again could help. */
async function describeError(error: unknown): Promise<ModelError> {
  const { default: SDK } = await import("@anthropic-ai/sdk");
  if (error instanceof SDK.AuthenticationError)
    return new ModelError(
      "The model provider rejected the API key (check the key in the configured environment variable).",
      false,
    );
  if (error instanceof SDK.PermissionDeniedError)
    return new ModelError("The API key has no access to this model.", false);
  if (error instanceof SDK.NotFoundError)
    return new ModelError(
      "The configured model was not found: check provider.model.",
      false,
    );
  if (error instanceof SDK.BadRequestError)
    return new ModelError(
      `The model provider rejected the request: ${error.message}`,
      false,
    );
  if (error instanceof SDK.RateLimitError)
    return new ModelError(
      "The model provider is rate limiting requests; try again shortly.",
      true,
    );
  if (error instanceof SDK.APIConnectionTimeoutError)
    return new ModelError("The model took too long to answer.", true);
  if (error instanceof SDK.APIConnectionError)
    return new ModelError(
      "Could not reach the model provider (network).",
      true,
    );
  if (error instanceof SDK.APIError)
    return new ModelError(
      `The model provider failed (${error.status ?? "no status"}).`,
      true,
    );
  return new ModelError((error as Error)?.message ?? String(error), false);
}

class ClaudeModel implements LanguageModel {
  readonly kind = "anthropic" as const;
  readonly usesTools = true;
  private client: Promise<Anthropic>;

  constructor(
    private readonly provider: Provider,
    env: NodeJS.ProcessEnv,
  ) {
    const apiKey = provider.keyEnv ? env[provider.keyEnv] : undefined;
    if (provider.keyEnv && !apiKey)
      throw new ModelError(
        `The environment variable ${provider.keyEnv} (provider.keyEnv) is not set.`,
        false,
      );
    this.client = import("@anthropic-ai/sdk").then(
      ({ default: SDK }) =>
        new SDK({
          ...(apiKey ? { apiKey } : {}),
          ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
          maxRetries: 1,
        }),
    );
  }

  async answer(request: ModelRequest): Promise<ModelAnswer> {
    const client = await this.client;
    const deadline = Date.now() + request.timeoutMs;
    const tools: Anthropic.Tool[] = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.schema,
    }));
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: redact(request.user) },
    ];
    const toolCalls: string[] = [];

    for (let round = 0; round < request.maxRounds; round += 1) {
      const remaining = deadline - Date.now();
      if (remaining < 500)
        throw new ModelError("The model took too long to answer.", true);
      let response: Anthropic.Message;
      try {
        response = await client.messages.create(
          {
            model: this.provider.model!,
            max_tokens: 16000,
            // The system prompt never changes between requests, so it is cached; the volatile context lives in the user turn.
            system: [
              {
                type: "text",
                text: request.system,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools,
            messages,
            ...(this.provider.effort
              ? { output_config: { effort: this.provider.effort } }
              : {}),
          },
          { timeout: remaining },
        );
      } catch (error) {
        throw await describeError(error);
      }

      if (response.stop_reason === "refusal")
        return { text: "", toolCalls, refused: true };
      const uses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (response.stop_reason !== "tool_use" || uses.length === 0) {
        return {
          text: textOf(response.content),
          toolCalls,
          ...(response.stop_reason === "max_tokens" ? { truncated: true } : {}),
        };
      }

      // The whole assistant turn goes back unchanged (thinking blocks included), followed by every result in one user turn.
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of uses) {
        toolCalls.push(use.name);
        const tool = request.tools.find(
          (candidate) => candidate.name === use.name,
        );
        if (!tool) {
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: `Unknown tool "${use.name}".`,
            is_error: true,
          });
          continue;
        }
        const parsed = tool.input.safeParse(use.input);
        if (!parsed.success) {
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: `Invalid input: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"} ${issue.message}`).join("; ")}`,
            is_error: true,
          });
          continue;
        }
        try {
          const output = await tool.run(parsed.data);
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: redact(output).slice(0, MAX_TOOL_OUTPUT),
          });
        } catch (error) {
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: redact((error as Error).message).slice(0, 2000),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return { text: "", toolCalls, truncated: true };
  }
}

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const CSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, "g");
const OSC = new RegExp(`${ESC}\\][^${BEL}]*${BEL}`, "g");

/** Strip terminal escape sequences a CLI may print even when not attached to a terminal. */
function plain(text: string): string {
  return text.replace(CSI, "").replace(OSC, "").trim();
}

class CommandModel implements LanguageModel {
  readonly kind = "command" as const;
  readonly usesTools = false;

  constructor(
    private readonly argv: string[],
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  answer(request: ModelRequest): Promise<ModelAnswer> {
    const prompt = redact(`${request.system}\n\n${request.user}`);
    return new Promise((resolve, reject) => {
      const [program, ...args] = this.argv;
      const child = spawn(program!, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: this.env,
      });
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new ModelError("The model command took too long to answer.", true),
        );
      }, request.timeoutMs);
      child.stdout.on("data", (chunk) => {
        if (out.length < 200_000) out += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        if (err.length < 4000) err += String(chunk);
      });
      child.stdin.on("error", () => {
        /* the command may exit without reading */
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        const code = (error as NodeJS.ErrnoException).code;
        reject(
          new ModelError(
            code === "ENOENT"
              ? `The model command "${program}" was not found.`
              : error.message,
            false,
          ),
        );
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0)
          return reject(
            new ModelError(
              `The model command exited with code ${code}: ${plain(err).slice(0, 300)}`,
              true,
            ),
          );
        resolve({ text: plain(out).slice(0, 8000), toolCalls: [] });
      });
      child.stdin.end(prompt);
    });
  }
}

/** The configured model, or null when the owner has not set one up. */
export function createModel(
  config: AssistantConfig,
  env: NodeJS.ProcessEnv = process.env,
): LanguageModel | null {
  const provider = config.provider;
  if (!provider) return null;
  if (provider.type === "command")
    return new CommandModel(provider.command!, env);
  return new ClaudeModel(provider, env);
}
