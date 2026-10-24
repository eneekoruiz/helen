import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isSafeProjectPath } from "./fs.js";
import { runProjectOperationSync, writeAtomicFile } from "./operations.js";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const label = z.string().trim().min(1).max(200);
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
export const outcomeInput = z
  .object({
    id: z.string().uuid().optional(),
    runId: label,
    caseId: label,
    provider: label,
    providerVersion: label,
    model: label.nullable(),
    condition: z.enum(["baseline", "skill", "project"]),
    evaluationStatus: z
      .enum(["completed", "blocked", "failed", "invalid", "timed_out"])
      .default("completed"),
    skill: label.nullable(),
    skillDigest: digest.nullable(),
    taskDigest: digest,
    graderDigest: digest,
    repositoryFingerprint: digest,
    accepted: z.boolean(),
    elapsedMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    inputTokens: count,
    outputTokens: count,
    cachedTokens: count,
    retries: z.number().int().min(0).max(100),
    humanCorrections: count,
    humanMinutes: z.number().min(0).max(100000).nullable(),
    evidence: z.string().trim().min(1).max(4000),
    source: z.enum(["native-runtime", "reported"]),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (record.accepted && record.evaluationStatus !== "completed")
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only completed, valid evaluations can be accepted",
      });
    if (record.condition === "skill" && (!record.skill || !record.skillDigest))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Skill comparisons require exact skill identity and digest",
      });
    if (record.condition === "baseline" && (record.skill || record.skillDigest))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Baseline must not claim a skill",
      });
  });
const stored = outcomeInput.safeExtend({
  id: z.string().uuid(),
  recordedAt: z.string().datetime(),
});
export type OutcomeInput = z.input<typeof outcomeInput>;
export type Outcome = z.infer<typeof stored>;
const store = z
  .object({ schemaVersion: z.literal(1), records: z.array(stored).max(10000) })
  .strict();
const LIMIT = 8 * 1024 * 1024;
function location(cwd: string): string {
  const result = path.join(path.resolve(cwd), ".helen", "outcomes.json");
  if (!isSafeProjectPath(cwd, result))
    throw new Error("Unsafe outcome metadata path");
  return result;
}
export function readOutcomes(cwd: string): Outcome[] {
  const file = location(cwd);
  if (!fs.existsSync(file)) return [];
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.size > LIMIT)
    throw new Error("Invalid outcome store; preserve it before repair");
  const records = store.parse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  ).records;
  const ids = new Set<string>();
  for (const record of records) {
    const { recordedAt: _at, ...input } = record;
    outcomeInput.parse(input);
    if (ids.has(record.id)) throw new Error("Duplicate outcome ID");
    ids.add(record.id);
  }
  return records;
}
/** Append evidence; source labels are provenance supplied by the caller, never a trust grant. */
export function recordOutcome(cwd: string, raw: unknown): Outcome {
  const input = outcomeInput.parse(raw);
  return runProjectOperationSync(cwd, "outcome:record", () => {
    const records = readOutcomes(cwd);
    const record = {
      ...input,
      id: input.id ?? randomUUID(),
      recordedAt: new Date().toISOString(),
    };
    if (records.some((entry) => entry.id === record.id))
      throw new Error("Outcome IDs are append-only");
    records.push(record);
    const content =
      JSON.stringify(store.parse({ schemaVersion: 1, records }), null, 2) +
      "\n";
    if (Buffer.byteLength(content) > LIMIT)
      throw new Error(
        "Outcome store exceeds 8 MiB; archive evidence before adding more",
      );
    fs.mkdirSync(path.dirname(location(cwd)), { recursive: true });
    const ignore = path.join(path.dirname(location(cwd)), ".gitignore");
    if (!isSafeProjectPath(cwd, ignore))
      throw new Error("Unsafe outcome ignore path");
    const ignored = fs.existsSync(ignore)
      ? fs.readFileSync(ignore, "utf8")
      : "";
    if (!ignored.split(/\r?\n/).includes("*"))
      writeAtomicFile(
        ignore,
        `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}*\n`,
        { mode: 0o600 },
      );
    writeAtomicFile(location(cwd), content, { mode: 0o600 });
    return record;
  }).value;
}
export function summarizeOutcomes(records: Outcome[]): Record<string, unknown> {
  const accepted = records.filter((record) => record.accepted).length;
  const measured = records.filter(
    (record) => record.inputTokens !== null && record.outputTokens !== null,
  );
  const tokenSum = measured.reduce(
    (sum, record) => sum + record.inputTokens! + record.outputTokens!,
    0,
  );
  const groups = new Map<string, Outcome[]>();
  for (const record of records) {
    if (record.condition === "project") continue;
    const key = JSON.stringify([
      record.runId,
      record.caseId,
      record.provider,
      record.providerVersion,
      record.model,
      record.taskDigest,
      record.graderDigest,
      record.repositoryFingerprint,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const pairs: Record<string, unknown>[] = [],
    excluded: string[] = [];
  for (const [key, group] of groups) {
    const baseline = group.filter((record) => record.condition === "baseline"),
      skill = group.filter((record) => record.condition === "skill");
    if (
      baseline.length !== 1 ||
      skill.length !== 1 ||
      baseline[0].source !== "native-runtime" ||
      skill[0].source !== "native-runtime" ||
      baseline[0].model === null ||
      skill[0].model === null ||
      baseline[0].evaluationStatus !== "completed" ||
      skill[0].evaluationStatus !== "completed"
    ) {
      excluded.push(key);
      continue;
    }
    const a = baseline[0],
      b = skill[0];
    pairs.push({
      runId: a.runId,
      caseId: a.caseId,
      provider: a.provider,
      model: a.model,
      skill: b.skill,
      skillDigest: b.skillDigest,
      qualityDelta: Number(b.accepted) - Number(a.accepted),
      elapsedDeltaMs: b.elapsedMs - a.elapsedMs,
      tokenDelta:
        a.inputTokens !== null &&
        a.outputTokens !== null &&
        b.inputTokens !== null &&
        b.outputTokens !== null
          ? b.inputTokens + b.outputTokens - a.inputTokens - a.outputTokens
          : null,
    });
  }
  return {
    attempts: records.length,
    accepted,
    acceptanceRate: records.length ? accepted / records.length : null,
    measuredTokenAttempts: measured.length,
    tokenCoverage: records.length ? measured.length / records.length : null,
    tokensPerAcceptedTask:
      accepted && measured.length === records.length
        ? tokenSum / accepted
        : null,
    elapsedMsPerAcceptedTask: accepted
      ? records.reduce((sum, record) => sum + record.elapsedMs, 0) / accepted
      : null,
    totalRetries: records.reduce((sum, record) => sum + record.retries, 0),
    humanCorrections:
      records.length &&
      records.every((record) => record.humanCorrections !== null)
        ? records.reduce((sum, record) => sum + record.humanCorrections!, 0)
        : null,
    humanMinutes:
      records.length && records.every((record) => record.humanMinutes !== null)
        ? records.reduce((sum, record) => sum + record.humanMinutes!, 0)
        : null,
    pairs,
    excludedPairGroups: excluded.length,
    limitations: [
      "Unknown usage and human intervention remain null; character estimates are not measured tokens.",
      "Source labels are caller provenance, not independent verification. Inspect original evidence.",
      "A finite sample or tied baseline does not establish a universal benefit. No spending or savings is inferred.",
    ],
  };
}
