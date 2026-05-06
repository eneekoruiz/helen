export interface GeneratorOptions {
    type: 'component' | 'hook' | 'page' | 'entity';
    name: string;
    cwd: string;
    dryRun?: boolean;
}
/**
 * Generate project entities (components, hooks, etc.) based on templates.
 */
export declare function generateEntity(options: GeneratorOptions): Promise<boolean>;
//# sourceMappingURL=generator.d.ts.map