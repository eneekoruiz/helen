import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { createCapture } from "../src/assistant/capture.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { addTasks, completeTask, listTasks } from "../src/assistant/tasks.js";

describe("advanced task urgency, starvation weighting and conversational capture control", () => {
  let home: string;
  let config: AssistantConfig;
  const NOW = new Date("2026-10-25T10:00:00.000Z");

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-urgency-"));
    config = writeConfig(
      {
        owner: "Eneko",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
      home,
    );
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  const ask = (text: string, conversation = "test-conv") =>
    handleMessage(text, {
      home,
      channel: "web",
      conversation,
      config,
      now: NOW,
      model: null,
      showSensitive: true,
      ownerVerified: true,
    });

  it("prioritizes neglected sections (limpieza vs cuidado) and older pending tasks", async () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 86_400_000);
    const tenDaysAgo = new Date(NOW.getTime() - 10 * 86_400_000);
    const fiveDaysAgo = new Date(NOW.getTime() - 5 * 86_400_000);
    const tomorrow = new Date(NOW.getTime() + 24 * 3600_000);

    // En 'cuidado' se hizo una tarea hace 5 días
    const oldCuidado = addTasks(home, {
      text: "Lavar toallas de baño",
      list: "cuidado",
      now: tenDaysAgo,
    }).added[0]!;
    completeTask(home, oldCuidado.id, fiveDaysAgo);

    // Tarea nueva en 'cuidado'
    addTasks(home, {
      text: "Comprar crema hidratante",
      list: "cuidado",
      due: tomorrow,
      now: NOW,
    });

    // En 'limpieza' no se ha hecho nada y lleva 30 días acumulada sin hacer
    addTasks(home, {
      text: "Limpiar a fondo los filtros de aire",
      list: "limpieza",
      due: tomorrow,
      now: thirtyDaysAgo,
    });

    const reply = await ask("¿Qué es lo más urgente?");
    expect(reply.text).toContain("[limpieza] Limpiar a fondo los filtros de aire");
    expect(reply.speech).toContain("Limpiar a fondo los filtros de aire");
  });

  it("breaks ties between upcoming tasks by prioritizing the one waiting longest", async () => {
    const twentyDaysAgo = new Date(NOW.getTime() - 20 * 86_400_000);
    const yesterday = new Date(NOW.getTime() - 1 * 86_400_000);
    const nextWeek = new Date(NOW.getTime() + 5 * 86_400_000);

    addTasks(home, {
      text: "Renovar seguro del coche",
      list: "gestiones",
      due: nextWeek,
      now: twentyDaysAgo,
    });
    addTasks(home, {
      text: "Comprobar bombillas de repuesto",
      list: "gestiones",
      due: nextWeek,
      now: yesterday,
    });

    const reply = await ask("¿Qué es lo más urgente?");
    // La que lleva 20 días sin hacerse debe figurar primero
    const lines = reply.text.split("\n");
    const seguroLine = lines.findIndex((l) => l.includes("Renovar seguro"));
    const bombillasLine = lines.findIndex((l) => l.includes("Comprobar bombillas"));
    expect(seguroLine).toBeGreaterThan(0);
    expect(bombillasLine).toBeGreaterThan(seguroLine);
  });

  it("handles 'no, espera, vamos a volver a empezar' by resetting pending conversation state", async () => {
    // 1. Iniciar captura o borrador
    await ask("Captura: 1. Comprar pan a las cinco\n2. Llamar al médico");
    // 2. Interrumpir con reset natural
    const resetReply = await ask("No, espera, vamos a volver a empezar");
    expect(resetReply.text).toMatch(/volvemos a empezar/i);
    expect(resetReply.intent).toBe("stop");

    // 3. Confirmar que no hay estado pendiente que bloquee la siguiente acción
    const nextReply = await ask("¿Qué hora es?");
    expect(nextReply.text).toMatch(/\d{1,2}:\d{2}/);
  });

  it("allows conversational item editing in a pending capture draft ('el tercer recordatorio ponlo a las 5')", async () => {
    const captureText = [
      "1. Comprar café",
      "2. Revisar presión de neumáticos",
      "3. Llamar al dentista",
    ].join("\n");

    const draft = await ask(`Captura:\n${captureText}`);
    expect(draft.text).toContain("Llamar al dentista");

    // Editar específicamente el tercer elemento por lenguaje natural
    const editReply = await ask("el tercer recordatorio ponlo a las 5");
    expect(editReply.text).toMatch(/Actualizado el elemento 3: «Llamar al dentista»/);
    expect(editReply.text).toContain("17:00");

    // Aprobar el borrador tras la edición conversacional
    const confirmReply = await ask("Sí");
    expect(confirmReply.text).toMatch(/Guardadas 3 tareas revisadas/);

    const tasks = listTasks(home);
    expect(tasks).toHaveLength(3);
    const dentista = tasks.find((t) => t.text.includes("dentista"))!;
    expect(dentista.due).toBeDefined();
    expect(new Date(dentista.due!).getUTCHours()).toBe(16); // 17:00 Madrid (UTC+1) = 16:00 UTC
  });

  it("supports large captures of up to 60 candidate items in a single request", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => `Tarea número ${i + 1} para revisar`);
    const draft = await createCapture(
      home,
      { owner: "user-60", text: lines.join("\n") },
      {
        now: NOW,
        timezone: "Europe/Madrid",
        locale: "es-ES",
        defaultTime: "09:00",
      },
    );
    expect(draft.items).toHaveLength(60);
    expect(draft.items[59]!.text).toBe("Tarea número 60 para revisar");
  });
});
