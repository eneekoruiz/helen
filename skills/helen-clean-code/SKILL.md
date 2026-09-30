---
name: helen-clean-code
description: Use when refactoring, simplifying, or reviewing code for maintainability - removing dead code, duplication, silent errors, and unclear names without changing behavior. Applies to a working codebase before hardening or a release candidate.
---

# Clean Code Pass

Reduce complexity, duplication, and technical risk **without changing behavior**.

## When to use

- After a quick audit, before hardening or a release candidate.
- The code works but feels fragile.

## When NOT to use

- The project does not build or compile yet: fix that first.
- Large aesthetic refactors with no clear value.

## Minimum criteria

1. **Zero dead code (high priority).** Remove unused variables, imports, functions, classes, components, and files. Confirm they are unused (search references, check exports and dynamic usage) before deleting.
2. Review responsibilities, naming, duplication, coupling, silent error handling, and abstractions.
3. Prefer small, safe changes. Keep existing behavior for every caller: exported names, signatures and return shapes stay the same unless the user agrees to change them.

## Beyond the checklist

Look for simplifications that lower cognitive load: delete code, merge helpers, clarify boundaries, remove magic conventions, and make the correct path the obvious one. Propose larger improvements (newer tech, better approaches) instead of applying them unasked.

## Safety limits

- Do not change public APIs or contracts without a stated justification.
- No sweeping refactors.
- If context needed to decide is missing, stop and ask.

## Final checks

- Run build/typecheck and lint if the project has them.
- Run the relevant tests if they exist.

## Delivery format

Keep the report minimal:

```text
Done. / Changes applied with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions needed:
- None. / specific actions (e.g. run the build, set a variable)
```

Do not write long reports or theory.
