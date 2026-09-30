---
name: helen-knowledge
description: Use to preserve project knowledge and reduce bus factor - decision logs (ADRs), AI context files, runbooks, ownership of accounts and deployment, onboarding for future developers.
---

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
