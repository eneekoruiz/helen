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
 * Get all module ids.
 */
export declare function getAllModuleIds(): string[];
/**
 * Get modules grouped by category.
 */
export declare function getModulesByCategory(): Map<string, HelenModule[]>;
/**
 * Placeholder module ids for future versions.
 */
export declare const PLANNED_MODULES: readonly ["gdpr", "pwa", "i18n", "sentry", "analytics", "bundle-analyzer", "lighthouse", "clean-architecture"];
//# sourceMappingURL=registry.d.ts.map