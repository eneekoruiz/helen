import type { HelenModule } from './types.js';
import { qualityModule } from './quality/index.js';
import { testingModule } from './testing/index.js';
import { dockerModule } from './docker/index.js';
import { ciModule } from './ci/index.js';
import { seoModule } from './seo/index.js';
import { securityModule } from './security/index.js';
import { dxModule } from './dx/index.js';
import { themeModule } from './theme/index.js';
import { gdprModule } from './gdpr/index.js';
import { pwaModule } from './pwa/index.js';
import { i18nModule } from './i18n/index.js';
import { sentryModule } from './sentry/index.js';
import { cmsModule } from './cms/index.js';
// Note: `tailwind` and `shadcn` are not registered by default yet.

/**
 * All registered modules, keyed by their id.
 */
const modules: Map<string, HelenModule> = new Map();

export function register(mod: HelenModule): void {
  if (modules.has(mod.meta.id)) {
    throw new Error(`Duplicate module ID: ${mod.meta.id}`);
  }
  modules.set(mod.meta.id, mod);
}

export function unregisterForTesting(id: string): void {
  modules.delete(id);
}

// Register all modules
register(qualityModule);
register(testingModule);
register(dockerModule);
register(ciModule);
register(seoModule);
register(securityModule);
register(dxModule);
register(themeModule);
register(gdprModule);
register(pwaModule);
register(i18nModule);
register(sentryModule);
register(cmsModule);
// Do not register Tailwind / Shadcn here to keep the stable set of modules
// registered by default. They can be added later when promoted from planned.


/**
 * Get a module by id.
 */
export function getModule(id: string): HelenModule | undefined {
  return modules.get(id);
}

/**
 * Get all registered modules.
 */
export function getAllModules(): HelenModule[] {
  return Array.from(modules.values());
}

/**
 * Get all stable modules (status: 'stable').
 */
export function getStableModules(): HelenModule[] {
  return Array.from(modules.values()).filter(mod => mod.meta.status === 'stable');
}

/**
 * Get modules by status.
 */
export function getModulesByStatus(status: 'stable' | 'experimental' | 'planned' | 'deprecated'): HelenModule[] {
  return Array.from(modules.values()).filter(mod => mod.meta.status === status);
}

/**
 * Get all module ids.
 */
export function getAllModuleIds(): string[] {
  return Array.from(modules.keys());
}

/**
 * Get stable module ids only.
 */
export function getStableModuleIds(): string[] {
  return getStableModules().map(mod => mod.meta.id);
}

/**
 * Get modules grouped by category.
 */
export function getModulesByCategory(): Map<string, HelenModule[]> {
  const categories = new Map<string, HelenModule[]>();
  for (const mod of modules.values()) {
    const list = categories.get(mod.meta.category) ?? [];
    list.push(mod);
    categories.set(mod.meta.category, list);
  }
  return categories;
}

/**
 * Modules that are planned but not yet registered.
 * These are future ideas or experimental modules not ready for public use.
 */
export const PLANNED_MODULES = [
  'tailwind',
  'shadcn',
  'analytics',
  'bundle-analyzer',
  'lighthouse',
  'clean-architecture',
] as const;
