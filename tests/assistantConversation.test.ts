import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { getConversation } from "../src/assistant/conversation.js";
import { readConfig } from "../src/assistant/home.js";
import type { LanguageModel, ModelRequest } from "../src/assistant/llm.js";
import {
  addMemory,
  forgetMemory,
  listMemory,
} from "../src/assistant/memory.js";
import { listReminders, snoozeReminder } from "../src/assistant/reminders.js";
import { listTasks } from "../src/assistant/tasks.js";
import { addTasks } from "../src/assistant/tasks.js";

let home: string;
const now = new Date("2026-10-23T10:00:00Z");
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-conversation-"));
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});
const config = () => ({ ...readConfig(home), timezone: "Europe/Madrid" });
function model(
  run: (request: ModelRequest) => string | Promise<string>,
): LanguageModel {
  return {
    kind: "anthropic",
    usesTools: true,
    answer: async (request) => ({ text: await run(request), toolCalls: [] }),
  };
}
const ask = (
  text: string,
  extra: Partial<Parameters<typeof handleMessage>[1]> = {},
) =>
  handleMessage(text, {
    home,
    channel: "cli",
    config: config(),
    now,
    model: null,
    ...extra,
  });

describe("assistant conversational depth", () => {
  it("retains only bounded recent context through a long conversation", async () => {
    for (let index = 0; index < 16; index++)
      await ask(`Explica el tema ${index}`, {
        model: model(() => "respuesta ".repeat(400)),
      });
    const history = getConversation(home, "cli:default", now).history!;
    expect(history.length).toBeLessThanOrEqual(24);
    expect(
      history.reduce((sum, turn) => sum + turn.content.length, 0),
    ).toBeLessThanOrEqual(24000);
    expect(history[0]!.content).not.toBe("Explica el tema 0");
  });
  it("keeps offline actions available with a missing model credential", async () => {
    const configured = {
      ...config(),
      provider: {
        type: "anthropic" as const,
        model: "test",
        keyEnv: "HELEN_TEST_MISSING_CREDENTIAL",
        mode: "fallback" as const,
        allowSensitive: false,
        maxRounds: 2,
        timeoutMs: 1000,
        voiceTimeoutMs: 1000,
      },
    };
    const result = await ask("recuérdame llamar a mamá mañana a las 9", {
      config: configured,
      model: undefined,
    });
    expect(result.intent).toBe("remind");
    expect(listReminders(home)).toHaveLength(1);
  });
  it("corrects a durable memory through validated model tools without duplicating it", async () => {
    const item = addMemory(home, { text: "Prefiero estudiar por la mañana" });
    await ask("Corrige mi preferencia: prefiero estudiar por la tarde", {
      model: model(async (request) => {
        const search = request.tools.find(
          (tool) => tool.name === "memory_search",
        )!;
        expect(await search.run({ query: "estudiar" })).toContain(item.id);
        const update = request.tools.find(
          (tool) => tool.name === "memory_update",
        )!;
        await update.run({
          id: item.id,
          text: "Prefiero estudiar por la tarde",
        });
        return "Preferencia corregida.";
      }),
    });
    expect(listMemory(home)).toHaveLength(1);
    expect(listMemory(home)[0]!.title).toContain("por la tarde");
  });
  it("does not forward explicitly private notes through a later conversation turn", async () => {
    addMemory(home, {
      text: "Mi regalo sorpresa es un telescopio",
      sensitive: true,
    });
    const answer = await ask("cuál es mi regalo sorpresa");
    expect(answer.text).toContain("telescopio");
    await ask("Ahora hablemos de astronomía", {
      model: model((request) => {
        expect(JSON.stringify(request.history)).not.toContain("telescopio");
        return "La astronomía estudia los cuerpos celestes.";
      }),
    });
  });
  it("refuses malformed collection roots without overwriting them", () => {
    const file = path.join(home, "tasks.json");
    const damaged = '{"version":2,"items":[]}';
    fs.writeFileSync(file, damaged);
    expect(() => addTasks(home, { text: "test" })).toThrow(
      /invalid collection/,
    );
    expect(fs.readFileSync(file, "utf8")).toBe(damaged);
  });
  it("passes bounded history across fresh model instances, isolates sessions and expires context", async () => {
    await ask("Compara estudiar física y química", {
      model: model(() => "Física: movimiento. Química: materia."),
    });
    await ask("Amplía la segunda opción", {
      model: model((request) => {
        expect(
          request.history?.map((turn) => turn.content).join(" "),
        ).toContain("Química");
        expect(request.system).toContain("open-ended conversations");
        return "Química estudia las transformaciones de la materia.";
      }),
    });
    await ask("Otra cosa", {
      conversation: "other",
      model: model((request) => {
        expect(request.history).toEqual([]);
        return "Dime.";
      }),
    });
    expect(
      getConversation(home, "cli:default", new Date("2026-10-26T10:00:00Z"))
        .history,
    ).toBeUndefined();
  });

  it("serializes overlapping turns so the second sees the first answer", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = ask("Analiza mi plan de estudio", {
      model: model(async () => {
        await waiting;
        return "Estudia por bloques.";
      }),
    });
    const second = ask("Desarrolla ese consejo", {
      model: model((request) => {
        expect(request.history?.at(-1)?.content).toContain("bloques");
        return "Bloques de veinte minutos.";
      }),
    });
    release();
    await Promise.all([first, second]);
  });

  it("withholds private user turns and task tool data, never persists credentials", async () => {
    await ask("El código del portal es 4532", {
      model: model((request) => {
        expect(request.user).not.toContain("4532");
        return "Dato privado.";
      }),
    });
    await ask("Explícamelo", {
      model: model((request) => {
        expect(JSON.stringify(request.history)).not.toContain("4532");
        return "No tengo ese dato disponible.";
      }),
    });
    await ask("password: supersecret123", {
      model: model((request) => {
        expect(request.user).not.toContain("supersecret123");
        return "Usa un gestor de contraseñas.";
      }),
    });
    expect(
      fs.readFileSync(path.join(home, "conversations.json"), "utf8"),
    ).not.toContain("supersecret123");
  });

  it("clears copies of forgotten notes and explicit conversation history", async () => {
    const note = addMemory(home, { text: "Prefiero estudiar por la mañana" });
    await ask("Háblame de técnicas de estudio", {
      model: model(() => "Por la mañana puedes repasar."),
    });
    forgetMemory(home, note.id);
    expect(getConversation(home, "cli:default", now).history).toBeUndefined();
    await ask("Otro tema", { model: model(() => "Adelante.") });
    await ask("borra la conversación");
    expect(getConversation(home, "cli:default", now).history).toBeUndefined();
  });

  it("undoes task creation and reminder edits while refusing concurrent data changes", async () => {
    await ask("añade leche y pan a la compra");
    expect(listTasks(home)).toHaveLength(2);
    expect((await ask("deshaz eso")).text).toContain("deshecha");
    expect(listTasks(home)).toHaveLength(0);
    await ask("recuérdame llamar a mamá mañana a las 9");
    const original = listReminders(home)[0]!;
    await ask("cámbialo al viernes");
    await ask("deshaz eso");
    expect(listReminders(home)[0]!.due).toBe(original.due);
    await ask("cambia el recordatorio de mamá para mañana a las 12");
    snoozeReminder(home, original.id, "en 5 horas", { ...config(), now });
    expect((await ask("deshaz eso")).text).toContain("cambió");
  });

  it("does not claim success when a model exhausts its generation budget", async () => {
    const result = await ask("Organiza mis compromisos con detalle", {
      model: {
        kind: "anthropic",
        usesTools: true,
        answer: async () => ({ text: "", toolCalls: [], truncated: true }),
      },
    });
    expect(result.text).not.toBe("Hecho.");
    expect(result.text).toContain("No he podido terminar");
  });
  it("does not resurrect forgotten history when an older model request finishes", async () => {
    const note = addMemory(home, { text: "Me gusta pasear junto al río" });
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const turn = ask("Recomiéndame un paseo", {
      model: model(async () => {
        entered();
        await waiting;
        return "Pasea junto al río.";
      }),
    });
    await started;
    forgetMemory(home, note.id);
    release();
    await turn;
    expect(getConversation(home, "cli:default", now).history).toBeUndefined();
  });
});
