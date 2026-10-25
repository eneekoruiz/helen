import crypto from "node:crypto";
import { z } from "zod";
import { findSecrets, looksSensitive } from "../core/secrets.js";
import { occurrencesBetween } from "./reminders.js";
import { readCollection, updateCollection } from "./store.js";
import { listTasks, SHOPPING } from "./tasks.js";
import { isValidTimeZone } from "./time.js";

const text = z.string().trim().min(1).max(500);
const instant = z.string().datetime();
export const WorkflowItemInputSchema = z
  .object({
    text,
    kind: z
      .enum(["action", "requirement", "document", "question"])
      .default("action"),
    minutes: z.number().int().min(1).max(480).default(15),
    energy: z.enum(["low", "medium", "high"]).default("low"),
    priority: z.enum(["high", "normal", "low"]).default("normal"),
    due: instant.optional(),
    sensitive: z.boolean().default(false),
  })
  .strict();
export const WorkflowItemSchema = WorkflowItemInputSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["todo", "doing", "waiting", "done"]),
  waitingReason: text.optional(),
  reviewAfter: instant.optional(),
}).refine(
  (item) => item.status !== "waiting" || Boolean(item.waitingReason),
  "Waiting needs a reason",
);
export const WorkflowInputSchema = z
  .object({
    title: text,
    kind: z
      .enum(["procedure", "trip", "appointment", "project"])
      .default("project"),
    sensitive: z.boolean().default(false),
    items: z.array(WorkflowItemInputSchema).min(1).max(50),
    scheduledStart: instant.optional(),
    scheduledEnd: instant.optional(),
    requestId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      Boolean(input.scheduledStart) === Boolean(input.scheduledEnd) &&
      (!input.scheduledStart ||
        Date.parse(input.scheduledEnd!) > Date.parse(input.scheduledStart)),
    "A scheduled commitment needs an ordered start and end",
  );
export const WorkflowSchema = z
  .object({
    id: z.string().uuid(),
    title: text,
    kind: z.enum(["procedure", "trip", "appointment", "project"]),
    sensitive: z.boolean(),
    items: z.array(WorkflowItemSchema).min(1).max(50),
    scheduledStart: instant.optional(),
    scheduledEnd: instant.optional(),
    requestId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
    created: instant,
    updated: instant,
  })
  .refine(
    (value) =>
      Boolean(value.scheduledStart) === Boolean(value.scheduledEnd) &&
      (!value.scheduledStart ||
        Date.parse(value.scheduledEnd!) > Date.parse(value.scheduledStart)),
    "A scheduled commitment needs an ordered start and end",
  );
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowItem = z.infer<typeof WorkflowItemSchema>;
const NAME = "workflows";

function privateItem(workflow: Workflow, item: WorkflowItem): boolean {
  return (
    workflow.sensitive ||
    item.sensitive ||
    looksSensitive(workflow.title) ||
    looksSensitive(item.text) ||
    looksSensitive(item.waitingReason ?? "")
  );
}

/** Templates are preparation prompts, never a list of official requirements. */
export function workflowTemplate(
  kind: Workflow["kind"],
  lang: "es" | "en" = "es",
): { authoritative: false; items: string[] } {
  const es = lang === "es";
  const items =
    kind === "trip"
      ? es
        ? [
            "Confirmar fechas y presupuesto",
            "Verificar documentación con la fuente oficial",
            "Preparar transporte y alojamiento",
            "Revisar equipaje y contactos",
          ]
        : [
            "Confirm dates and budget",
            "Check documents with the official source",
            "Prepare transport and accommodation",
            "Review luggage and contacts",
          ]
      : kind === "appointment"
        ? es
          ? [
              "Confirmar lugar, hora y desplazamiento",
              "Preguntar qué documentos llevar",
              "Preparar preguntas",
              "Anotar el siguiente paso después de la cita",
            ]
          : [
              "Confirm place, time and travel",
              "Ask which documents to bring",
              "Prepare questions",
              "Record the next step after the appointment",
            ]
        : es
          ? [
              "Definir el resultado buscado",
              "Verificar requisitos con la fuente responsable",
              "Reunir documentos confirmados",
              "Preparar preguntas y siguiente paso",
            ]
          : [
              "Define the desired result",
              "Check requirements with the responsible source",
              "Gather confirmed documents",
              "Prepare questions and the next step",
            ];
  return { authoritative: false, items };
}

export function createWorkflow(
  home: string,
  raw: unknown,
  now = new Date(),
): Workflow {
  const input = WorkflowInputSchema.parse(raw);
  if (findSecrets(JSON.stringify(input)).length)
    throw new Error("Do not store credentials in workflows.");
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  return updateCollection(home, NAME, WorkflowSchema, (items) => {
    const existing =
      input.requestId &&
      items.find((item) => item.requestId === input.requestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error(
          "requestId was already used for different workflow data.",
        );
      return existing;
    }
    if (items.length >= 200) throw new Error("Workflow limit reached (200).");
    const workflow: Workflow = {
      ...input,
      id: crypto.randomUUID(),
      fingerprint,
      items: input.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        status: "todo",
      })),
      created: now.toISOString(),
      updated: now.toISOString(),
    };
    items.push(workflow);
    return workflow;
  });
}

