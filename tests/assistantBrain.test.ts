import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  handleMessage,
  toSpeech,
  type BrainOptions,
} from "../src/assistant/brain.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import {
  createModel,
  ModelError,
  type LanguageModel,
  type ModelRequest,
} from "../src/assistant/llm.js";
import { addMemory, listMemory } from "../src/assistant/memory.js";
import { listReminders } from "../src/assistant/reminders.js";
import { listTasks } from "../src/assistant/tasks.js";

const NOW = new Date("2026-10-20T08:30:00Z");
let home: string;
let config: AssistantConfig;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-brain-"));
  config = writeConfig(
    { owner: "Eneko", timezone: "Europe/Madrid", locale: "es-ES" },
    home,
  );
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

const ask = (text: string, options: Partial<BrainOptions> = {}) =>
  handleMessage(text, {
    home,
    channel: "cli",
    config,
    now: NOW,
    model: null,
    ...options,
  });

describe("conversation without a model", () => {
  it("handles a day of requests in Spanish", async () => {
    expect((await ask("Recuérdame llamar a mamá mañana a las 9")).text).toBe(
      "Hecho: te recordaré «llamar a mamá» mañana (miércoles, 21 de octubre) a las 09:00.",
    );
    expect(
      (await ask("recuerda que el viernes a las 17 tengo dentista")).text,
    ).toBe("Apuntado. Y te aviso el viernes, 23 de octubre, a las 17:00.");
    expect(
      (await ask("Añade leche, huevos y pan a la lista de la compra")).text,
    ).toBe("Añadido a la lista de la compra: leche, huevos y pan.");
    expect((await ask("añade llamar al banco a mi lista")).text).toBe(
      "Añadido a tus tareas: llamar al banco.",
    );
    expect((await ask("ya he comprado la leche")).text).toBe(
      "Hecho: «leche». Quedan 2 en la lista.",
    );
    expect((await ask("¿cuándo es el dentista?")).text).toMatch(
      /Recordatorio el viernes, 23 de octubre, a las 17:00: tengo dentista/,
    );
    expect((await ask("¿Qué tengo mañana?")).text).toMatch(
      /^Mañana:\n- 09:00 llamar a mamá/,
    );
    expect((await ask("cancela el recordatorio de mamá")).text).toBe(
      "Cancelado: «llamar a mamá».",
    );
    expect((await ask("¿qué hora es?")).text).toBe("Son las 10:30.");
    expect(listReminders(home).map((reminder) => reminder.text)).toEqual([
      "tengo dentista",
    ]);
  });

  it("asks when, and takes the next message as the answer", async () => {
    expect((await ask("Recuérdame comprar un regalo para Ana")).text).toBe(
      "¿Cuándo te lo recuerdo?",
    );
    const answer = await ask("el sábado por la mañana");
    expect(answer.intent).toBe("remind");
    expect(listReminders(home)[0]).toMatchObject({
      text: "comprar un regalo para Ana",
      due: "2026-10-24T07:00:00.000Z",
    });
  });

  it("offers to save what it does not understand, and forgets only after a yes", async () => {
    expect((await ask("el coche está en la planta -2")).text).toContain(
      "¿Quieres que lo guarde",
    );
    expect((await ask("sí")).text).toBe("Apuntado.");
    expect(listMemory(home)[0]!.title).toBe("el coche está en la planta -2");
    expect((await ask("olvida lo del coche")).text).toContain(
      "¿Borro «el coche está en la planta -2»",
    );
    expect((await ask("no")).text).toBe("De acuerdo, lo dejo.");
    expect(listMemory(home)).toHaveLength(1);
    await ask("olvida lo del coche");
    expect((await ask("sí")).text).toContain("Borrado");
    expect(listMemory(home)).toHaveLength(0);
  });

  it("keeps each conversation's pending question apart", async () => {
    await ask("Recuérdame regar las plantas", {
      channel: "telegram",
      conversation: "1",
    });
    const other = await ask("mañana a las 9", {
      channel: "telegram",
      conversation: "2",
    });
    expect(other.intent).not.toBe("remind");
    expect(listReminders(home)).toEqual([]);
  });

  it("refuses secrets and keeps private notes off speakers and channels that are not allowed", async () => {
    expect(
      (await ask("recuerda que la contraseña del correo es Pepe1234")).text,
    ).toContain("No guardo credenciales");
    await ask("recuerda que el código del portal es 4532");
    expect((await ask("¿cuál es el código del portal?")).text).toContain(
      "4532",
    );
    const spoken = await ask("qué sabes del código del portal", {
      channel: "alexa",
    });
    expect(spoken.speech).not.toContain("4532");
    const telegram = await ask("qué sabes del código del portal", {
      channel: "telegram",
    });
    expect(telegram.text).not.toContain("4532");
    expect(telegram.text).toContain("privado");
  });

  it("answers in English when spoken to in English", async () => {
    expect(
      (await ask("remind me to call the dentist tomorrow at 10am")).text,
    ).toBe(
      'Done. Reminder tomorrow (Wednesday, October 21) at 10:00: "call the dentist".',
    );
    expect((await ask("add milk and eggs to my shopping list")).text).toBe(
      "Added to the shopping list: milk and eggs.",
    );
    expect(
      listTasks(home, { list: "compra" }).map((task) => task.text),
    ).toEqual(["milk", "eggs"]);
  });

  it("speaks in short sentences, without ids or list marks", () => {
    expect(
      toSpeech(
        "Esto es lo que tengo:\n- El wifi es Casa_5G (m1a2b3c)\n- Recordatorio mañana: dentista (r1a2b3c)",
      ),
    ).toBe(
      "Esto es lo que tengo: El wifi es Casa 5G. Recordatorio mañana: dentista.",
    );
  });
});

