---
action: APPLY
phase: 03-finish-features
summary: Flow: lift a working project to a clearly more refined level in UX, visuals, responsive, accessibility, clean code and performance.
modifies_code: true
repeatable: true
stage: polish
aliases:
  - apply-ux-visual-pass-flow
---

# Full Polish Flow

## Goal

Take a functional project to a clearly more refined level across UX, visuals, responsive behavior, accessibility, code and performance, without turning it into the final release.

## Use when

- Features are finished and production testing or final hardening has not started.
- For a lighter UX and visual pass only, run steps 2-6.

## Steps

1. [audit-project-risk-and-architecture](../../01-start-project/audit/AUDIT-project-risk-and-architecture.md) (quick scan): choose where effort goes.
2. [audit-product-ux](../ux/AUDIT-product-ux.md).
3. [apply-empty-states-errors-and-microcopy](../ux/APPLY-empty-states-errors-and-microcopy.md).
4. [apply-premium-visual-polish](../visual/APPLY-premium-visual-polish.md).
5. [apply-responsive-pass](../visual/APPLY-responsive-pass.md).
6. [apply-basic-accessibility-pass](../performance/APPLY-basic-accessibility-pass.md), then [audit-visual-ux-regression-checkpoint](AUDIT-visual-ux-regression-checkpoint.md).
7. [apply-clean-code-pass-flow](../../02-building/clean-code/APPLY-clean-code-pass-flow.md).
8. [apply-basic-performance-pass](../performance/APPLY-basic-performance-pass.md).
9. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).

## Stop when

- Lint, build or tests fail and cannot be recovered quickly.
- A UX or visual finding requires rethinking fundamental product decisions: report it instead.

## Limits

- Bounded, safe changes only; the project must keep working after every step.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
