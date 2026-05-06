import type { HelenModule } from './types.js';
/**
 * Get a module by id.
 */
export declare function getModule(id: string): HelenModule | undefined;
/**
 * Get all registered modules.
 */
export declare function getAllModules(): HelenModule[];
/**
 * Get all stable modules (status: 'stable').
 */
export declare function getStableModules(): HelenModule[];
/**
 * Get modules by status.
 */
export declare function getModulesByStatus(status: 'stable' | 'experimental' | 'planned' | 'deprecated'): HelenModule[];
/**
 * Get all module ids.
 */
export declare function getAllModuleIds(): string[];
/**
 * Get stable module ids only.
 */
export declare function getStableModuleIds(): string[];
/**
 * Get modules grouped by category.
 */
export declare function getModulesByCategory(): Map<string, HelenModule[]>;
/**
 * Modules that are planned but not yet registered.
 * These are future ideas or experimental modules not ready for public use.
 */
export declare const PLANNED_MODULES: readonly ["tailwind", "shadcn", "analytics", "bundle-analyzer", "lighthouse", "clean-architecture"];
//# sourceMappingURL=registry.d.ts.map