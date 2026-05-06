import path from 'node:path';
import { logger } from './logger.js';
import { writeFileSafe } from './fs.js';

export interface GeneratorOptions {
  type: 'component' | 'hook' | 'page' | 'entity';
  name: string;
  cwd: string;
  dryRun?: boolean;
}

/**
 * Generate project entities (components, hooks, etc.) based on templates.
 */
export async function generateEntity(options: GeneratorOptions): Promise<boolean> {
  const { type, name, cwd, dryRun } = options;
  
  // Basic path mapping
  const paths: Record<string, string> = {
    component: 'src/components',
    hook: 'src/hooks',
    page: 'src/pages',
    entity: 'src/domain/entities',
  };

  const targetDir = path.join(cwd, paths[type] || 'src');
  const fileName = `${name}.${type === 'hook' ? 'ts' : 'tsx'}`;
  const filePath = path.join(targetDir, fileName);

  const templates: Record<string, string> = {
    component: `import React from 'react';

export interface ${name}Props {
  children?: React.ReactNode;
}

export function ${name}({ children }: ${name}Props) {
  return (
    <div className="${name.toLowerCase()}">
      {children || '${name} component'}
    </div>
  );
}
`,
    hook: `import { useState, useEffect } from 'react';

export function use${name}() {
  const [value, setValue] = useState(null);

  useEffect(() => {
    // Hook logic
  }, []);

  return { value, setValue };
}
`,
    page: `import React from 'react';

export default function ${name}Page() {
  return (
    <main className="p-8">
      <h1>${name} Page</h1>
    </main>
  );
}
`,
    entity: `export interface ${name} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export function create${name}(data: Partial<${name}>): ${name} {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  } as ${name};
}
`,
  };


  const content = templates[type];
  if (!content) {
    logger.error(`No template found for type: ${type}`);
    return false;
  }

  logger.info(`Generating ${type}: ${name}...`);
  const result = writeFileSafe(filePath, content, { dryRun, vars: { name } });
  
  return result !== 'skipped';
}
