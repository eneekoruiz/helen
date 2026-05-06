import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Resolve a template path relative to the project templates/ directory.
 * Works both in development (src/) and production (dist/).
 */
export function getTemplatePath(templateRelPath) {
    // Go up from src/core/ or dist/core/ to project root, then into templates/
    const projectRoot = path.resolve(__dirname, '..', '..');
    return path.join(projectRoot, 'templates', templateRelPath);
}
//# sourceMappingURL=templateResolver.js.map