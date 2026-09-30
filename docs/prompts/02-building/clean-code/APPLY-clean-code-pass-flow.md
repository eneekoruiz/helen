---
action: APPLY
phase: 02-building
summary: Flow: simplify code safely (zero dead code, less duplication, clearer names) without changing behavior, gated by build, lint and tests.
modifies_code: true
repeatable: true
stage: hardening
aliases:
  - apply-safe-clean-code-simplification-pass
---

# Clean Code Pass Flow

## Goal

Reduce complexity, duplication and technical risk without changing behavior. Dead code removal is the top priority.

## Use when

- The code works but feels fragile, after a quick audit, or before hardening or a release candidate.

## Skip when

- The project does not build: run the quality gates and fix that first.
- The change would be a large aesthetic refactor with no clear value.

## Steps

1. [audit-quality-gates-checkpoint](../checkpoint/AUDIT-quality-gates-checkpoint.md): start from a passing build.
2. **Zero dead code:** remove unused variables, imports, functions, classes, components and files. Confirm they are unused (search references, exports, dynamic usage) before deleting.
3. Review responsibilities, naming, duplication, coupling, silent error handling and abstractions; apply small, safe changes only.
4. Simplify for lower cognitive load: delete code, merge helpers, clarify boundaries, remove magic conventions, make the correct path obvious.
5. [audit-quality-gates-checkpoint](../checkpoint/AUDIT-quality-gates-checkpoint.md) again: lint, types and tests must pass.

## Stop when

- A simplification needs an architectural redesign: stop and propose it separately (see `audit-code-quality`).
- Tests or typecheck fail and the cause is not in your change.

## Limits

- Keep existing behavior. Do not change public APIs or contracts without justification and confirmation.
- No mass refactors or directory restructures.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
