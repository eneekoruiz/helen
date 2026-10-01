---
name: helen-backend
description: Master skill for designing and reviewing data models, API contracts, JSON responses, error formats, or schema definitions; eliminating impossible states, evaluating breaking changes, ensuring idempotency, and enforcing data migration safety in an autonomous convergence loop.
version: 2.1.0
---

# Data, Schema and API Contracts (Backend Master Skill)

Robust backends eliminate contradictory domain states, enforce runtime validation at boundaries, and guarantee idempotent mutations. `helen-backend` audits and refactors backend architecture with mathematical rigor.

## Operating Principles

### 1. Interactive Scoping Questionnaire
Before mutating API endpoints or data models, clarify trade-offs via a structured questionnaire:
- **Breaking Changes**: Zero tolerance (strict backwards compatibility with deprecation headers) vs. version bump permitted?
- **Migration & Persistence**: Are migrations transactional with rollback scripts, or stateless prototyping?
- **Clean Code vs. Fast Patch**: Refactor underlying service architecture or apply a surgical schema patch?

### 2. Autonomous Convergence Loop
Once contract boundaries are defined:
**Schema Audit → Type & Runtime Validation (Zod/Valibot) → Idempotency Verification → Regression Testing → Repeat**
Iterate autonomously until all endpoints and database models pass contract tests with zero defects.

### 3. Specialized Subagents
- **Contract & Schema Subagent**: Inspects serialization, nullability, enum exhaustiveness, and OpenAPI spec parity.
- **Migration & Concurrency Subagent**: Analyzes race conditions, N+1 query patterns, and double-submit transaction safety.

### 4. Extreme Token Economy
Communicate purely through TypeScript interfaces, Zod schemas, HTTP status matrices, and reproducible curl/fetch snippets. Zero fluff.

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