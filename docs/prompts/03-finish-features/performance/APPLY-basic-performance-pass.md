---
action: APPLY
phase: 03-finish-features
summary: Find and fix evident, user-visible performance problems: bundle and asset weight, extra requests, re-renders, blocking work, load time.
modifies_code: true
---

# Basic Performance Pass

## Goal

Fix obvious, high-impact performance problems that users or maintainers can feel.

## Use when

- During polish and before a web release.

## Skip when

- It would be premature micro-optimization without profiling data or evidence.

## Requirements

1. Review asset and bundle sizes, unnecessary network calls, redundant re-renders, inefficient loops, synchronous work blocking the main thread and initial load time.
2. Identify bottlenecks visible to the user; measure before and after when tools are available (build output, Lighthouse, DevTools traces).
3. Prefer the smallest change that improves perceived speed: shorter visual wait, friendly loading placeholders, lazy-loaded images, paginated data.
4. Images and video: modern formats, correct sizes, explicit dimensions.

## Limits

- No complex caching, debounce or memoization without need or without understanding its lifecycle.
- Never trade correctness for milliseconds.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
