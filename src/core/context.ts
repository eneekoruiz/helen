import type { ProjectInfo } from './projectDetector.js';
import { z } from 'zod';
import type { PlannedChange } from './preview.js';

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));
const SafeSettingsSchema = z.record(z.string().refine(key => !['__proto__', 'prototype', 'constructor'].includes(key)), JsonValueSchema)
  .superRefine((settings, ctx) => {
    if (Object.hasOwn(settings, 'securityLevel') && settings.securityLevel !== 'simple' && settings.securityLevel !== 'strict') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['securityLevel'], message: 'Expected simple or strict' });
    }
  });

/**
 * Runtime context for a HELEN execution.
 * Carries project info, flags, and accumulates results.
 */
export interface HelenContext {
  /** Absolute path to the target project root */
  cwd: string;
  /** Detected project information */
  project: ProjectInfo;
  /** If true, no files are written */
  dryRun: boolean;
  /** If true, overwrite existing files */
  force: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Collect a read-only diff instead of executing the operation. */
  preview?: boolean;
  plannedChanges?: PlannedChange[];
  /** Optional key-value settings parsed from CLI or interactive questions */
  settings?: Record<string, unknown>;
}

export interface ModuleResult {
  /** Partial writes remain tracked for recovery, but this module is not installed. */
  failed?: boolean;
  diagnostics?: Array<{ code: string; stage: string; message: string; path?: string; recoveryCommand?: string }>;
  operationId?: string;
  moduleId: string;
  moduleName: string;
  created: string[];
  modified: string[];
  skipped: string[];
  warnings: string[];
  nextSteps: string[];
}

/** Runtime contract for module output, useful at untrusted module boundaries. */
export const ModuleResultSchema: z.ZodType<ModuleResult> = z.object({
  failed: z.boolean().optional(),
  diagnostics: z.array(z.object({
    code: z.string(), stage: z.string(), message: z.string(), path: z.string().optional(),
    recoveryCommand: z.string().optional(),
  }).strict()).optional(),
  operationId: z.string().optional(),
  moduleId: z.string().min(1), moduleName: z.string().min(1),
  created: z.array(z.string()), modified: z.array(z.string()), skipped: z.array(z.string()),
  warnings: z.array(z.string()), nextSteps: z.array(z.string()),
}).strict();

/** Validate and return a module result, throwing a ZodError for invalid output. */
export function validateModuleResult(value: unknown): ModuleResult {
  return ModuleResultSchema.parse(value);
}

/** Validate runtime context settings while retaining arbitrary JSON-valued options. */
export function validateContextSettings(value: unknown): Record<string, unknown> {
  return SafeSettingsSchema.parse(value);
}

export function createEmptyResult(moduleId: string, moduleName: string): ModuleResult {
  return {
    moduleId,
    moduleName,
    created: [],
    modified: [],
    skipped: [],
    warnings: [],
    nextSteps: [],
  };
}
