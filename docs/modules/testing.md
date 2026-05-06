# Testing Setup (testing)

Vitest + Testing Library + jsdom + example test

## Category
Testing

## Description
Sets up Vitest as the test runner with jsdom environment, React Testing Library, and a sample test file to get started immediately.

## Problem it Solves
Projects without a test setup rarely add tests later. This module removes the setup friction entirely.

## Usage Information
- **Risk Level**: low
- **Recommended Skill Level**: beginner

### When to Use
Always. Tests are not optional in serious projects.

### When NOT to Use
If you already have a working test setup with Jest or Vitest.

## Technical Details

### Files Created
- vitest.config.ts
- src/test/setup.ts
- src/test/example.test.ts

### Files Modified
- package.json

### Dependencies
- **Runtime**: None
- **Dev**: vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom

### Requirements
- React project
- TypeScript recommended

## Risks & Warnings
- May conflict with existing vitest.config.ts

## Post-Installation Steps
- Run npm run test to verify setup
- Write your first real test
