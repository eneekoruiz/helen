---
action: APPLY
phase: 04-before-production
summary: Flow: harden security, robustness and technical quality before packaging a release candidate.
modifies_code: true
repeatable: true
stage: hardening
---

# Prefinal Hardening Flow

## Goal

Harden security, robustness and technical quality before the code is packaged and marked as a release candidate.

## Use when

- Building and visual polish are done; production is next.

## Steps

1. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).
2. [apply-clean-code-pass-flow](../../02-building/clean-code/APPLY-clean-code-pass-flow.md).
3. [apply-security-hardening-flow](../../02-building/security/APPLY-security-hardening-flow.md), then [audit-security-risk-checkpoint](AUDIT-security-risk-checkpoint.md).
4. [audit-adversarial-qa-and-edge-cases](../qa/AUDIT-adversarial-qa-and-edge-cases.md); fix what blocks release.
5. [apply-basic-performance-pass](../../03-finish-features/performance/APPLY-basic-performance-pass.md) and [apply-basic-accessibility-pass](../../03-finish-features/performance/APPLY-basic-accessibility-pass.md).
6. [apply-empty-states-errors-and-microcopy](../../03-finish-features/ux/APPLY-empty-states-errors-and-microcopy.md).
7. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).

## Stop when

- A critical security risk cannot be fixed within the flow, or a gate fails for reasons outside your changes.

## Limits

- Build and environment setup must succeed after every step; no critical security risk left open.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
