import { z } from "zod";

export const workId = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const text = z.string().trim().min(1).max(4000);
const pathRef = z
  .string()
  .max(500)
  .refine(
    (value) =>
      value.length > 0 &&
      !value.includes("\\") &&
      !value.startsWith("/") &&
      !value.includes(":") &&
      !value
        .split("/")
        .some((part) => !part || part === "." || part === "..") &&
      !/^(?:\.git|node_modules|\.helen)(?:\/|$)/.test(value),
    "Expected a project-relative source path",
  );
const refs = z.array(pathRef).max(100);
export const requirementInput = z
  .object({
    id: workId,
    title: text,
    acceptance: z.array(text).min(1).max(30),
    files: refs.default([]),
  })
  .strict();
export const taskInput = z
  .object({
    id: workId,
    title: text,
    requirements: z.array(workId).max(100).default([]),
    dependsOn: z
      .array(z.string().regex(/^[a-z][a-z0-9-]{0,63}:[a-z][a-z0-9-]{0,63}$/))
      .max(100)
      .default([]),
    files: refs.default([]),
    checkpoint: z.boolean().default(false),
    condition: z.object({ question: workId, answer: text }).strict().optional(),
    requiredChecks: z
      .array(z.enum(["typecheck", "lint", "test", "build"]))
      .max(4)
      .default(["typecheck", "lint", "test", "build"]),
  })
  .strict();
export const decisionInput = z
  .object({
    id: workId,
    question: text,
    answer: text,
    rationale: text,
    alternatives: z.array(text).max(6).default([]),
    requirements: z.array(workId).max(100).default([]),
    source: z.enum(["conversation", "native_question", "import"]),
    runtime: z.string().max(100).optional(),
    tool: z.string().max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.source === "native_question" &&
      (!value.runtime?.trim() || !value.tool?.trim())
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Reported native question provenance requires runtime and tool",
      });
  });
export const questionInput = z
  .object({
    id: workId,
    question: text,
    options: z.array(text).max(4).default([]),
    requirements: z.array(workId).max(100).default([]),
  })
  .strict();
const taskSchema = taskInput.extend({
  status: z.enum(["pending", "active", "blocked", "done", "skipped"]),
  needsReview: z.boolean(),
  reviewReason: text.optional(),
  note: text.optional(),
  acceptedScope: z.string().uuid().optional(),
  evidenceId: workId.optional(),
});
const gateSchema = z.object({
  id: workId,
  task: workId,
  scopeRevision: z.string().uuid(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  at: z.string().datetime(),
  ok: z.boolean(),
  results: z.array(z.object({ script: z.string(), ok: z.boolean() })).max(20),
  receipt: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export const featureSchema = z.object({
  id: workId,
  title: text,
  goal: text,
  exclusions: z.array(text).max(40),
  files: refs,
  profile: z.enum(["quick", "standard", "exhaustive"]),
  status: z.enum(["active", "paused", "completed"]),
  scopeRevision: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  requirements: z.array(requirementInput).max(200),
  tasks: z.array(taskSchema).max(200),
  decisions: z
    .array(decisionInput.innerType().extend({ at: z.string().datetime() }))
    .max(200),
  questions: z
    .array(
      questionInput.extend({
        answer: text.optional(),
        decisionId: workId.optional(),
      }),
    )
    .max(100),
  gates: z.array(gateSchema).max(200),
  history: z
    .array(
      z
        .object({
          id: z.string().uuid(),
          at: z.string().datetime(),
          action: z.string().max(100),
          previousScope: z.string().uuid(),
          scope: z.string().uuid(),
          changes: z
            .array(
              z
                .object({
                  field: z.string().max(200),
                  before: z.unknown(),
                  after: z.unknown(),
                })
                .strict(),
            )
            .max(500),
        })
        .strict(),
    )
    .max(500)
    .default([]),
});
export const learningInput = z
  .object({
    id: workId,
    problem: text,
    cause: text,
    solution: text,
    tags: z.array(z.string().trim().min(1).max(100)).max(30),
    conditions: z
      .object({
        packages: z
          .array(
            z
              .object({
                name: z.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i),
                major: z.number().int().min(0).optional(),
              })
              .strict(),
          )
          .max(30),
        paths: refs,
        tags: z.array(z.string().trim().min(1).max(100)).max(30),
      })
      .strict(),
    provenance: z
      .object({
        source: text,
        evidence: z.array(text).min(1).max(20),
        kind: z.enum(["observed", "reported"]),
      })
      .strict(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();
export const creativeKitInput = z
  .object({
    name: z.string().trim().min(1).max(150),
    direction: text,
    references: z
      .array(z.object({ label: text, location: text, reason: text }).strict())
      .max(20),
    colors: z
      .object({
        background: z.string().regex(/^#[a-f0-9]{6}$/i),
        text: z.string().regex(/^#[a-f0-9]{6}$/i),
        accent: z.string().regex(/^#[a-f0-9]{6}$/i),
      })
      .strict(),
    typography: z
      .object({
        display: text,
        body: text,
        hierarchy: z.array(text).min(1).max(8),
      })
      .strict(),
    imagery: text,
    composition: text,
    motion: z
      .object({
        purpose: text,
        durationMs: z.number().int().min(0).max(3000),
        reducedMotion: text,
        staticFallback: text,
      })
      .strict(),
    tone: text,
    exclusions: z.array(text).max(30),
  })
  .strict();
export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.string().uuid(),
    updatedAt: z.string().datetime(),
    features: z.array(featureSchema).max(200),
    learnings: z
      .array(learningInput.extend({ recordedAt: z.string().datetime() }))
      .max(500),
    creativeKit: creativeKitInput
      .extend({ updatedAt: z.string().datetime() })
      .optional(),
  })
  .strict();
export type Workspace = z.infer<typeof workspaceSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type Task = Feature["tasks"][number];
export type Learning = Workspace["learnings"][number];
export type CreativeKit = z.infer<typeof creativeKitInput>;
