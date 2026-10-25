import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { withHomeLock } from "./home.js";
import { readCollection, updateCollection } from "./store.js";
import { TaskSchema, type Task } from "./tasks.js";
import { oneLine } from "./text.js";
import { parseWhen, stripWhen, type WhenOptions } from "./when.js";

const CandidateSchema = z
  .object({
    text: z.string().trim().min(1).max(300),
    due: z.string().datetime().optional(),
    missing: z.array(z.string().min(1).max(120)).max(5),
  })
  .strict();
export type CaptureCandidate = z.infer<typeof CandidateSchema>;
export const CaptureSchema = z
  .object({
    id: z.string().uuid(),
    owner: z.string().min(1).max(200),
    version: z.number().int().positive(),
    created: z.string().datetime(),
    items: z.array(CandidateSchema).min(1).max(100),
    status: z.enum(["draft", "reserved", "confirmed"]),
    taskIds: z.array(z.string().regex(/^t[0-9a-f]{6}$/)).max(100),
  })
  .refine(
    (draft) =>
      draft.status === "draft"
        ? draft.taskIds.length === 0
        : draft.taskIds.length === draft.items.length &&
          new Set(draft.taskIds).size === draft.taskIds.length,
    "Capture task reservations do not match its candidates.",
  );
export type CaptureDraft = z.infer<typeof CaptureSchema>;
export interface CaptureExtractor {
  command: string;
  args?: string[];
  timeoutMs?: number;
}
export interface CaptureInput {
  owner: string;
  text?: string;
  attachment?: { data: Buffer; mime: string };
  extractor?: CaptureExtractor;
}
const MAX_TEXT = 32_000;
const MAX_BYTES = 10 * 1024 * 1024;

function checkText(text: string): string {
  if (!text.trim() || text.length > MAX_TEXT || text.includes("\0"))
    throw new Error(
      "Capture text is empty, invalid or too large (32000 characters maximum).",
    );
  if (findSecrets(text).length)
    throw new Error("Remove credentials before capturing this content.");
  return text;
}

function mediaExtension(data: Buffer, mime: string): string {
  const starts = (bytes: number[]) =>
    bytes.every((byte, index) => data[index] === byte);
  if (mime === "application/pdf" && data.subarray(0, 5).toString() === "%PDF-")
    return ".pdf";
  if (mime === "image/png" && starts([137, 80, 78, 71, 13, 10, 26, 10]))
    return ".png";
  if (mime === "image/jpeg" && starts([255, 216, 255])) return ".jpg";
  if (
    mime === "audio/wav" &&
    data.subarray(0, 4).toString() === "RIFF" &&
    data.subarray(8, 12).toString() === "WAVE"
  )
    return ".wav";
  if (
    mime === "audio/mpeg" &&
    (data.subarray(0, 3).toString() === "ID3" ||
      (data[0] === 255 && ((data[1] ?? 0) & 224) === 224))
  )
    return ".mp3";
  if (mime === "audio/ogg" && data.subarray(0, 4).toString() === "OggS")
    return ".ogg";
  throw new Error(
    "Unsupported media type or content does not match its declared type.",
  );
}

