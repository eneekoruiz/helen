# Code Quality (quality)

ESLint + Prettier + TypeScript strict mode + scripts

## Category
Quality

## Description
Sets up ESLint with TypeScript plugin, Prettier for auto-formatting, and a strict tsconfig. Adds lint, format, and typecheck scripts to package.json.

## Problem it Solves
Without consistent linting and formatting, codebases accumulate inconsistencies, bugs slip through, and PRs become harder to review.

## Usage Information
- **Risk Level**: low
- **Recommended Skill Level**: beginner

### When to Use
On every new project. This is foundational.

### When NOT to Use
If you already have a fully configured ESLint + Prettier setup you are happy with.

## Technical Details

### Files Created
- .eslintrc.json
- .prettierrc
- .prettierignore

### Files Modified
- package.json

### Dependencies
- **Runtime**: None
- **Dev**: eslint, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, prettier, eslint-config-prettier

### Requirements
- Node.js >= 18
- TypeScript project recommended

## Risks & Warnings
- May conflict with existing ESLint config

## Post-Installation Steps
- Run npm run lint to check
- Run npm run format to auto-fix
