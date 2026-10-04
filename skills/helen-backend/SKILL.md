---
name: helen-backend
description: Master skill for designing and reviewing data models, API contracts, JSON responses, error formats, or schema definitions; eliminating impossible states, evaluating breaking changes, ensuring idempotency, and enforcing data migration safety in an autonomous convergence loop.
version: 2.1.0
---

# Data, Schema and API Contracts (Backend Master Skill)

Robust backends eliminate contradictory domain states, enforce runtime validation at boundaries, and verify mutation idempotency. `helen-backend` audits and refactors backend architecture with mathematical rigor.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
## Contract Review Checklist

1. Identify public and internal APIs, CLI contracts, config schemas, webhooks, and third-party integrations.
2. Check request/response shape, runtime schema validation, standard error envelopes, versioning, retries, idempotency keys, rate limits, and timeouts.
3. Review docs, fixtures, tests, mocks, and invariants.
4. Eliminate impossible domain states (e.g. mutually contradictory booleans replaced with discriminated unions).
5. Ensure external integrations fail gracefully with diagnostic error context.

## Data Model & Migrations

- Check domain integrity, unique constraints, field ownership, and foreign key cascades.
- Destructive schema drops require safe two-phase migrations (expand, migrate, contract).
- For editable content, review the editorial workflow and persistence strategy.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected expertise or context savings outweigh transfer, coordination, integration, verification and retries. Flash is optional when available and suitable. Keep shared instructions as a stable prefix and task facts after it; provider caching requires runtime support and measured cache hits. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.
