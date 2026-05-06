import type { HelenContext, ModuleResult } from './context.js';
/**
 * Run a single module by ID in the given context.
 */
export declare function runModule(moduleId: string, ctx: HelenContext): Promise<ModuleResult | null>;
/**
 * Run multiple modules sequentially.
 */
export declare function runModules(moduleIds: string[], ctx: HelenContext): Promise<ModuleResult[]>;
/**
 * Eject a module: removes its files and reverts package.json changes where possible.
 */
export declare function ejectModule(moduleId: string, ctx: HelenContext): Promise<boolean>;
/**
 * Print a final summary of all module results.
 */
export declare function printSummary(results: ModuleResult[]): void;
//# sourceMappingURL=moduleRunner.d.ts.map