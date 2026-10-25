import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import globals from 'globals';

export default [{
  files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.mjs'],
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { ...globals.node, ...globals.es2022 },
  },
  plugins: { '@typescript-eslint': ts },
  rules: {
    ...js.configs.recommended.rules,
    ...ts.configs['eslint-recommended'].overrides[0].rules,
    ...ts.configs.recommended.rules,
    'no-console': 'off',
    // Preserve the existing checks during migration; sanitized errors deliberately omit raw causes.
    'no-useless-assignment': 'off',
    'preserve-caught-error': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}];
