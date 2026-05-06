export type ScaffoldType = 'vite-react-ts' | 'next-ts';
export interface ScaffoldOptions {
    name: string;
    type: ScaffoldType;
    cwd: string;
}
/**
 * Scaffold a new project from scratch.
 */
export declare function scaffoldProject(options: ScaffoldOptions): Promise<boolean>;
//# sourceMappingURL=scaffold.d.ts.map