/** A model that follows a script: the tools it calls and what it finally says. */
function scriptedModel(
  steps: Array<
    (
      request: ModelRequest,
    ) =>
      | Promise<{ text: string; toolCalls: string[] }>
      | { text: string; toolCalls: string[] }
  >,
): LanguageModel & { requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  return {
    kind: "anthropic",
    usesTools: true,
    requests,
    answer: async (request) => {
      requests.push(request);
      const step = steps[requests.length - 1];
      if (!step) throw new ModelError("no more steps", false);
      return step(request);
    },
  };
}

describe("everyday phrasings", () => {
  it("moves a reminder keeping its day, and snoozes with plain words", async () => {
    await ask("recuérdame mañana a las 9 llamar a mamá");
    expect((await ask("cambia el recordatorio de mamá a las 10")).text).toBe(
      "Cambiado: «llamar a mamá» mañana (miércoles, 21 de octubre) a las 10:00.",
    );
    expect((await ask("pospón eso una hora")).text).toMatch(
      /^Te lo vuelvo a recordar/,
    );
  });

  it("understands the time before the verb and filler words", async () => {
    expect(
      (await ask("todos los lunes a las 8 recuérdame ir al gimnasio")).text,
    ).toMatch(/«ir al gimnasio» cada lunes a las 08:00/);
    expect(
      (await ask("oye, apúntame que el viernes tengo dentista a las 5")).text,
    ).toBe("Apuntado. Y te aviso el viernes, 23 de octubre, a las 17:00.");
  });

  it("removes a task by name and asks when the name fits several things", async () => {
    await ask("añade leche y pan a la compra");
    expect((await ask("borra lo de la leche")).text).toBe(
      "Quitado de tus tareas: «leche».",
    );
    await ask("recuérdame mañana a las 9 comprar pan");
    expect((await ask("borra lo del pan")).text).toMatch(
      /Puede ser: tarea «pan», recordatorio «comprar pan»/,
    );
  });

  it("finds a note from a question about it", async () => {
    await ask("apunta que las llaves están en el cajón");
    expect((await ask("dónde dejé las llaves")).text).toMatch(
      /las llaves están en el cajón/,
    );
  });
});

