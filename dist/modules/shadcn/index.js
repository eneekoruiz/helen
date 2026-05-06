import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson, patchJson } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'shadcn',
    name: 'Shadcn UI',
    category: 'Infrastructure',
    summary: 'Auto-setup for Shadcn UI components',
    description: 'Configures components.json, installs lucide-react and clsx, and sets up the lib/utils.ts helper.',
    problemItSolves: 'Manual Shadcn setup requires many steps and CLI interactions.',
    whenToUse: 'When you want high-quality, accessible UI components.',
    whenNotToUse: 'If you are not using Tailwind CSS.',
    filesCreated: ['components.json', 'src/lib/utils.ts'],
    filesModified: ['package.json', 'tailwind.config.js'],
    runtimeDependencies: ['lucide-react', 'clsx', 'tailwind-merge'],
    devDependencies: [],
    requirements: ['Tailwind CSS must be installed'],
    risks: [],
    nextSteps: ['Run "npx shadcn-ui@latest add button" to add your first component'],
    riskLevel: 'low',
    recommendedLevel: 'intermediate',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    // components.json
    const componentsJson = {
        "$schema": "https://ui.shadcn.com/schema.json",
        "style": "default",
        "rsc": false,
        "tsx": true,
        "tailwind": {
            "config": "tailwind.config.js",
            "css": "src/index.css",
            "baseColor": "slate",
            "cssVariables": true
        },
        "aliases": {
            "components": "@/components",
            "utils": "@/lib/utils"
        }
    };
    const r1 = patchJson(path.join(cwd, 'components.json'), componentsJson, { dryRun });
    if (r1 === 'created' || r1 === 'modified')
        result.created.push('components.json');
    // lib/utils.ts
    const utilsTs = `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;
    const r2 = writeFileSafe(path.join(cwd, 'src/lib/utils.ts'), utilsTs, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('src/lib/utils.ts');
    // package.json
    const r3 = patchPackageJson(cwd, {
        dependencies: {
            "lucide-react": "^0.344.0",
            "clsx": "^2.1.0",
            "tailwind-merge": "^2.2.1"
        }
    }, { dryRun });
    if (r3 === 'modified')
        result.modified.push('package.json');
    return result;
}
export const shadcnModule = { meta, execute };
//# sourceMappingURL=index.js.map