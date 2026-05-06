export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
/**
 * Detect which package manager is being used in the project.
 */
export declare function detectPackageManager(cwd: string): PackageManager;
/**
 * Get the install command for a package manager.
 */
export declare function getInstallCommand(pm: PackageManager): string;
/**
 * Get the run command for a package manager.
 */
export declare function getRunCommand(pm: PackageManager, script: string): string;
//# sourceMappingURL=packageManager.d.ts.map