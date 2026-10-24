import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AssistantConfigSchema } from "../src/assistant/home.js";
import {
  createModel,
  type AssistantTool,
  type LanguageModel,
  type ModelRequest,
} from "../src/assistant/llm.js";

const call = (
  id = "save-1",
  input: Record<string, unknown> = { text: "Comprar café" },
) => ({ id, name: "save", input });
const request = (tools: AssistantTool[] = []): ModelRequest => ({
  system: "You are HELEN",
  user: "Ayúdame a organizarme",
  history: [
    { role: "user", content: "El viernes tengo examen" },
    { role: "assistant", content: "Lo tengo en cuenta" },
  ],
  tools,
  timeoutMs: 10_000,
  maxRounds: 4,
});

async function withApi(
  responses: unknown[],
  check: (model: LanguageModel) => Promise<void>,
): Promise<void> {
  let calls = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const content = responses[calls++] ?? responses.at(-1);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(content));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const config = AssistantConfigSchema.parse({
    provider: {
      type: "anthropic",
      model: "local-test-model",
      keyEnv: "HELEN_TEST_KEY",
      baseUrl,
    },
  });
  try {
    await check(createModel(config, { HELEN_TEST_KEY: "local-test-key" })!);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function apiMessage(uses: Array<ReturnType<typeof call>> = []) {
  return {
    id: "msg_local",
    type: "message",
    role: "assistant",
    model: "local-test-model",
    content: uses.length
      ? uses.map((use) => ({ type: "tool_use", ...use }))
      : [{ type: "text", text: "Completado" }],
    stop_reason: uses.length ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

describe("API tool replay protection through the real SDK", () => {
  it.each([false, true])(
    "does not rerun replayed actions, including failed actions (%s)",
    async (failed) => {
      const run = vi.fn(() => {
        if (failed) throw new Error("write failed");
        return "saved";
      });
      await withApi(
        [apiMessage([call(), call()]), apiMessage([call()]), apiMessage()],
        async (api) => {
          expect(await api.answer(request([tool(run)]))).toEqual({
            text: "Completado",
            toolCalls: ["save"],
          });
        },
      );
      expect(run).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects changed replay input before executing new actions in that turn", async () => {
    const run = vi.fn(() => "saved");
    await withApi(
      [
        apiMessage([call()]),
        apiMessage([call("new"), call("save-1", { text: "Other" })]),
      ],
      async (api) => {
        await expect(api.answer(request([tool(run)]))).rejects.toThrow(
          "reused",
        );
      },
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects conflicting duplicate ids in the initial batch without writing", async () => {
    const run = vi.fn(() => "saved");
    await withApi(
      [apiMessage([call(), call("save-1", { text: "Other" })])],
      async (api) => {
        await expect(api.answer(request([tool(run)]))).rejects.toThrow(
          "reused",
        );
      },
    );
    expect(run).not.toHaveBeenCalled();
  });
});
const tool = (run = vi.fn(() => "saved")): AssistantTool => ({
  name: "save",
  description: "Save an explicitly requested task",
  schema: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  input: z.object({ text: z.string().min(1) }).strict(),
  run,
});

function model(
  script: string,
  options: {
    commandTools?: boolean;
    subscriptionOnly?: boolean;
    env?: NodeJS.ProcessEnv;
  } = {},
) {
  const config = AssistantConfigSchema.parse({
    provider: {
      type: "command",
      command: [process.execPath, "-e", script],
      commandTools: options.commandTools ?? true,
      subscriptionOnly: options.subscriptionOnly ?? false,
    },
  });
  return createModel(config, options.env ?? process.env)!;
}
function responseScript(responses: unknown[]): string {
  return `let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk).on('end',()=>{const ctx=JSON.parse(input.split('HELEN_REQUEST_JSON\\n')[1]); const responses=${JSON.stringify(responses)};process.stdout.write(JSON.stringify(responses[ctx.turns.length/2]??responses.at(-1)));});`;
}

describe("command model tool protocol", () => {
  it("is opt-in and preserves the plain text provider", async () => {
    const plain = model(
      "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('Hola'));",
      { commandTools: false },
    );
    expect(plain.usesTools).toBe(false);
    expect(await plain.answer(request())).toEqual({
      text: "Hola",
      toolCalls: [],
    });
    const defaultConfig = AssistantConfigSchema.parse({
      provider: { type: "command", command: [process.execPath] },
    });
    expect(createModel(defaultConfig)!.usesTools).toBe(false);
  });

  it("includes history and schemas, executes a validated tool then passes its result back", async () => {
    const run = vi.fn(() => "guardado: t123456");
    const script = `let input='';process.stdin.on('data',c=>input+=c).on('end',()=>{const ctx=JSON.parse(input.split('HELEN_REQUEST_JSON\\n')[1]);if(ctx.turns.length===0){if(ctx.history[0].content!=='El viernes tengo examen'||ctx.tools[0].input_schema.required[0]!=='text')process.exit(8);process.stdout.write(JSON.stringify({text:'',toolCalls:[${JSON.stringify(call())}]}));}else {const result=ctx.turns[1].results[0];process.stdout.write(JSON.stringify({text:result.content==='guardado: t123456'&&!result.isError?'Ya está guardado':'Falló'}));}});`;
    const command = model(script);
    expect(command.usesTools).toBe(true);
    expect(await command.answer(request([tool(run)]))).toEqual({
      text: "Ya está guardado",
      toolCalls: ["save"],
    });
    expect(run).toHaveBeenCalledExactlyOnceWith({ text: "Comprar café" });
  });

  it.each([
    "not json",
    '{"text":"ok","toolCalls":null}',
    '{"text":"ok","unexpected":true}',
    '{"text":"","toolCalls":[{"id":"one","name":"save","input":[]}]}',
  ])("rejects malformed envelopes without writes: %s", async (output) => {
    const run = vi.fn(() => "saved");
    const command = model(
      `process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(output)}));`,
    );
    await expect(command.answer(request([tool(run)]))).rejects.toThrow(
      /JSON|envelope/,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it.each([call("second", { text: 42 }), { ...call("second"), name: "shell" }])(
    "validates the entire call batch before any write",
    async (bad) => {
      const run = vi.fn(() => "saved");
      await expect(
        model(responseScript([{ text: "", toolCalls: [call(), bad] }])).answer(
          request([tool(run)]),
        ),
      ).rejects.toThrow(/input|Unknown/);
      expect(run).not.toHaveBeenCalled();
    },
  );

  it("replays identical ids once within and across rounds, including reordered object keys", async () => {
    const run = vi.fn(() => "saved");
    const save = {
      ...tool(run),
      input: z.object({ text: z.string(), list: z.string() }),
    };
    const first = call("once", { text: "Comprar café", list: "inbox" });
    const second = call("once", { list: "inbox", text: "Comprar café" });
    expect(
      await model(
        responseScript([
          { text: "", toolCalls: [first, first] },
          { text: "", toolCalls: [second] },
          { text: "Hecho" },
        ]),
      ).answer(request([save])),
    ).toEqual({ text: "Hecho", toolCalls: ["save"] });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects changed replay input before executing any call in that round", async () => {
    const run = vi.fn(() => "saved");
    const command = model(
      responseScript([
        { text: "", toolCalls: [call()] },
        {
          text: "",
          toolCalls: [
            call("new-action"),
            call("save-1", { text: "Otra tarea" }),
          ],
        },
      ]),
    );
    await expect(command.answer(request([tool(run)]))).rejects.toThrow(
      "reused",
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects a reused id with different payload in the same batch without writing", async () => {
    const run = vi.fn(() => "saved");
    await expect(
      model(
        responseScript([
          { text: "", toolCalls: [call(), call("save-1", { text: "Other" })] },
        ]),
      ).answer(request([tool(run)])),
    ).rejects.toThrow("reused");
    expect(run).not.toHaveBeenCalled();
  });

  it("returns bounded redacted errors as tool results and never retries the failed action", async () => {
    const run = vi.fn(() => {
      throw new Error("failed " + "x".repeat(3000));
    });
    const script = responseScript([
      { text: "", toolCalls: [call()] },
      { text: "", toolCalls: [call()] },
      { text: "La acción falló" },
    ]);
    expect(await model(script).answer(request([tool(run)]))).toEqual({
      text: "La acción falló",
      toolCalls: ["save"],
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("signals round exhaustion instead of returning intermediate success text", async () => {
    const run = vi.fn(() => "saved");
    const answer = await model(
      responseScript([{ text: "Ya está todo", toolCalls: [call()] }]),
    ).answer({ ...request([tool(run)]), maxRounds: 1 });
    expect(answer).toEqual({ text: "", toolCalls: ["save"], truncated: true });
  });

  it("kills a hanging model within the total deadline without running tools", async () => {
    const run = vi.fn(() => "saved");
    await expect(
      model("setInterval(()=>{},1000)").answer({
        ...request([tool(run)]),
        timeoutMs: 100,
      }),
    ).rejects.toThrow("too long");
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects overflowing output before parsing or running tools", async () => {
    const run = vi.fn(() => "saved");
    await expect(
      model(
        "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('x'.repeat(200001)));",
      ).answer(request([tool(run)])),
    ).rejects.toThrow("exceeded");
    expect(run).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "strips API and custom environment variables only in subscription mode (%s)",
    async (subscriptionOnly) => {
      const script =
        "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(JSON.stringify({text:JSON.stringify({api:process.env.ANTHROPIC_API_KEY??null,custom:process.env.HELEN_CUSTOM_SECRET??null,home:process.env.HOME??null,disabled:process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC??null})})));";
      const answer = await model(script, {
        subscriptionOnly,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: "private-key",
          HELEN_CUSTOM_SECRET: "private-custom",
          HOME: "test-home",
        },
      }).answer(request());
      expect(JSON.parse(answer.text)).toEqual({
        api: subscriptionOnly ? null : "private-key",
        custom: subscriptionOnly ? null : "private-custom",
        home: "test-home",
        disabled: subscriptionOnly
          ? "1"
          : (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ?? null),
      });
    },
  );

  it("bounds tool result content and marks its errors in the next turn", async () => {
    const save = tool(vi.fn(() => "z".repeat(15_000)));
    const script = `let input='';process.stdin.on('data',c=>input+=c).on('end',()=>{const ctx=JSON.parse(input.split('HELEN_REQUEST_JSON\\n')[1]);process.stdout.write(JSON.stringify(ctx.turns.length?{text:String(ctx.turns[1].results[0].content.length)}:{text:'',toolCalls:[${JSON.stringify(call())}]}));});`;
    expect((await model(script).answer(request([save]))).text).toBe("12000");
  });

  it("redacts individual context strings without breaking the JSON protocol", async () => {
    const script =
      "let input='';process.stdin.on('data',c=>input+=c).on('end',()=>{const ctx=JSON.parse(input.split('HELEN_REQUEST_JSON\\n')[1]);process.stdout.write(JSON.stringify({text:JSON.stringify({user:ctx.user,history:ctx.history[0].content})}));});";
    const answer = await model(script).answer({
      ...request(),
      user: "password:hunter2abc",
      history: [{ role: "user", content: "token=abcdefghijklmnop" }],
    });
    const context = JSON.parse(answer.text);
    expect(context.user).not.toContain("hunter2abc");
    expect(context.history).not.toContain("abcdefghijklmnop");
  });
  it("aborts a running command when its conversation is interrupted", async () => {
    const controller = new AbortController();
    const pending = model(
      "process.stdin.resume();setTimeout(()=>{},30000)",
    ).answer({ ...request(), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow(/abort/i);
  });
});
import http from "node:http";
import type { AddressInfo } from "node:net";
