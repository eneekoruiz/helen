/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  // Vite 8+ uses Oxc instead of esbuild. Older Vitest releases use Vite 5-7,
  // where the esbuild options above provide the same automatic JSX runtime.
  ...{
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: 'react',
      },
    },
  },
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
