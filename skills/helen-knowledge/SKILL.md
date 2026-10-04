---
name: helen-knowledge
description: Master skill for drafting and reviewing Architectural Decision Records (ADRs), writing AI context files (AGENTS.md, CLAUDE.md), operations runbooks, onboarding guides, and mitigating bus factor risks in an autonomous convergence loop.
version: 2.1.0
---

# Knowledge Preservation & Onboarding (Knowledge Master Skill)

Codebases rot when institutional knowledge lives only in developers' heads or ephemeral chat logs. `helen-knowledge` preserves architectural decisions, eliminates bus factor vulnerability, and compiles 10-minute onboarding runbooks.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Start with the cheapest available model when selectable; escalate only for verified failure or unresolved reasoning. State unavailable controls.
- Delegate independent domains to focused specialist agents with exclusive ownership; integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
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