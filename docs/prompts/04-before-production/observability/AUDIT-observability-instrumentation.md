---
action: AUDIT
phase: 04-before-production
summary: Check that failures and key behavior are visible, actionable and not noisy: logs, errors, metrics, alerts, health checks, PII in logs.
modifies_code: false
---

# Observability Audit

## Goal

Make sure that when a user reports a problem, the team can reconstruct what happened quickly without guessing.

## Use when

- Before production, and after incidents that were hard to debug.

## Requirements

1. Review logs, errors, metrics, traces, alerts, dashboards, health checks and audit trails that exist.
2. Failures are visible at the right level of detail, with enough context (request id, user action, version).
3. Missing context and excessive noise.
4. Sensitive data in logs (secrets, PII).
5. Alerts are useful and have an owner.

## Beyond the checklist

Prefer lightweight observability (structured logs, error boundaries, an error-tracking service such as the HELEN `sentry` module) before heavyweight platforms.

## Limits

- Audit only: do not modify files. Never copy real user data into the report.

## Output

1. Current observability map.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Recommended instrumentation and an incident debugging checklist.
