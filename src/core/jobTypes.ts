import { z } from "zod";

export const jobProviderSchema = z.enum(["codex", "claude"]);
export type JobProvider = z.infer<typeof jobProviderSchema>;
export const jobResultSchema = z
  .object({
    status: z.enum(["completed", "needs_input", "failed"]),
    summary: z.string().trim().min(1).max(24000),
    question: z.string().trim().max(4000).nullable(),
    options: z.array(z.string().trim().min(1).max(500)).max(4),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "needs_input" && !value.question?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A waiting task needs a question",
      });
    if (
      value.status !== "needs_input" &&
      (value.question !== null || value.options.length)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only a waiting task may ask a question",
      });
  });
export type JobResult = z.infer<typeof jobResultSchema>;
export const JOB_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["completed", "needs_input", "failed"] },
    summary: { type: "string" },
    question: { type: ["string", "null"] },
    options: { type: "array", items: { type: "string" } },
  },
  required: ["status", "summary", "question", "options"],
};
export const jobDefinitionSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  cwd: z.string().min(1),
  provider: jobProviderSchema,
  prompt: z.string().trim().min(1).max(60000),
  createdAt: z.string().datetime(),
  maxMinutes: z.number().int().min(1).max(240),
  maxCalls: z.number().int().min(1).max(20),
  maxTurns: z.number().int().min(1).max(100),
  subscriptionOnly: z.literal(true),
  claudeExtraUsageDisabled: z.boolean(),
  codexCreditsUnavailable: z.boolean().default(false),
});
export type JobDefinition = z.infer<typeof jobDefinitionSchema>;
export const jobStateSchema = z
  .object({
    attempt: z.number().int().min(1).max(20),
    status: z.enum([
      "queued",
      "running",
      "completed",
      "needs_input",
      "blocked",
      "failed",
      "stopped",
      "timed_out",
      "interrupted",
    ]),
    updatedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    finishedAt: z.string().datetime().optional(),
    workerPid: z.number().int().positive().optional(),
    result: jobResultSchema.optional(),
    error: z.string().max(4000).optional(),
    sessionId: z.string().max(200).optional(),
    providerVersion: z.string().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.status === "completed" || value.status === "needs_input") &&
      value.result?.status !== value.status
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Successful or waiting states require a matching validated result",
      });
  });
export type JobState = z.infer<typeof jobStateSchema>;
export interface RuntimeRequest {
  provider: JobProvider;
  cwd: string;
  directory: string;
  prompt: string;
  maxMinutes: number;
  maxTurns: number;
  claudeExtraUsageDisabled: boolean;
  codexCreditsUnavailable: boolean;
  cancelled: () => boolean;
}
export interface RuntimeOutcome {
  status:
    | "completed"
    | "needs_input"
    | "blocked"
    | "failed"
    | "stopped"
    | "timed_out";
  result?: JobResult;
  error?: string;
  sessionId?: string;
  providerVersion?: string;
}
export type JobRuntime = (request: RuntimeRequest) => Promise<RuntimeOutcome>;
