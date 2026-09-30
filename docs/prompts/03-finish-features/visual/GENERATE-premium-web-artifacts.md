---
action: GENERATE
phase: 03-finish-features
summary: Build production-ready interactive blocks (pricing table, feature selector, bento grid) in React and Tailwind with realistic content.
modifies_code: true
---

# Premium Web Artifacts

## Goal

Build isolated, production-ready interactive blocks that support conversion.

## Use when

- The page needs an interactive pricing table, a feature selector or a bento grid.

## Requirements

Pick the block the page needs:

- **Pricing table:** smooth monthly/yearly toggle, subtle highlight of the recommended plan, CTA with loading state and clear hover.
- **Feature selector:** tabs whose content changes with short opacity and offset transitions; an active indicator that moves physically (position and width).
- **Bento grid:** asymmetric grid with per-cell hover (subtle content shift, extra controls, shadow change).

1. Realistic content for the niche; no lorem ipsum or generic text. Prices and plans come from the user; use clear placeholders if missing.
2. Typed props (TypeScript interfaces) and controlled components.
3. Mobile-first: blocks stack gracefully on small screens.
4. Keyboard accessible tabs and toggles with correct roles; reduced motion respected.
5. Memoize only where profiling or obvious hot paths justify it.

## Limits

- No invented prices, plans or features; integrate with existing tokens and components.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
