---
name: helen-knowledge
description: Use when drafting or reviewing Architectural Decision Records (ADRs) and trade-off logs; writing AGENTS.md, AI context files, runbooks, or onboarding documentation; or mitigating bus factor and project handover risks (transferring personal credentials, deployment keys, domain ownership, and undocumented deployment scripts before a team member leaves). Use when joining an existing codebase or onboarding a new developer or AI agent - explains architecture, runbooks, dev commands, environment setup, and where to start in 10 minutes.
---


## From helen-knowledge

# Knowledge Preservation

## Decision records (ADR)

One decision per record. Sections: **Context**, **Decision**, **Consequences** (benefits and debts taken), **Status** (Proposed, Accepted, Rejected, Superseded with link to the successor). Use the classic Michael Nygard template.

## Bus factor

1. Map who owns domains, hosting, databases, repositories, and integrated SaaS.
2. Production deployment must not depend on manual steps or passwords living on one person's machine.
3. Find critical modules touched by one developer only, lacking tests or comments.
4. Production credentials must not depend on a person's personal email. Never list raw secrets; only say which manager holds them.

## AI context file

Generate a compact rules file (for example `AGENTS.md` or `CLAUDE.md`) with: stack and style rules, folder map, how to use the HELEN prompts and skills, and operational limits (no destructive major upgrades, never skip test checkpoints). No secrets in it. Keep it short: it is loaded on every session.

## Runbook

Operational steps to deploy, roll back, rotate credentials, and recover.

Prompts: `generate-decision-log`, `audit-bus-factor-and-ownership`, `generate-ai-context`, `generate-operations-runbook`, `audit-developer-onboarding-and-knowledge-gaps`.

## From helen-onboarding

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