describe("with a model", () => {
  it("sends only what the rules do not understand, with tools that act on HELEN's data", async () => {
    const model = scriptedModel([
      async (request) => {
        const add = request.tools.find((tool) => tool.name === "reminder_add")!;
        const output = await add.run({
          what: "revisar el coche",
          when: "el lunes a las 9",
        });
        return {
          text: `Te lo recordaré. ${JSON.parse(output).when}`,
          toolCalls: ["reminder_add"],
        };
      },
    ]);
    expect(
      (await ask("Recuérdame llamar a mamá mañana a las 9", { model })).intent,
    ).toBe("remind");
    expect(model.requests).toHaveLength(0);
    const answer = await ask(
      "el lunes a primera hora tengo que acordarme de revisar el coche, ¿me ayudas?",
      { model },
    );
    expect(answer.intent).toBe("model");
    expect(model.requests[0]!.system).toContain(
      "You are HELEN, the personal assistant of Eneko",
    );
    expect(model.requests[0]!.user).toContain("Message from the owner:");
    expect(listReminders(home).map((reminder) => reminder.text)).toContain(
      "revisar el coche",
    );
  });

  it("never shows private items to the model unless the owner allows it", async () => {
    addMemory(home, { text: "El código del portal es 4532" });
    addMemory(home, { text: "El portal tiene timbre a la derecha" });
    const model = scriptedModel([
      async (request) => {
        const search = request.tools.find(
          (tool) => tool.name === "memory_search",
        )!;
        return {
          text: await search.run({ query: "portal" }),
          toolCalls: ["memory_search"],
        };
      },
    ]);
    const answer = await ask("cuéntame cosas sobre el portal por favor", {
      model,
    });
    expect(answer.text).toContain("timbre");
    expect(answer.text).not.toContain("4532");
  });

  it("falls back to memory when the model fails, and says why on screens", async () => {
    addMemory(home, { text: "La bici está en el trastero" });
    const model = scriptedModel([
      () => {
        throw new ModelError("The model took too long to answer.", true);
      },
    ]);
    const answer = await ask("necesito saber dónde guardé la bici", { model });
    expect(answer.text).toMatch(
      /No he podido consultar el modelo, pero tengo esto: La bici está en el trastero/,
    );
    expect(answer.text).toContain("(The model took too long to answer.)");
  });

  it('in "always" mode every message goes to the model first', async () => {
    const always = writeConfig(
      {
        ...config,
        provider: { type: "command", command: ["true"], mode: "always" },
      },
      home,
    );
    const model = scriptedModel([() => ({ text: "Claro.", toolCalls: [] })]);
    expect(
      (
        await handleMessage("qué hora es", {
          home,
          channel: "cli",
          config: always,
          now: NOW,
          model,
        })
      ).text,
    ).toBe("Claro.");
  });
});

