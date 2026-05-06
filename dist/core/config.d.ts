export interface HelenConfig {
    projectName: string;
    framework: string;
    packageManager: string;
    installedModules: string[];
    createdAt: string;
    updatedAt: string;
    settings: Record<string, any>;
}
/**
 * Get the path to the .helenrc file in the project root.
 */
export declare function getConfigPath(cwd: string): string;
/**
 * Read the .helenrc config file.
 * Returns null if not found or malformed (after backing it up).
 */
export declare function readConfig(cwd: string): HelenConfig | null;
/**
 * Initialize or update the .helenrc config file.
 */
export declare function updateConfig(cwd: string, updates: Partial<HelenConfig>): void;
/**
 * Check if a module is already installed according to the config.
 */
export declare function isModuleInstalled(cwd: string, moduleId: string): boolean;
//# sourceMappingURL=config.d.ts.map