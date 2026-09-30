---
name: helen-data-api
description: Use when designing or reviewing data models, API contracts, JSON responses, error formats, or schema definitions; eliminating impossible or contradictory states in models (e.g. status vs boolean flags, invalid dates); evaluating breaking changes (field renames, deprecations, public API versioning, client compatibility); and ensuring idempotency and data migration safety.
---

# Data and API Contracts

## Contract review

1. Identify public and internal APIs, CLI contracts, config schemas, file formats, webhooks, SDK surfaces, plugin interfaces, and third-party integrations.
2. Check request/response shape, validation, errors, versioning, compatibility, retries, idempotency, rate limits, timeouts, and authentication.
3. Review docs, examples, fixtures, tests, mocks, and assumptions.
4. Identify breaking-change risk and undocumented behavior.
5. Integrations must fail safely and be diagnosable.

## Data model

Check domain integrity, constraints, ownership of each field, migration path, and import/export lock-in. For editable content, review the editorial workflow.

## Limits

Do not change public contracts without justification and a migration path (versioning, deprecation window, communication to consumers). Confirm with the contract owner and known consumers before any breaking change, and ask before destructive migrations.

Prompts: `audit-data-and-api-contracts`, `audit-content-model-and-editorial-workflow`.
