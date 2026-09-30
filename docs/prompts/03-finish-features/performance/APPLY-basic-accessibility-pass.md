---
action: APPLY
phase: 03-finish-features
summary: Find and fix basic accessibility problems: keyboard, focus, contrast, semantics, labels, alt text, touch targets and reduced motion.
modifies_code: true
---

# Basic Accessibility Pass

## Goal

Fix the accessibility problems that block real people before release or a public presentation.

## Use when

- During visual and UX polish, and before publishing a web UI or delivering to a client.

## Skip when

- The project has no user interface or interactive content.

## Requirements

1. Keyboard navigation reaches every interactive element in a sensible order; focus is always visible (a designed focus ring, not the browser default removed).
2. Text contrast at least 4.5:1 (3:1 for large text, 18px bold or more); the main flow never depends only on color or hover.
3. Semantic HTML: landmarks, one `h1` and ordered headings, buttons vs links used correctly.
4. Labelled form fields, descriptive errors linked to their fields, alt text for content images (empty alt for decoration).
5. Touch targets at least 44-48px (or an expanded hit area), with at least 8px between adjacent targets.
6. Basic screen reader support and `prefers-reduced-motion` respected.

## Beyond the checklist

Accessibility as product quality: clear error text, predictable interfaces, easy recovery, plain language. The external `web-design-guidelines` skill adds 100+ rules (`helen skills external web-design-guidelines`).

## Limits

- No wrong or redundant ARIA to look accessible ("aria theater"); native semantics first.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
