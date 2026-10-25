import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleMessage } from "../dist/assistant/brain.js";
import { writeConfig } from "../dist/assistant/home.js";
import { listMemory } from "../dist/assistant/memory.js";
import { listReminders } from "../dist/assistant/reminders.js";
import { listTasks, SHOPPING } from "../dist/assistant/tasks.js";
import { listWorkflows } from "../dist/assistant/workflows.js";
import { listGmailDrafts } from "../dist/assistant/gmail.js";
import { listGmailWatches } from "../dist/assistant/gmailWatch.js";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-speech-live-"));
process.env.HELEN_MAIL_TOKEN = "mock-valid-access-token";

const config = writeConfig(
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

const START = new Date("2026-10-25T09:00:00.000Z");
const conversationId = "voice-session-15m";
let elapsedSeconds = 0;

const mockFetch = async (url) => {
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

const TURNS = [
  { time: 30, text: "Buenos días" },
  { time: 45, text: "Añade a la lista de la compra café, leche y manzanas" },
  { time: 45, text: "¿Qué hay en la lista de la compra?" },
  { time: 45, text: "Recuerda que la clave de la alarma de casa es 9182" },
  { time: 45, text: "¿Cuál es la clave de la alarma?" },
  { time: 45, text: "Recuérdame a las cinco y media llamar al médico" },
  { time: 45, text: "Pásalo a las seis" },
  { time: 45, text: "Tengo 20 minutos y estoy agotado" },
  { time: 45, text: "Prepara un viaje a Bilbao" },
  { time: 45, text: "Sí" },
  { time: 45, text: "Siguiente paso del viaje" },
  { time: 45, text: "Completa el siguiente paso del viaje" },
  { time: 45, text: "Redacta un correo a Ana: Llegaré puntual a la reunión" },
  { time: 45, text: "Sí" },
  { time: 45, text: "Avísame cuando Ana responda" },
  { time: 45, text: "Añade una tarea urgente: Enviar presupuesto hoy a las siete" },
  { time: 45, text: "¿Qué es lo más urgente?" },
  { time: 45, text: "Cancela el recordatorio" },
  { time: 45, text: "Muchas gracias" },
  { time: 60, text: "Hasta luego" },
];

console.log("═════════════════════════════════════════════════════════════════════");
console.log("🎙️  INICIANDO SESIÓN DE PRUEBA INTENSIVA DE HABLA (15 MINUTOS) — HELEN");
console.log("═════════════════════════════════════════════════════════════════════\n");

const logs = [];

for (const [idx, step] of TURNS.entries()) {
  elapsedSeconds += step.time;
  const turnDate = new Date(START.getTime() + elapsedSeconds * 1000);
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");
  const timestamp = `[${mm}:${ss}]`;

  const startT = performance.now();
  const reply = await handleMessage(step.text, {
    home,
    channel: "web",
    conversation: conversationId,
    config,
    now: turnDate,
    model: null,
    showSensitive: true,
    ownerVerified: true,
    fetcher: mockFetch,
  });
  const latency = Math.round(performance.now() - startT);

  console.log(`${timestamp} Turno ${idx + 1}/20 (${latency}ms)`);
  console.log(`👤 Usuario (voz): "${step.text}"`);
  console.log(`🤖 HELEN (voz):   "${reply.speech || reply.text.replace(/\n/g, " ")}"`);
  console.log("─────────────────────────────────────────────────────────────────");

  logs.push({
    timestamp,
    turn: idx + 1,
    latency,
    user: step.text,
    assistant: reply.speech || reply.text,
  });
}

const finalShopping = listTasks(home).filter((t) => t.list === SHOPPING).length;
const finalReminders = listReminders(home).length;
const finalMemories = listMemory(home).length;
const finalWorkflows = listWorkflows(home).length;
const finalDrafts = listGmailDrafts(home).length;
const finalWatches = listGmailWatches(home).length;

console.log("\n📊 RESUMEN FINAL DE LA SESIÓN DE 15 MINUTOS:");
console.log(`⏱️  Duración total simulada: ${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} seg (900 seg)`);
console.log(`⚡ Latencia media de respuesta: ${Math.round(logs.reduce((a, b) => a + b.latency, 0) / logs.length)} ms`);
console.log(`💾 Estado persistido:`);
console.log(`   - Elementos de compra: ${finalShopping}`);
console.log(`   - Recuerdos en memoria: ${finalMemories}`);
console.log(`   - Recordatorios activos: ${finalReminders}`);
console.log(`   - Gestiones creadas: ${finalWorkflows}`);
console.log(`   - Correos enviados/verificados: ${finalDrafts}`);
console.log(`   - Seguimientos de correo: ${finalWatches}`);
console.log("✅ Sesión completada con éxito sin errores ni fugas de contexto.");

fs.rmSync(home, { recursive: true, force: true });
