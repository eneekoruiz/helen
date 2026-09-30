---
action: APPLY
phase: 03-finish-features
summary: Fix the visual details that make a product look less premium or unfinished: hierarchy, spacing, type, contrast, icons, states, consistency.
modifies_code: true
aliases:
  - apply-premium-detail-pass
  - apply-premium-visual-polish-pass
---

# Premium Visual Polish

## Goal

Find and fix the small visual details that make a product feel less mature than it is. Premium does not mean decorative: it means no accidental roughness.

## Use when

- Basic UX works, and screenshots, a demo, a portfolio piece or a public release are coming.

## Skip when

- The main flow does not work yet; polish never hides broken behavior.

## Requirements

1. Hierarchy, layout, spacing, alignment, typography, contrast, density, icons and interaction feedback.
2. No overlap, overflow, clipped text or confusing hierarchy.
3. Consistency across screens and components: same component, same look and behavior.
4. First impressions: naming, tone, screenshots, empty states, CLI output or docs where relevant.
5. Inconsistent defaults, rough edges, awkward copy and generic visuals fixed directly.

## Beyond the checklist

Rhythm, restraint, calm, precision, coherence: would a first-rate team let this pass? Every visible decision should feel intentional.

## Limits

- Do not change the whole visual identity without confirmation; no unnecessary visual libraries.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