describe("the Claude API client (real SDK, local stand-in for the API)", () => {
  let server: http.Server;
  let baseUrl: string;
  const bodies: Array<Record<string, unknown>> = [];
  let respond: (
    body: Record<string, unknown>,
    call: number,
  ) => { status: number; json: unknown };

  beforeEach(async () => {
    bodies.length = 0;
    server = http.createServer((request, response) => {
      let raw = "";
      request.on("data", (chunk) => {
        raw += chunk;
      });
      request.on("end", () => {
        const body = JSON.parse(raw) as Record<string, unknown>;
        bodies.push({
          ...body,
          __path: request.url,
          __key: request.headers["x-api-key"],
        });
        const { status, json } = respond(body, bodies.length);
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(json));
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );

  const message = (content: unknown[], stopReason: string) => ({
    status: 200,
    json: {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "test-model",
      content,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  });

  it("runs the tool loop: validated input, results returned in one turn, final text", async () => {
    addMemory(home, { text: "El wifi de casa se llama Movistar_5G" });
    respond = (_body, call) =>
      call === 1
        ? message(
            [
              { type: "thinking", thinking: "", signature: "sig" },
              {
                type: "tool_use",
                id: "toolu_1",
                name: "memory_search",
                input: { query: "wifi" },
              },
              {
                type: "tool_use",
                id: "toolu_2",
                name: "memory_search",
                input: { limit: "many" },
              },
            ],
            "tool_use",
          )
        : message(
            [{ type: "text", text: "El wifi se llama Movistar_5G." }],
            "end_turn",
          );
    const model = createModel(
      {
        ...config,
        provider: {
          type: "anthropic",
          model: "test-model",
          keyEnv: "HELEN_TEST_KEY",
          baseUrl,
          mode: "fallback",
          allowSensitive: false,
          maxRounds: 4,
          timeoutMs: 10_000,
          voiceTimeoutMs: 6000,
        },
      },
      { HELEN_TEST_KEY: "test-key" },
    )!;
    const answer = await handleMessage("necesito el nombre de la red de casa", {
      home,
      channel: "cli",
      config,
      now: NOW,
      model,
    });
    expect(answer.text).toBe("El wifi se llama Movistar_5G.");
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toMatchObject({
      __path: "/v1/messages",
      __key: "test-key",
      model: "test-model",
      system: [{ type: "text", cache_control: { type: "ephemeral" } }],
    });
    const second = bodies[1]!.messages as Array<{
      role: string;
      content: Array<Record<string, unknown>>;
    }>;
    expect(second[1]!.role).toBe("assistant");
    expect(second[1]!.content[0]).toMatchObject({ type: "thinking" }); // the assistant turn goes back unchanged
    expect(second[2]!.role).toBe("user");
    expect(second[2]!.content).toHaveLength(2); // every result in one turn
    expect(second[2]!.content[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "toolu_1",
    });
    expect(String(second[2]!.content[0]!.content)).toContain("Movistar_5G");
    expect(second[2]!.content[1]).toMatchObject({
      type: "tool_result",
      tool_use_id: "toolu_2",
      is_error: true,
    });
  });

  it("turns API failures and refusals into plain answers", async () => {
    const provider = {
      type: "anthropic" as const,
      model: "test-model",
      keyEnv: "HELEN_TEST_KEY",
      baseUrl,
      mode: "fallback" as const,
      allowSensitive: false,
      maxRounds: 4,
      timeoutMs: 10_000,
      voiceTimeoutMs: 6000,
    };
    respond = () => ({
      status: 401,
      json: {
        type: "error",
        error: { type: "authentication_error", message: "invalid x-api-key" },
      },
    });
    const model = createModel(
      { ...config, provider },
      { HELEN_TEST_KEY: "bad" },
    )!;
    await expect(
      model.answer({
        system: "s",
        user: "u",
        tools: [],
        timeoutMs: 5000,
        maxRounds: 2,
      }),
    ).rejects.toThrow(/rejected the API key/);
    respond = () => message([], "refusal");
    expect(
      (
        await model.answer({
          system: "s",
          user: "u",
          tools: [],
          timeoutMs: 5000,
          maxRounds: 2,
        })
      ).refused,
    ).toBe(true);
    expect(() => createModel({ ...config, provider }, {})).toThrow(
      /HELEN_TEST_KEY/,
    );
  });

  it("redacts secrets before anything leaves the machine", async () => {
    respond = () => message([{ type: "text", text: "ok" }], "end_turn");
    const model = createModel(
      {
        ...config,
        provider: {
          type: "anthropic",
          model: "test-model",
          keyEnv: "HELEN_TEST_KEY",
          baseUrl,
          mode: "fallback",
          allowSensitive: false,
          maxRounds: 2,
          timeoutMs: 10_000,
          voiceTimeoutMs: 6000,
        },
      },
      { HELEN_TEST_KEY: "k" },
    )!;
    // Built at run time so that no secret-shaped literal sits in the repository.
    const fake = ["ghp", "Ab3".repeat(12)].join("_");
    await model.answer({
      system: "s",
      user: `mi token es GITHUB_TOKEN=${fake}`,
      tools: [],
      timeoutMs: 5000,
      maxRounds: 2,
    });
    expect(JSON.stringify(bodies[0])).not.toContain(fake);
  });
});

describe("a local command as the model", () => {
  it("sends the prompt on stdin and returns stdout without terminal codes", async () => {
    const script =
      'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{process.stdout.write("\\u001b[1mLeído:\\u001b[0m "+(s.includes("Message from the owner")?"sí":"no"))})';
    const model = createModel({
      ...config,
      provider: {
        type: "command",
        command: [process.execPath, "-e", script],
        mode: "fallback",
        allowSensitive: false,
        maxRounds: 2,
        timeoutMs: 10_000,
        voiceTimeoutMs: 6000,
      },
    })!;
    expect(model.usesTools).toBe(false);
    expect(
      (
        await handleMessage(
          "una pregunta que las reglas no entienden del todo",
          { home, channel: "cli", config, now: NOW, model },
        )
      ).text,
    ).toBe("Leído: sí");
  });

  it("reports a missing command clearly", async () => {
    const model = createModel({
      ...config,
      provider: {
        type: "command",
        command: ["helen-no-such-model-cli"],
        mode: "fallback",
        allowSensitive: false,
        maxRounds: 2,
        timeoutMs: 5000,
        voiceTimeoutMs: 5000,
      },
    })!;
    await expect(
      model.answer({
        system: "s",
        user: "u",
        tools: [],
        timeoutMs: 5000,
        maxRounds: 1,
      }),
    ).rejects.toThrow(/was not found/);
  });
});
