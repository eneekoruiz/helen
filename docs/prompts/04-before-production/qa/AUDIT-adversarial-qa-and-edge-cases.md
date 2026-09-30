---
action: AUDIT
phase: 04-before-production
summary: Attack the product with edge cases: malformed, empty and huge data, duplicates, slow network, cancellations, races and partial failures.
modifies_code: false
---

# Adversarial QA and Edge Cases

## Goal

Find the bugs that happy-path testing misses, before users do.

## Use when

- Before production or a release candidate, and after large feature work.

## Requirements

1. Identify critical flows and risky inputs.
2. Test or reason through malformed, empty and huge data; duplicate actions; slow or dropped network; cancelled actions; permission failures; partial failures; repeated retries.
3. Review destructive flows and rollback behavior.
4. Race conditions, concurrency, idempotency and state recovery.
5. Missing regression tests.

## Beyond the checklist

Weird but plausible behavior: double clicks, back button mid-flow, two tabs, time zones and DST, browser differences, file-system oddities, state combinations nobody designed for.

## Limits

- Audit only: do not modify files. Never run destructive tests against production data.

## Output

1. Edge-case matrix.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Missing tests, a manual QA script, and must-fix items before release.
