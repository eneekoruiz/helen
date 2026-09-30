---
name: helen-onboarding
description: Use when joining an existing codebase or onboarding a new developer or AI agent - explains architecture, runbooks, dev commands, environment setup, and where to start in 10 minutes.
version: 2.1.0
---

# Codebase Onboarding & Architectural Overview

Accelerate developer and AI onboarding into this repository in 10 minutes.

## Onboarding Checklist

1. **Stack & Tooling**: Identify package manager, framework, language version, and key dependencies.
2. **Local Environment**: Check required Node.js version, environment variable template (`.env.example`), and local database/service setup.
3. **Common Commands**:
   - Install dependencies: package manager install command.
   - Run dev server: `npm run dev` or equivalent.
   - Run checks: `npm run typecheck`, `npm run lint`, `npm test`.
4. **Key Directories & Entry Points**:
   - `src/`: Core logic and domain modules.
   - `docs/`: Architectural decision records and guides.
   - `tests/`: Automated unit and integration test suites.
5. **Architectural Guidelines**: Read `AGENTS.md` and `.agents/rules/` for design and security constraints.