export function listWorkflows(
  home: string,
  options: { showSensitive?: boolean } = {},
): Workflow[] {
  return readCollection(home, NAME, WorkflowSchema)
    .items.filter(
      (workflow) =>
        options.showSensitive ||
        !(workflow.sensitive || looksSensitive(workflow.title)),
    )
    .map((workflow) => ({
      ...workflow,
      items: workflow.items.filter(
        (item) => options.showSensitive || !privateItem(workflow, item),
      ),
    }));
}

export function updateWorkflowItem(
  home: string,
  raw: unknown,
  now = new Date(),
  options: { showSensitive?: boolean } = {},
): Workflow {
  const input = z
    .object({
      workflowId: z.string().uuid(),
      itemId: z.string().uuid(),
      status: z.enum(["todo", "doing", "waiting", "done"]),
      waitingReason: text.optional(),
      reviewAfter: instant.optional(),
    })
    .strict()
    .refine(
      (value) => value.status !== "waiting" || Boolean(value.waitingReason),
      "Explain what you are waiting for",
    )
    .parse(raw);
  if (findSecrets(input.waitingReason ?? "").length)
    throw new Error("Do not store credentials in workflows.");
  if (input.status !== "waiting" && (input.waitingReason || input.reviewAfter))
    throw new Error("Waiting details only apply to waiting items.");
  return updateCollection(home, NAME, WorkflowSchema, (items) => {
    const workflow = items.find((item) => item.id === input.workflowId);
    const item = workflow?.items.find(
      (candidate) => candidate.id === input.itemId,
    );
    if (!workflow || !item) throw new Error("Workflow item not found.");
    if (!options.showSensitive && privateItem(workflow, item))
      throw new Error("Accessible workflow item not found.");
    item.status = input.status;
    delete item.waitingReason;
    delete item.reviewAfter;
    if (input.status === "waiting") {
      item.waitingReason = input.waitingReason;
      item.reviewAfter = input.reviewAfter;
    }
    workflow.updated = now.toISOString();
    return workflow;
  });
}

export function workflowProgress(workflow: Workflow, now = new Date()) {
  return {
    done: workflow.items.filter((item) => item.status === "done").length,
    total: workflow.items.length,
    next:
      workflow.items.find((item) => item.status === "doing") ??
      workflow.items.find((item) => item.status === "todo") ??
      null,
    waitingForReview: workflow.items.filter(
      (item) =>
        item.status === "waiting" &&
        item.reviewAfter &&
        Date.parse(item.reviewAfter) <= now.getTime(),
    ),
  };
}

export const CapacityPlanInputSchema = z
  .object({
    from: instant,
    to: instant,
    availableMinutes: z.number().int().min(1).max(480),
    energy: z.enum(["low", "medium", "high"]).default("medium"),
    timezone: z.string().refine(isValidTimeZone),
    bufferMinutes: z.number().int().min(0).max(120).default(0),
    travelMinutes: z.number().int().min(0).max(240).default(0),
    showSensitive: z.boolean().default(false),
    busy: z
      .array(
        z
          .object({ from: instant, to: instant })
          .strict()
          .refine((slot) => Date.parse(slot.to) > Date.parse(slot.from)),
      )
      .max(100)
      .default([]),
  })
  .strict()
  .refine(
    (input) =>
      Date.parse(input.to) > Date.parse(input.from) &&
      Date.parse(input.to) - Date.parse(input.from) <= 86400000,
    "Planning window must be within 24 hours",
  );

