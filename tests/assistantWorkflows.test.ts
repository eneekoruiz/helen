import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeConfig } from "../src/assistant/home.js";
import { addTasks } from "../src/assistant/tasks.js";
import { addReminder } from "../src/assistant/reminders.js";
import {
  capacityPlan,
  createWorkflow,
  listWorkflows,
  updateWorkflowItem,
  workflowProgress,
  workflowTemplate,
} from "../src/assistant/workflows.js";

const NOW = new Date("2026-10-24T08:00:00Z");
const PLAN = {
  from: NOW.toISOString(),
  to: "2026-10-24T10:00:00Z",
  availableMinutes: 30,
  timezone: "Europe/Madrid",
  energy: "low",
};
let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-workflows-"));
  writeConfig(
    { owner: "Test", timezone: "Europe/Madrid", locale: "es-ES" },
    home,
  );
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

describe("personal workflows", () => {
  it("enforces hidden-item permissions inside the atomic status update", () => {
    const workflow = createWorkflow(
      home,
      { title: "Privado", sensitive: true, items: [{ text: "Paso" }] },
      NOW,
    );
    const change = {
      workflowId: workflow.id,
      itemId: workflow.items[0]!.id,
      status: "done",
    };
    expect(() => updateWorkflowItem(home, change, NOW)).toThrow(/Accessible/);
    expect(
      listWorkflows(home, { showSensitive: true })[0]!.items[0]!.status,
    ).toBe("todo");
    expect(
      updateWorkflowItem(home, change, NOW, { showSensitive: true }).items[0]!
        .status,
    ).toBe("done");
  });

  it("preserves damaged records during mutations and refuses an unverifiable free-time plan", () => {
    const invalid = {
      id: "damaged",
      scheduledStart: "2026-10-24T08:00:00Z",
      scheduledEnd: "2026-10-24T10:00:00Z",
      extra: "retain this",
    };
    fs.writeFileSync(
      path.join(home, "workflows.json"),
      JSON.stringify({ version: 1, items: [invalid] }),
    );
    createWorkflow(home, { title: "Valid", items: [{ text: "Task" }] }, NOW);
    expect(
      JSON.parse(fs.readFileSync(path.join(home, "workflows.json"), "utf8"))
        .items,
    ).toContainEqual(invalid);
    expect(() => capacityPlan(home, PLAN, NOW)).toThrow(
      /occupied times cannot be verified/,
    );
  });
  it("persists user-supplied requirements, documents, questions and actions without fabricating steps", () => {
    const created = createWorkflow(
      home,
      {
        title: "Preparar cita",
        kind: "appointment",
        requestId: "capture-1",
        items: [
          {
            text: "Preguntar al centro qué documentos necesito",
            kind: "question",
          },
          { text: "Llevar la confirmación que recibí", kind: "document" },
        ],
      },
      NOW,
    );
    expect(listWorkflows(home)[0]).toEqual(created);
    expect(created.items).toHaveLength(2);
    expect(created.items.every((item) => item.status === "todo")).toBe(true);
    expect(workflowTemplate("procedure").authoritative).toBe(false);
  });

  it("replays an identical request once and rejects changed payloads under the same key", () => {
    const input = {
      title: "Preparar viaje",
      requestId: "request_1",
      items: [{ text: "Mirar trenes" }],
    };
    expect(createWorkflow(home, input, NOW).id).toBe(
      createWorkflow(home, input, NOW).id,
    );
    expect(() =>
      createWorkflow(home, { ...input, title: "Otro" }, NOW),
    ).toThrow(/requestId/);
    expect(listWorkflows(home)).toHaveLength(1);
  });

  it("requires a waiting reason, reviews overdue waiting items and only completes explicitly", () => {
    const created = createWorkflow(
      home,
      {
        title: "Gestión",
        items: [{ text: "Esperar respuesta" }, { text: "Enviar documentos" }],
      },
      NOW,
    );
    const ref = { workflowId: created.id, itemId: created.items[0]!.id };
    expect(() =>
      updateWorkflowItem(home, { ...ref, status: "waiting" }, NOW),
    ).toThrow();
    const waiting = updateWorkflowItem(
      home,
      {
        ...ref,
        status: "waiting",
        waitingReason: "El centro debe contestar",
        reviewAfter: "2026-10-24T07:00:00Z",
      },
      NOW,
    );
    expect(workflowProgress(waiting, NOW)).toMatchObject({
      done: 0,
      total: 2,
      next: { text: "Enviar documentos" },
      waitingForReview: [{ status: "waiting" }],
    });
    expect(listWorkflows(home)[0]!.items[0]!.status).toBe("waiting");
    const finished = updateWorkflowItem(home, { ...ref, status: "done" }, NOW);
    expect(workflowProgress(finished, NOW).done).toBe(1);
    expect(finished.items[0]!.waitingReason).toBeUndefined();
    expect(finished.items[0]!.reviewAfter).toBeUndefined();
  });

  it("rejects mixed non-waiting details and nonexistent items without changing data", () => {
    const created = createWorkflow(
      home,
      { title: "Gestión", items: [{ text: "Llamar" }] },
      NOW,
    );
    expect(() =>
      updateWorkflowItem(
        home,
        {
          workflowId: created.id,
          itemId: created.items[0]!.id,
          status: "done",
          waitingReason: "No",
        },
        NOW,
      ),
    ).toThrow();
    expect(() =>
      updateWorkflowItem(
        home,
        {
          workflowId: created.id,
          itemId: "00000000-0000-4000-8000-000000000000",
          status: "done",
        },
        NOW,
      ),
    ).toThrow(/not found/);
    expect(listWorkflows(home)[0]).toEqual(created);
  });

  it("hides marked sensitive workflows and items by default, including waiting reasons", () => {
    createWorkflow(
      home,
      { title: "Privado", sensitive: true, items: [{ text: "Llamar" }] },
      NOW,
    );
    createWorkflow(
      home,
      {
        title: "Público",
        items: [{ text: "Privado", sensitive: true }, { text: "Ordenar mesa" }],
      },
      NOW,
    );
    expect(listWorkflows(home)).toHaveLength(1);
    expect(listWorkflows(home)[0]!.items.map((item) => item.text)).toEqual([
      "Ordenar mesa",
    ]);
    expect(listWorkflows(home, { showSensitive: true })).toHaveLength(2);
    expect(
      capacityPlan(home, PLAN, NOW).suggestions.map((item) => item.text),
    ).toEqual(["Ordenar mesa"]);
  });

  it("validates all inputs before writing and rejects stored credentials", () => {
    expect(() =>
      createWorkflow(
        home,
        { title: "Bad", items: [{ text: "Task", minutes: -1 }] },
        NOW,
      ),
    ).toThrow();
    expect(() =>
      createWorkflow(
        home,
        {
          title: "Bad",
          items: [
            {
              text: "Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345678901234567890",
            },
          ],
        },
        NOW,
      ),
    ).toThrow();
    expect(() =>
      createWorkflow(
        home,
        {
          title: "Bad",
          items: [{ text: "Task" }],
          scheduledStart: "2026-10-24T10:00:00Z",
        },
        NOW,
      ),
    ).toThrow();
    expect(listWorkflows(home)).toEqual([]);
  });
});