async function extractAttachment(
  input: NonNullable<CaptureInput["attachment"]>,
  extractor?: CaptureExtractor,
): Promise<string> {
  if (
    !Buffer.isBuffer(input.data) ||
    !input.data.length ||
    input.data.length > MAX_BYTES
  )
    throw new Error("Attachment must contain between 1 byte and 10 MB.");
  if (["text/plain", "text/markdown"].includes(input.mime))
    return checkText(
      new TextDecoder("utf-8", { fatal: true }).decode(input.data),
    );
  const extension = mediaExtension(input.data, input.mime);
  if (!extractor?.command)
    throw new Error(
      "Configure a trusted local media extractor before capturing images, PDF or audio.",
    );
  const timeout = z
    .number()
    .int()
    .min(1)
    .max(60_000)
    .parse(extractor.timeoutMs ?? 30_000);
  const args = z
    .array(z.string().max(2000))
    .max(30)
    .parse(extractor.args ?? []);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "helen-capture-"));
  fs.chmodSync(directory, 0o700);
  const file = path.join(directory, `input${extension}`);
  try {
    fs.writeFileSync(file, input.data, { mode: 0o600 });
    return await new Promise<string>((resolve, reject) => {
      const env: NodeJS.ProcessEnv = {};
      for (const key of [
        "PATH",
        "Path",
        "SystemRoot",
        "WINDIR",
        "TEMP",
        "TMP",
        "LANG",
      ])
        if (process.env[key]) env[key] = process.env[key];
      const child = spawn(extractor.command, [...args, file, input.mime], {
        shell: false,
        windowsHide: true,
        env,
        cwd: directory,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = Buffer.alloc(0);
      let failure: Error | undefined;
      const timer = setTimeout(() => {
        failure = new Error("Local extraction timed out.");
        child.kill();
      }, timeout);
      child.stdout.on("data", (chunk: Buffer) => {
        if (output.length + chunk.length > MAX_TEXT * 4) {
          failure = new Error("Local extraction output is too large.");
          child.kill();
        } else output = Buffer.concat([output, chunk]);
      });
      // Extractor stderr may contain private input; consume it without retaining or displaying it.
      child.stderr.resume();
      child.on("error", () => {
        clearTimeout(timer);
        reject(new Error("Could not start the local media extractor."));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (failure) return reject(failure);
        if (code !== 0)
          return reject(new Error("Local media extraction failed."));
        try {
          resolve(
            checkText(new TextDecoder("utf-8", { fatal: true }).decode(output)),
          );
        } catch (error) {
          reject(error);
        }
      });
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export { extractAttachment as extractCaptureAttachment };

/** Source text is data: no instruction in it is executed, and dates are proposals only. */
export async function createCapture(
  home: string,
  input: CaptureInput,
  options: WhenOptions,
): Promise<CaptureDraft> {
  const owner = z.string().trim().min(1).max(200).parse(input.owner);
  if ((input.text === undefined) === (input.attachment === undefined))
    throw new Error("Provide exactly one text or attachment source.");
  const text = input.attachment
    ? await extractAttachment(input.attachment, input.extractor)
    : checkText(input.text!);
  const lines = text
    .split(/\r?\n/)
    .map((line) => oneLine(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")))
    .filter(Boolean);
  if (!lines.length || lines.length > 100)
    throw new Error(
      "Capture accepts 1 to 100 (up to 20 candidate lines recommended); split larger documents before importing.",
    );
  const items = lines.map((line): CaptureCandidate => {
    if (line.length > 300)
      throw new Error(
        "A candidate exceeds 300 characters; split or shorten it before capture.",
      );
    const parsed = parseWhen(line, options);
    const missing: string[] = [];
    if (!parsed) missing.push("Confirmar si necesita fecha y hora");
    else if (parsed.recurrence)
      missing.push("La repetición requiere crear un recordatorio por separado");
    else if (!parsed.hadTime)
      missing.push("Hora no indicada: se propone la hora predeterminada");
    if (parsed && parsed.due <= options.now)
      missing.push("La fecha propuesta ya ha pasado");
    return {
      text: (parsed ? stripWhen(line, parsed.spans).trim() : line) || line,
      ...(parsed && !parsed.recurrence && parsed.due > options.now
        ? { due: parsed.due.toISOString() }
        : {}),
      missing,
    };
  });
  const draft = CaptureSchema.parse({
    id: crypto.randomUUID(),
    owner,
    version: 1,
    created: options.now.toISOString(),
    items,
    status: "draft",
    taskIds: [],
  });
  updateCollection(home, "captures", CaptureSchema, (drafts) => {
    drafts.push(draft);
  });
  return draft;
}

export function getCapture(
  home: string,
  id: string,
  owner: string,
): CaptureDraft {
  const draft = readCollection(home, "captures", CaptureSchema).items.find(
    (item) => item.id === id && item.owner === owner,
  );
  if (!draft) throw new Error("Capture not found.");
  return draft;
}

export interface CaptureApproval {
  id: string;
  owner: string;
  version: number;
  items: CaptureCandidate[];
}
function validateItems(items: CaptureCandidate[]): CaptureCandidate[] {
  const parsed = z.array(CandidateSchema).min(1).max(100).parse(items);
  for (const item of parsed) checkText(JSON.stringify(item));
  return parsed;
}

export function editCapture(
  home: string,
  input: CaptureApproval,
): CaptureDraft {
  const items = validateItems(input.items);
  return updateCollection(home, "captures", CaptureSchema, (drafts) => {
    const draft = drafts.find(
      (item) => item.id === input.id && item.owner === input.owner,
    );
    if (!draft || draft.version !== input.version || draft.status !== "draft")
      throw new Error(
        "Capture changed or is already confirmed; reload it before editing.",
      );
    draft.items = items;
    draft.version++;
    return draft;
  });
}

/** Reserve stable task IDs before writing tasks: retry after a crash cannot append duplicates. */
export function confirmCapture(home: string, input: CaptureApproval): Task[] {
  const items = validateItems(input.items);
  return withHomeLock(home, () => {
    const draft = getCapture(home, input.id, input.owner);
    if (
      draft.version !== input.version ||
      JSON.stringify(draft.items) !== JSON.stringify(items)
    )
      throw new Error(
        "Confirmation does not match the reviewed capture; reload and approve the exact items.",
      );
    if (draft.status === "confirmed") {
      return readCollection(home, "tasks", TaskSchema).items.filter((task) =>
        draft.taskIds.includes(task.id),
      );
    }
    if (draft.status === "draft") {
      const used = new Set(
        readCollection(home, "tasks", TaskSchema).items.map((task) => task.id),
      );
      for (const capture of readCollection(home, "captures", CaptureSchema)
        .items)
        for (const id of capture.taskIds) used.add(id);
      draft.taskIds = items.map(() => {
        let id: string;
        do {
          id = `t${crypto.randomBytes(3).toString("hex")}`;
        } while (used.has(id));
        used.add(id);
        return id;
      });
      draft.status = "reserved";
      updateCollection(home, "captures", CaptureSchema, (drafts) => {
        drafts[drafts.findIndex((item) => item.id === draft.id)] = draft;
      });
    }
    const tasks = items.map((item, index) =>
      TaskSchema.parse({
        id: draft.taskIds[index],
        text: item.text,
        list: "inbox",
        status: "open",
        priority: "normal",
        created: draft.created,
        updated: draft.created,
        source: "capture",
        ...(item.due ? { due: item.due } : {}),
      }),
    );
    updateCollection(home, "tasks", TaskSchema, (stored) => {
      for (const task of tasks) {
        const existing = stored.find((item) => item.id === task.id);
        if (
          existing &&
          (existing.text !== task.text || existing.source !== "capture")
        )
          throw new Error(
            "Reserved capture task conflicts with existing data.",
          );
      }
      for (const task of tasks)
        if (!stored.some((item) => item.id === task.id)) stored.push(task);
    });
    updateCollection(home, "captures", CaptureSchema, (drafts) => {
      drafts.find((item) => item.id === draft.id)!.status = "confirmed";
    });
    return tasks;
  });
}
