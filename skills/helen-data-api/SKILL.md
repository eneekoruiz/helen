---
name: helen-data-api
description: Use when reviewing or designing data models, API contracts, integrations, config schemas, and content models - validation, errors, versioning, idempotency, and breaking-change risk.
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
