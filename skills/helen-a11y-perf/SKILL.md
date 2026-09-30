---
name: helen-a11y-perf
description: Use for web accessibility (a11y) audits and fixes: form accessibility, semantic HTML over redundant ARIA attributes, keyboard navigation, focus states, color contrast, and alt text; AND for frontend web performance optimization: large assets and hero images, oversized JavaScript bundles (lodash, moment), repeated API requests, slow page loads, Core Web Vitals (LCP, CLS), and Lighthouse audits.
version: 2.1.0
---

# Accessibility and Performance Pass

Fix basic, high-impact accessibility and performance problems. Evidence over guesswork.

## Accessibility

Minimum checks:

- Keyboard navigation reaches every interactive element in a sensible order; focus is always visible.
- Color contrast is sufficient; the main flow does not depend only on color or hover.
- Semantic HTML (landmarks, headings in order, buttons vs links), labelled form fields, alt text for content images.
- Basic screen reader support; respects `prefers-reduced-motion`.

Beyond the checklist: clear error text, predictable interfaces, easy error recovery, plain language.

Limit: do not add wrong or redundant ARIA just to look accessible ("aria theater"). Native semantics first.

## Performance

Minimum checks:

- Asset and bundle sizes, unnecessary network calls, redundant re-renders, inefficient loops, blocking synchronous work on the main thread, initial load time.
- Prefer the smallest change that improves perceived speed: loading placeholders, lazy-loaded images, paginated data.

Limits: no premature micro-optimization without profiling evidence; no complex caching, debounce, or memoization without understanding its lifecycle; never trade correctness for milliseconds.

For animation-heavy or 3D sites, define a performance budget first (frame rate, JS weight, LCP) and verify against it.

## Delivery format (minimal)

```text
Improvements applied. / Completed with warnings.

Changes applied:
- 1-3 bullets

Manual actions needed:
- None. / specific actions
```
