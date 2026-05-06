import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import { getTemplatePath } from '../../core/templateResolver.js';
import path from 'node:path';
import fs from 'fs-extra';
const meta = {
    id: 'testing',
    name: 'Testing Setup',
    category: 'Testing',
    summary: 'Vitest + Testing Library + jsdom + example test',
    description: 'Sets up Vitest as the test runner with jsdom environment, React Testing Library, and a sample test file to get started immediately.',
    problemItSolves: 'Projects without a test setup rarely add tests later. This module removes the setup friction entirely.',
    whenToUse: 'Always. Tests are not optional in serious projects.',
    whenNotToUse: 'If you already have a working test setup with Jest or Vitest.',
    filesCreated: ['vitest.config.ts', 'src/test/setup.ts', 'src/test/example.test.ts'],
    filesModified: ['package.json'],
    runtimeDependencies: [],
    devDependencies: ['vitest', '@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event', 'jsdom'],
    requirements: ['React project', 'TypeScript recommended'],
    risks: ['May conflict with existing vitest.config.ts'],
    nextSteps: ['Run npm run test to verify setup', 'Write your first real test'],
    riskLevel: 'low',
    recommendedLevel: 'beginner',
    status: 'stable',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    // vitest.config.ts from template
    const vitestTemplatePath = getTemplatePath('testing/vitest.config.ts');
    let vitestContent;
    if (fs.existsSync(vitestTemplatePath)) {
        vitestContent = fs.readFileSync(vitestTemplatePath, 'utf-8');
    }
    else {
        vitestContent = `/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
    },
  },
});
`;
    }
    const r1 = writeFileSafe(path.join(cwd, 'vitest.config.ts'), vitestContent, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('vitest.config.ts');
    else
        result.skipped.push('vitest.config.ts');
    // Test setup file
    const setupContent = `import '@testing-library/jest-dom';

// Mock matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});
`;
    const r2 = writeFileSafe(path.join(cwd, 'src/test/setup.ts'), setupContent, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('src/test/setup.ts');
    else
        result.skipped.push('src/test/setup.ts');
    // Example test
    const exampleTest = `import { describe, it, expect } from 'vitest';

describe('Example test suite', () => {
  it('should pass basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('hell');
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
`;
    const r3 = writeFileSafe(path.join(cwd, 'src/test/example.test.ts'), exampleTest, { dryRun, force });
    if (r3 === 'created' || r3 === 'overwritten')
        result.created.push('src/test/example.test.ts');
    else
        result.skipped.push('src/test/example.test.ts');
    // Patch package.json
    const patchResult = patchPackageJson(cwd, {
        scripts: {
            test: 'vitest run',
            'test:watch': 'vitest',
            'test:coverage': 'vitest run --coverage',
        },
    }, { dryRun });
    if (patchResult === 'modified')
        result.modified.push('package.json');
    result.nextSteps.push('Run npm run test to verify');
    result.nextSteps.push('Write your first component test');
    return result;
}
export const testingModule = { meta, execute };
//# sourceMappingURL=index.js.map