describe("capacity planning", () => {
  it("fits low-energy work into actual free slots within the user budget and travel buffers", () => {
    createWorkflow(
      home,
      {
        title: "Consulta",
        kind: "appointment",
        scheduledStart: "2026-10-24T08:30:00Z",
        scheduledEnd: "2026-10-24T09:00:00Z",
        items: [
          { text: "Intenso", minutes: 60, energy: "high", priority: "high" },
        ],
      },
      NOW,
    );
    createWorkflow(
      home,
      {
        title: "Casa",
        items: [
          { text: "Pequeño", minutes: 20, priority: "high" },
          { text: "Segundo", minutes: 15 },
          { text: "Otro intenso", minutes: 10, energy: "high" },
        ],
      },
      NOW,
    );
    const plan = capacityPlan(
      home,
      { ...PLAN, travelMinutes: 10, bufferMinutes: 5 },
      NOW,
    );
    expect(plan.plannedMinutes).toBeLessThanOrEqual(30);
    expect(plan.suggestions).toHaveLength(1);
    expect(plan.suggestions[0]).toMatchObject({
      text: "Pequeño",
      from: "2026-10-24T09:15:00.000Z",
      minutes: 20,
    });
    expect(plan.freeSlots).toEqual([
      { from: NOW.toISOString(), to: "2026-10-24T08:15:00.000Z" },
      { from: "2026-10-24T09:15:00.000Z", to: "2026-10-24T10:00:00.000Z" },
    ]);
  });

  it("merges overlapping busy intervals, clips to now and does not overbook fragmented time", () => {
    createWorkflow(
      home,
      { title: "Casa", items: [{ text: "Veinte", minutes: 20 }] },
      NOW,
    );
    const plan = capacityPlan(
      home,
      {
        ...PLAN,
        from: "2026-10-24T07:00:00Z",
        busy: [
          { from: "2026-10-24T08:10:00Z", to: "2026-10-24T09:00:00Z" },
          { from: "2026-10-24T08:50:00Z", to: "2026-10-24T09:50:00Z" },
        ],
      },
      NOW,
    );
    expect(plan.freeSlots).toHaveLength(2);
    expect(plan.suggestions).toEqual([]);
    expect(plan.plannedMinutes).toBe(0);
  });

  it("respects priorities and deadlines while excluding waiting and completed work", () => {
    const created = createWorkflow(
      home,
      {
        title: "Tareas",
        items: [
          { text: "Normal", minutes: 10 },
          { text: "Urgente", minutes: 10, priority: "high" },
          { text: "Mañana", minutes: 10, due: "2026-10-25T09:00:00Z" },
          { text: "Hoy", minutes: 10, due: "2026-10-24T09:00:00Z" },
          { text: "Esperando", minutes: 10, priority: "high" },
          { text: "Completado", minutes: 10, priority: "high" },
        ],
      },
      NOW,
    );
    updateWorkflowItem(
      home,
      {
        workflowId: created.id,
        itemId: created.items[4]!.id,
        status: "waiting",
        waitingReason: "Respuesta",
      },
      NOW,
    );
    updateWorkflowItem(
      home,
      { workflowId: created.id, itemId: created.items[5]!.id, status: "done" },
      NOW,
    );
    const plan = capacityPlan(home, PLAN, NOW);
    expect(plan.suggestions.map((item) => item.text)).toEqual([
      "Urgente",
      "Hoy",
      "Mañana",
    ]);
    expect(plan.plannedMinutes).toBe(30);
    expect(
      listWorkflows(home)[0]!.items.filter((item) => item.status === "done"),
    ).toHaveLength(1);
  });

  it("treats reminder firing as one minute and task deadlines as deadlines rather than bookings", () => {
    addTasks(home, {
      text: "Entregar trabajo",
      due: new Date("2026-10-24T08:05:00Z"),
      now: NOW,
    });
    addTasks(home, { text: "Leche", list: "compra", now: NOW });
    addReminder(
      home,
      { text: "Llamar", when: "en 10 minutos" },
      {
        timezone: "Europe/Madrid",
        now: NOW,
        locale: "es-ES",
        defaultTime: "09:00",
      },
    );
    const plan = capacityPlan(home, PLAN, NOW);
    expect(plan.suggestions).toHaveLength(1);
    expect(plan.suggestions[0]).toMatchObject({
      text: "Entregar trabajo",
      estimated: true,
      from: "2026-10-24T08:11:00.000Z",
      minutes: 15,
    });
    expect(plan.assumptions.join(" ")).toContain(
      "deadlines do not reserve time",
    );
  });

  it("keeps sensitive appointments busy without exposing their content", () => {
    createWorkflow(
      home,
      {
        title: "Privado",
        sensitive: true,
        scheduledStart: "2026-10-24T08:00:00Z",
        scheduledEnd: "2026-10-24T10:00:00Z",
        items: [{ text: "Secreto" }],
      },
      NOW,
    );
    expect(capacityPlan(home, PLAN, NOW)).toMatchObject({
      suggestions: [],
      freeSlots: [],
      plannedMinutes: 0,
    });
    expect(JSON.stringify(capacityPlan(home, PLAN, NOW))).not.toContain(
      "Privado",
    );
  });

  it("rejects impossible windows, energy, budget and timezone", () => {
    for (const invalid of [
      { to: "2026-10-24T07:00:00Z" },
      { to: "2026-10-26T08:00:00Z" },
      { availableMinutes: -1 },
      { energy: "unlimited" },
      { timezone: "Bad/Zone" },
    ])
      expect(() => capacityPlan(home, { ...PLAN, ...invalid }, NOW)).toThrow();
  });
});
