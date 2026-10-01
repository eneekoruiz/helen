---
name: helen-knowledge
description: Master skill for drafting and reviewing Architectural Decision Records (ADRs), writing AI context files (AGENTS.md, CLAUDE.md), operations runbooks, onboarding guides, and mitigating bus factor risks in an autonomous convergence loop.
version: 2.1.0
---

# Knowledge Preservation & Onboarding (Knowledge Master Skill)

Codebases rot when institutional knowledge lives only in developers' heads or ephemeral chat logs. `helen-knowledge` preserves architectural decisions, eliminates bus factor vulnerability, and compiles 10-minute onboarding runbooks.

## Operating Principles

### 1. Interactive Scoping Questionnaire
Before generating documentation packages, clarify the intended audience:
- **Target Consumer**: AI Agents (strict, compact rules in `AGENTS.md`), new human engineers (local setup, dev server, architecture diagrams), or operations/SRE (incident runbooks, rollback steps)?
- **Depth Level**: Minimalist cheatsheet vs. comprehensive architectural decision log?
- **Bus Factor Audit**: Audit ownership of critical services, domains, and credential vaults?

### 2. Autonomous Documentation Convergence Loop
Once scope is selected:
**Inspect Repository → Extract Stack Invariants → Draft ADRs/Runbooks → Verify Reproducibility → Repeat**
Iterate autonomously until documentation reflects 100% of the software's real state, with zero broken setup steps.

### 3. Specialized Subagents
- **Architecture Mapper Subagent**: Scans directory graphs, exports, and dependency trees.
- **Runbook Verification Subagent**: Tests that every setup and test command in documentation actually executes successfully from a clean shell.

### 4. Extreme Token Economy
Keep context files (`AGENTS.md`) ultracompact because they load in every AI session. Output concise Markdown tables, folder trees, and copy-pasteable commands.

## Decision Records (ADR)

One decision per record (Michael Nygard format):
- **Context**: Problem statement and forces at play.
- **Decision**: The architecture or technology chosen and why.
- **Consequences**: Positive outcomes and accepted technical debts.
- **Status**: Proposed, Accepted, Rejected, or Superseded.

## Bus Factor & Ownership

1. Map who owns domains, hosting, databases, repositories, and third-party SaaS accounts.
2. Deployments must not depend on manual steps or secrets stored exclusively on one personal machine.
3. Identify single-maintainer modules lacking automated tests.
4. Name the credential manager holding secrets (never print raw credentials).

## 10-Minute Onboarding Checklist

1. **Stack & Tooling**: Package manager, framework, runtime, and primary engines.
2. **Local Environment**: Required Node.js version, `.env.example`, database seeds.
3. **Common Commands**: Install, dev server, build, lint, typecheck, test.
4. **Key Entry Points**: Core orchestrators, route handlers, data schemas, test fixtures.