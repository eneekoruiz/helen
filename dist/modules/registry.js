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
// Note: `tailwind` and `shadcn` are not registered by default yet.
/**
 * All registered modules, keyed by their id.
 */
const modules = new Map();
function register(mod) {
    modules.set(mod.meta.id, mod);
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
// Do not register Tailwind / Shadcn here to keep the stable set of modules
// registered by default. They can be added later when promoted from planned.
/**
 * Get a module by id.
 */
export function getModule(id) {
    return modules.get(id);
}
/**
 * Get all registered modules.
 */
export function getAllModules() {
    return Array.from(modules.values());
}
/**
 * Get all module ids.
 */
export function getAllModuleIds() {
    return Array.from(modules.keys());
}
/**
 * Get modules grouped by category.
 */
export function getModulesByCategory() {
    const categories = new Map();
    for (const mod of modules.values()) {
        const list = categories.get(mod.meta.category) ?? [];
        list.push(mod);
        categories.set(mod.meta.category, list);
    }
    return categories;
}
/**
 * Placeholder module ids for future versions.
 */
export const PLANNED_MODULES = [
    'gdpr',
    'pwa',
    'i18n',
    'sentry',
    'analytics',
    'bundle-analyzer',
    'lighthouse',
    'clean-architecture',
];
//# sourceMappingURL=registry.js.map