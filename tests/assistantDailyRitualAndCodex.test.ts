import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "../src/assistant/brain.js";
import { formatCapabilities } from "../src/assistant/capabilities.js";
import { summarizeCodexWork } from "../src/assistant/codexBridge.js";
import { runDailyKickoff, runDailyShutdown } from "../src/assistant/dailyRitual.js";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import { addReminder } from "../src/assistant/reminders.js";
import { addTasks } from "../src/assistant/tasks.js";

let home: string;
let config: AssistantConfig;
const baseNow = new Date("2026-10-25T14:00:00.000Z");

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-ritual-test-"));
  config = writeConfig(
    {
      owner: "Eneko",
      locale: "es-ES",
      timezone: "Europe/Madrid",
      channels: {},
    },
    home,
  );
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

describe("Daily Rituals (Shutdown & Kickoff)", () => {
  it("runs daily shutdown auditing completed tasks, neglected lists and tomorrow focus", () => {
    // 1. Tarea completada hoy
    addTasks(home, {
      text: "Comprar pan",
      list: "compra",
      source: "cli",
      lang: "es",
      now: baseNow,
    });
    // Marcar como hecha hoy
    const all = JSON.parse(
      fs.readFileSync(path.join(home, "tasks.json"), "utf8"),
    );
    all.items[0].status = "done";
    all.items[0].done = baseNow.toISOString();
    fs.writeFileSync(path.join(home, "tasks.json"), JSON.stringify(all));

    // 2. Tarea de limpieza desatendida (creada hace 25 días)
    const oldCreated = new Date(baseNow.getTime() - 25 * 86_400_000);
    addTasks(home, {
      text: "Descongelar y limpiar el frigorífico a fondo",
      list: "limpieza",
      source: "cli",
      lang: "es",
      now: oldCreated,
    });

    // 3. Tarea para mañana
    const tomorrowDue = new Date(baseNow.getTime() + 86_400_000);
    addTasks(home, {
      text: "Revisar declaración IRPF",
      list: "inbox",
      due: tomorrowDue,
      priority: "high",
      source: "cli",
      lang: "es",
      now: baseNow,
    });

    const shutdown = runDailyShutdown(home, {
      now: baseNow,
      timezone: config.timezone,
      locale: config.locale,
      lang: "es",
    });

    expect(shutdown.completedToday).toHaveLength(1);
    expect(shutdown.text).toContain("Completadas hoy (1)");
    expect(shutdown.text).toContain("limpieza");
    expect(shutdown.top3Tomorrow.length).toBeGreaterThan(0);
    expect(shutdown.speech).toContain("Buen trabajo, hoy completaste 1 tareas.");
    expect(shutdown.buttons).toBeDefined();
  });

  it("runs daily kickoff with top priorities", () => {
    addTasks(home, {
      text: "Completar informe trimestral",
      list: "inbox",
      priority: "high",
      source: "cli",
      lang: "es",
      now: baseNow,
    });

    const kickoff = runDailyKickoff(home, {
      now: baseNow,
      timezone: config.timezone,
      locale: config.locale,
      lang: "es",
    });

    expect(kickoff.top3Tomorrow).toHaveLength(1);
    expect(kickoff.text).toContain("Top prioridades para hoy");
    expect(kickoff.speech).toContain("Tu prioridad número uno hoy es Completar informe trimestral");
  });
});

describe("Capabilities & Help Breakdown", () => {
  it("formats specific capabilities for Antigravity with what it can and cannot do", () => {
    const caps = formatCapabilities({ topic: "antigravity", lang: "es" });
    expect(caps.text).toContain("Antigravity & Codex");
    expect(caps.text).toContain("Qué PUEDE hacer");
    expect(caps.text).toContain("Qué NO puede hacer");
    expect(caps.text).toContain("No ejecuta comandos destructivos");
  });

  it("formats safety boundaries and limits", () => {
    const limits = formatCapabilities({ topic: "limits", lang: "es" });
    expect(limits.text).toContain("Fronteras y Límites de Seguridad");
    expect(limits.text).toContain("NUNCA");
  });

  it("responds to conversational help query via brain handleMessage", async () => {
    const reply = await handleMessage("¿qué puedes hacer con codex?", {
      home,
      channel: "cli",
      config,
      now: baseNow,
      model: null,
    });
    expect(reply.intent).toBe("help");
    expect(reply.text).toContain("Antigravity & Codex");
    expect(reply.text).toContain("Qué PUEDE hacer");
  });
});

describe("Free Slot Recommendation & Codex Bridge", () => {
  it("recommends the most urgent task for a free slot", async () => {
    addTasks(home, {
      text: "Lavar cortinas",
      list: "limpieza",
      priority: "high",
      source: "cli",
      lang: "es",
      now: baseNow,
    });

    const reply = await handleMessage("¿qué puedo hacer en este hueco?", {
      home,
      channel: "cli",
      config,
      now: baseNow,
      model: null,
    });

    expect(reply.intent).toBe("task.next_free");
    expect(reply.text).toContain("Lavar cortinas");
    expect(reply.buttons).toBeDefined();
  });

  it("gracefully summarizes Codex work when directory is empty or populated", () => {
    const tmpBrain = fs.mkdtempSync(path.join(os.tmpdir(), "codex-test-"));
    try {
      const summaryEmpty = summarizeCodexWork({ brainDir: tmpBrain, lang: "es" });
      expect(summaryEmpty.text).toContain("No se han encontrado sesiones");

      // Crear sesión simulada
      const sessDir = path.join(tmpBrain, "test-session-1", ".system_generated", "logs");
      fs.mkdirSync(sessDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessDir, "transcript.jsonl"),
        JSON.stringify({
          source: "USER_INPUT",
          type: "USER_INPUT",
          content: "<USER_REQUEST>Crear tests de arquitectura limpia</USER_REQUEST>",
          created_at: baseNow.toISOString(),
        }) + "\n",
      );

      const summary = summarizeCodexWork({ brainDir: tmpBrain, lang: "es", now: baseNow });
      expect(summary.text).toContain("Crear tests de arquitectura limpia");
      expect(summary.speech).toContain("Crear tests de arquitectura limpia");
    } finally {
      fs.rmSync(tmpBrain, { recursive: true, force: true });
    }
  });

  it("cleans vocal disfluencies (ehh, mmm, o sea) during spoken input", async () => {
    const { cleanUtterance, understand } = await import("../src/assistant/intents.js");
    const cleaned = cleanUtterance("Oye Helen, ehh mmm ¿qué es lo más urgente?");
    expect(cleaned).toBe("qué es lo más urgente");

    const understood = understand("Helen ehh recuérdame mañana a las 9 llamar al médico");
    expect(understood.intent.name).toBe("remind");
  });

  it("delivers automated daily shutdown when shutdownTime is reached", async () => {
    const { tick } = await import("../src/assistant/scheduler.js");
    config.briefing = { shutdownTime: "21:00" };
    writeConfig(config, home);

    const eveningNow = new Date("2026-10-25T21:15:00.000Z");
    const sentNotifications: any[] = [];
    const testChannel = {
      name: "test-channel",
      local: true,
      send: async (notif: any) => {
        sentNotifications.push(notif);
      },
    };

    await tick(home, {
      now: eveningNow,
      config,
      channels: [testChannel],
    });

    expect(sentNotifications.some((n) => n.title.includes("Cierre del Día"))).toBe(true);
  });
});
