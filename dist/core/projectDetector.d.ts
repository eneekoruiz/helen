import { type PackageManager } from './packageManager.js';
export interface ProjectInfo {
    name: string;
    hasPackageJson: boolean;
    hasGit: boolean;
    hasSrc: boolean;
    hasTypeScript: boolean;
    hasVite: boolean;
    hasReact: boolean;
    packageManager: PackageManager;
    framework: 'vite' | 'next' | 'cra' | 'unknown';
}
/**
 * Detect project characteristics from the filesystem.
 */
export declare function detectProject(cwd: string): ProjectInfo;
//# sourceMappingURL=projectDetector.d.ts.map