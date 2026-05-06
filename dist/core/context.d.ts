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
export declare function createEmptyResult(moduleId: string, moduleName: string): ModuleResult;
//# sourceMappingURL=context.d.ts.map