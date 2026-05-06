/**
 * Check if a file exists at the given path.
 */
export declare function fileExists(filePath: string): boolean;
/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export declare function ensureDir(dirPath: string): void;
/**
 * Write a file safely: does not overwrite unless force is true.
 * In dry-run mode, logs what would happen but does not write.
 * Supports Handlebars interpolation if variables are provided.
 *
 * Returns: 'created' | 'skipped' | 'overwritten'
 */
export declare function writeFileSafe(filePath: string, content: string, options?: {
    dryRun?: boolean;
    force?: boolean;
    vars?: Record<string, any>;
}): 'created' | 'skipped' | 'overwritten';
/**
 * Copy a template file to a destination safely with interpolation support.
 */
export declare function copyTemplate(templatePath: string, destPath: string, options?: {
    dryRun?: boolean;
    force?: boolean;
    vars?: Record<string, any>;
}): 'created' | 'skipped' | 'overwritten';
/**
 * Read and parse a JSON file. Returns null if not found or invalid.
 */
export declare function readJson<T = Record<string, unknown>>(filePath: string): T | null;
/**
 * Patch a JSON file by merging new data. Creates the file if missing.
 * Does not overwrite existing keys unless explicitly set.
 */
export declare function patchJson(filePath: string, patches: Record<string, unknown>, options?: {
    dryRun?: boolean;
}): 'created' | 'modified' | 'skipped';
/**
 * Convenience wrapper for patching package.json.
 */
export declare function patchPackageJson(cwd: string, patches: Record<string, unknown>, options?: {
    dryRun?: boolean;
}): 'created' | 'modified' | 'skipped';
/**
 * Create a backup of a file before modifying it.
 */
export declare function backupFile(filePath: string): string | null;
/**
 * Append content to a file only if a marker string is not already present.
 */
export declare function appendOnce(filePath: string, marker: string, content: string, options?: {
    dryRun?: boolean;
}): 'created' | 'modified' | 'skipped';
/**
 * Detect if a file would conflict (exists and differs from template).
 */
export declare function detectConflict(filePath: string, newContent: string): boolean;
//# sourceMappingURL=fs.d.ts.map