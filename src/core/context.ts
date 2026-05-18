import type { ProjectInfo } from './projectDetector.js';

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
  /** Optional key-value settings parsed from CLI or interactive questions */
  settings?: Record<string, any>;
}

export interface ModuleResult {
  moduleId: string;
  moduleName: string;
  created: string[];
  modified: string[];
  skipped: string[];
  warnings: string[];
  nextSteps: string[];
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
