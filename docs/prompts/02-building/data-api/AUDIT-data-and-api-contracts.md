---
action: AUDIT
phase: 02-building
summary: Audit the data model and every contract (APIs, schemas, webhooks, CLI, integrations) for invariants, drift and breaking-change risk.
modifies_code: false
aliases:
  - audit-api-integration-and-contract
  - audit-data-model-and-domain-integrity
---

# Data Model and API Contracts Audit

## Goal

Find weak domain modeling, invalid states, schema drift and fragile contracts before they become expensive to change.

## Use when

- Before exposing an API or integration, before large data changes, or when bugs point to inconsistent data.

## Requirements

1. **Inventory:** core entities, schemas, config objects, persisted and cached data, generated artifacts, external data shapes; public and internal APIs, CLI contracts, config schemas, file formats, webhooks, SDK and plugin surfaces, third-party integrations.
2. **Integrity:** invariants, validation, defaults, nullability, ownership, lifecycle, migrations, serialization. Where can invalid states be represented? Is one concept modeled under several names or shapes?
3. **Contracts:** request/response shape, validation, error taxonomy, versioning, compatibility, retries, idempotency, rate limits, timeouts, authentication.
4. **Evidence:** docs, examples, fixtures, tests and mocks around schema boundaries and transformations.
5. **Risk:** breaking changes, undocumented behavior, integrations that fail unsafely or without clear diagnostics.

## Beyond the checklist

Look for names that lie, structures that force awkward code, missing single source of truth, implicit migrations, magic defaults and APIs that are easy to misuse. Prefer smaller stable contracts and simplification before abstraction.

## Limits

- Audit only: do not modify files or run migrations.

## Output

1. Domain and contract map.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Drift, duplication, migration and compatibility risks; documentation and test gaps.
4. Verdict: `SOUND`, `DRIFT RISK` or `INTEGRITY RISK`.