/** Suggestions only: never writes tasks, bookings, reminders or completion states. */
export function capacityPlan(home: string, raw: unknown, now = new Date()) {
  const input = CapacityPlanInputSchema.parse(raw);
  const from = Math.max(Date.parse(input.from), now.getTime());
  const to = Date.parse(input.to);
  if (from >= to) throw new Error("Planning window has already ended.");
  const loaded = readCollection(home, NAME, WorkflowSchema);
  if (loaded.invalid.length)
    throw new Error(
      "Repair invalid workflow records before capacity planning; their occupied times cannot be verified.",
    );
  const all = loaded.items;
  const pad = (input.bufferMinutes + input.travelMinutes) * 60000;
  const busy = input.busy.map((slot) => [
    Date.parse(slot.from) - pad,
    Date.parse(slot.to) + pad,
  ]);
  for (const workflow of all)
    if (workflow.scheduledStart && workflow.scheduledEnd)
      busy.push([
        Date.parse(workflow.scheduledStart) - pad,
        Date.parse(workflow.scheduledEnd) + pad,
      ]);
  // Reminder times are notifications, not appointment durations: reserve just the firing minute.
  for (const occurrence of occurrencesBetween(
    home,
    new Date(from - pad - 60000),
    new Date(to + pad),
    input.timezone,
  ))
    busy.push([
      occurrence.at.getTime() - pad,
      occurrence.at.getTime() + 60000 + pad,
    ]);
  const free: Array<{ from: number; to: number }> = [];
  let cursor = from;
  for (const [start, end] of busy.sort((a, b) => a[0]! - b[0]!)) {
    if (end! <= cursor || start! >= to) continue;
    if (start! > cursor) free.push({ from: cursor, to: Math.min(start!, to) });
    cursor = Math.max(cursor, end!);
  }
  if (cursor < to) free.push({ from: cursor, to });
  const energy = { low: 0, medium: 1, high: 2 };
  const priorities = { high: 0, normal: 1, low: 2 };
  const candidates: Array<{
    id: string;
    text: string;
    workflowId?: string;
    minutes: number;
    estimated: boolean;
    energy: "low" | "medium" | "high";
    priority: "high" | "normal" | "low";
    due?: string;
  }> = [];
  for (const workflow of all)
    for (const item of workflow.items) {
      if (
        (item.status === "todo" || item.status === "doing") &&
        (input.showSensitive || !privateItem(workflow, item))
      )
        candidates.push({ ...item, workflowId: workflow.id, estimated: false });
    }
  for (const task of listTasks(home))
    if (
      task.list !== SHOPPING &&
      (input.showSensitive || !looksSensitive(task.text))
    )
      candidates.push({ ...task, minutes: 15, estimated: true, energy: "low" });
  candidates.sort(
    (a, b) =>
      priorities[a.priority] - priorities[b.priority] ||
      (a.due ? Date.parse(a.due) : Infinity) -
        (b.due ? Date.parse(b.due) : Infinity) ||
      a.id.localeCompare(b.id),
  );
  const slots = free.map((slot) => ({ ...slot }));
  const suggestions: Array<{
    id: string;
    workflowId?: string;
    text: string;
    from: string;
    to: string;
    minutes: number;
    estimated: boolean;
    reason: string;
  }> = [];
  let remaining = input.availableMinutes;
  for (const item of candidates) {
    if (energy[item.energy] > energy[input.energy] || item.minutes > remaining)
      continue;
    const slot = slots.find(
      (candidate) => candidate.to - candidate.from >= item.minutes * 60000,
    );
    if (!slot) continue;
    const start = slot.from;
    slot.from += item.minutes * 60000;
    remaining -= item.minutes;
    suggestions.push({
      id: item.id,
      workflowId: item.workflowId,
      text: item.text,
      from: new Date(start).toISOString(),
      to: new Date(slot.from).toISOString(),
      minutes: item.minutes,
      estimated: item.estimated,
      reason: `priority=${item.priority}; deadline=${item.due ?? "none"}; energy=${item.energy}; fits available time`,
    });
  }
  return {
    suggestions,
    freeSlots: free.map((slot) => ({
      from: new Date(slot.from).toISOString(),
      to: new Date(slot.to).toISOString(),
    })),
    plannedMinutes: input.availableMinutes - remaining,
    assumptions: [
      "Only HELEN records and supplied busy slots are checked; external calendars are not connected.",
      "Task deadlines do not reserve time. Reminders reserve their firing minute, not an invented appointment duration.",
      "Tasks without an effort estimate use a provisional 15 minutes and low energy; confirm before relying on the plan.",
      "Travel and buffer are user supplied and apply around commitments; suggestions do not create bookings.",
    ],
  };
}
