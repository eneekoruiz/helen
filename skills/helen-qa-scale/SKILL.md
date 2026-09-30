---
name: helen-qa-scale
description: Use before production to stress a project - adversarial QA and edge cases, scaling limits and cost drivers, and observability (logs, errors, metrics, alerts). Finds what breaks under bad input, load, retries, and partial failure. Also use when asked what could break, how a feature behaves at scale, or how to monitor it.
---

# QA, Scale and Observability

## Adversarial QA

1. Identify critical flows and risky inputs.
2. Test or reason through malformed, empty, and huge data; duplicate actions; slow network; cancelled actions; permission failures; partial failures; repeated retries.
3. Review destructive flows and rollback behavior.
4. Check race conditions, concurrency, idempotency, and state recovery.
5. List missing regression tests.

## Scale and cost

1. Identify scaling dimensions: users, records, files, requests, builds, integrations, locales.
2. Find bottlenecks: unbounded loops, synchronous work, repeated parsing, large assets, expensive queries, N+1 patterns.
3. Review caching, batching, pagination, quotas, rate limits, backpressure.
4. Estimate third-party cost drivers. Prefer simple mitigations before architecture.

## Observability

1. Review logs, errors, metrics, traces, alerts, health checks, audit trails.
2. Failures must be visible at the right level of detail; remove noise and add missing context.
3. Check sensitive data leakage in logs (secrets, PII). Alerts need an owner.

## Output

Findings grouped as Critical / Important / Optional, each with evidence and a proposed fix. Do not modify code in an audit run.

Prompts: `audit-adversarial-qa-and-edge-cases`, `audit-stress-scale-and-cost`, `audit-observability-instrumentation`.
