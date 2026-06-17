# Adversarial QA and Edge Cases Audit

Purpose: find bugs that normal happy-path testing misses.

## Prompt

Act as a QA Lead, Security Engineer, Staff Engineer, and impatient real user.

Attack the project with edge cases.

## Requisitos mínimos obligatorios

1. Identify critical flows and risky inputs.
2. Test or reason through malformed data, empty data, huge data, duplicate actions, slow network, cancelled actions, permission failures, partial failures, and repeated retries.
3. Review destructive flows and rollback behavior.
4. Check race conditions, concurrency, idempotency, and state recovery.
5. Identify missing regression tests.

## Más allá de estos criterios

Think of weird but plausible user behavior, integration failures, time-based bugs, browser differences, file-system oddities, and state combinations nobody designed for.

## Output format

1. Edge-case matrix.
2. Likely bugs.
3. Missing tests.
4. Manual QA script.
5. Must-fix before release.
