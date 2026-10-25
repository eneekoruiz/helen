import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { listMemory } from "../src/assistant/memory.js";
import { listReminders } from "../src/assistant/reminders.js";
import { listTasks, SHOPPING } from "../src/assistant/tasks.js";
import { listWorkflows } from "../src/assistant/workflows.js";
import { listGmailDrafts } from "../src/assistant/gmail.js";
import { listGmailWatches } from "../src/assistant/gmailWatch.js";

describe("15-minute intensive speech conversation session", () => {
  let home: string;
  let config: AssistantConfig;
  const START = new Date("2026-10-25T09:00:00.000Z");

  beforeEach(() => {
    process.env.HELEN_MAIL_TOKEN = "mock-valid-access-token";
    home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-speech-15m-"));
    config = writeConfig(
      {
        owner: "Eneko",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        gmail: {
          account: "eneko@example.com",
          accessTokenEnv: "HELEN_MAIL_TOKEN",
          contacts: { Ana: "ana@example.com" },
        },
      },
      home,
    );
  });

  afterEach(() => {
    delete process.env.HELEN_MAIL_TOKEN;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("completes a continuous 15-minute multi-turn spoken dialogue across 20 turns with state coherence", async () => {
    const sessionHistory: Array<{
      minute: string;
      utterance: string;
      replyText: string;
      speech: string;
      latencyMs: number;
    }> = [];

    const mockEnv = { HELEN_MAIL_TOKEN: "mock-valid-access-token" };
    const mockFetch = async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("/profile")) {
        return new Response(JSON.stringify({ emailAddress: "eneko@example.com" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (href.endsWith("/drafts/send")) {
        return new Response(JSON.stringify({ id: "msg-mock-1" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (href.endsWith("/drafts") || href.includes("/drafts")) {
        return new Response(JSON.stringify({ id: "draft-mock-1" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (href.includes("/messages/msg-mock-1") || href.includes("/messages/")) {
        return new Response(JSON.stringify({ id: "msg-mock-1", labelIds: ["SENT"] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
      });
    };

    const conversationId = "voice-session-1";
    let elapsedSeconds = 0;

    const speak = async (utterance: string, secondsAdvance: number) => {
      elapsedSeconds += secondsAdvance;
      const turnTime = new Date(START.getTime() + elapsedSeconds * 1000);
      const startMs = Date.now();
      const res = await handleMessage(utterance, {
        home,
        channel: "web",
        conversation: conversationId,
        config,
        now: turnTime,
        model: null,
        showSensitive: true,
        ownerVerified: true,
        env: mockEnv,
        fetcher: mockFetch as typeof fetch,
      });
      const latencyMs = Date.now() - startMs;
      const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
      const ss = String(elapsedSeconds % 60).padStart(2, "0");

      sessionHistory.push({
        minute: `${mm}:${ss}`,
        utterance,
        replyText: res.text,
        speech: res.speech ?? res.text,
        latencyMs,
      });

      return res;
    };

    // 00:30 - Turn 1: Saludo matinal y agenda
    const t1 = await speak("Buenos días", 30);
    expect(t1.text).toContain("Buenos días, Eneko.");
    expect(t1.speech).toBeDefined();

    // 01:15 - Turn 2: Captura rápida de compra
    const t2 = await speak("Añade a la lista de la compra café, leche y manzanas", 45);
    expect(t2.text).toMatch(/Añadido a la lista de la compra/i);
    const shoppingItems = listTasks(home).filter((t) => t.list === SHOPPING);
    expect(shoppingItems.length).toBe(3);

    // 02:00 - Turn 3: Consulta de la lista
    const t3 = await speak("¿Qué hay en la lista de la compra?", 45);
    expect(t3.text).toContain("café");
    expect(t3.text).toContain("leche");
    expect(t3.text).toContain("manzanas");

    // 02:45 - Turn 4: Guardar dato personal en memoria
    const t4 = await speak("Recuerda que la clave de la alarma de casa es 9182", 45);
    expect(t4.text).toMatch(/Guardado|Anotado|Apuntado|Hecho/i);
    const memories = listMemory(home);
    expect(memories.some((m) => (m.title + " " + m.body).includes("9182"))).toBe(true);

    // 03:30 - Turn 5: Consulta inmediata de memoria
    const t5 = await speak("¿Cuál es la clave de la alarma?", 45);
    expect(t5.text).toContain("9182");

    // 04:15 - Turn 6: Crear un recordatorio con hora hablada
    const t6 = await speak("Recuérdame a las cinco y media llamar al médico", 45);
    expect(t6.text).toMatch(/17:30/);
    expect(listReminders(home).length).toBe(1);

    // 05:00 - Turn 7: Modificar el recordatorio recién creado en caliente
    const t7 = await speak("Pásalo a las seis", 45);
    expect(t7.text).toMatch(/18:00/);

    // 05:45 - Turn 8: Planificación según capacidad y energía
    const t8 = await speak("Tengo 20 minutos y estoy agotado", 45);
    expect(t8.text).toBeDefined();

    // 06:30 - Turn 9: Preparación de gestión de vida
    const t9 = await speak("Prepara un viaje a Bilbao", 45);
    expect(t9.text).toContain("Propuesta de preparación");

    // 07:15 - Turn 10: Confirmación de guardar la gestión propuesta
    const t10 = await speak("Sí", 45);
    expect(t10.text).toMatch(/Gestión guardada/i);
    expect(listWorkflows(home).length).toBe(1);

    // 08:00 - Turn 11: Consultar siguiente paso de gestión por lenguaje natural (sin UUID)
    const t11 = await speak("Siguiente paso del viaje", 45);
    expect(t11.text).toContain("Confirmar fechas");

    // 08:45 - Turn 12: Completar siguiente paso por voz natural
    const t12 = await speak("Completa el siguiente paso del viaje", 45);
    expect(t12.text).toMatch(/Hecho: Confirmar fechas/i);
    expect(t12.text).toContain("Verificar documentación");

    // 09:30 - Turn 13: Redactar correo a un contacto conocido
    const t13 = await speak("Redacta un correo a Ana: Llegaré puntual a la reunión", 45);
    expect(t13.text).toContain("ana@example.com");
    expect(t13.text).toContain("Llegaré puntual a la reunión");
    const drafts = listGmailDrafts(home);
    expect(drafts.length).toBe(1);

    // 10:15 - Turn 14: Aprobación del envío
    const t14 = await speak("Sí", 45);
    expect(t14.text).toMatch(/comprobado en Enviados/i);

    // 11:00 - Turn 15: Activar seguimiento del correo
    const t15 = await speak("Avísame cuando Ana responda", 45);
    expect(t15.text).toMatch(/Seguimiento activado/i);
    expect(listGmailWatches(home).length).toBe(1);

    // 11:45 - Turn 16: Añadir tarea urgente
    const t16 = await speak("Añade una tarea urgente: Enviar presupuesto hoy a las siete", 45);
    expect(t16.text).toMatch(/Añadido a tus tareas/i);

    // 12:30 - Turn 17: Consultar lo más urgente
    const t17 = await speak("¿Qué es lo más urgente?", 45);
    expect(t17.text).toContain("Enviar presupuesto");

    // 13:15 - Turn 18: Cancelar recordatorio anterior
    const t18 = await speak("Cancela el recordatorio", 45);
    expect(t18.text).toMatch(/Cancelado/i);

    // 14:00 - Turn 19: Agradecimiento y cortesía
    const t19 = await speak("Muchas gracias", 45);
    expect(t19.text).toMatch(/De nada/i);

    // 15:00 - Turn 20: Cierre de la sesión de voz
    const t20 = await speak("Hasta luego", 60);
    expect(t20.text).toMatch(/Hasta luego/i);

    // Verificaciones globales de la sesión de 15 minutos:
    expect(elapsedSeconds).toBe(900); // Exactamente 900 segundos (15 minutos)
    expect(sessionHistory.length).toBe(20);

    // Comprobar que todas las respuestas fueron inmediatas (baja latencia sin cuelgues)
    for (const turn of sessionHistory) {
      expect(turn.latencyMs).toBeLessThan(1000); // Sub-segundo
      expect(turn.replyText.length).toBeGreaterThan(0);
      expect(turn.speech.length).toBeGreaterThan(0);
    }
  });
});
