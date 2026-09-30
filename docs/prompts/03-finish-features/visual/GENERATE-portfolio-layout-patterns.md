---
action: GENERATE
phase: 03-finish-features
summary: Choose and build a portfolio or showcase layout (sandwich, work-first showcase, sticky split) that shows craft without noise.
modifies_code: true
---

# Portfolio and Showcase Layout Patterns

## Goal

Pick and build a portfolio or showcase layout that conveys craft without noise and belongs to this person or studio, not to a template.

## Use when

- Portfolios, studio pages, case studies and personal landings; when the site works but looks generic.

## Requirements

Reference patterns (starting points, not templates):

- **Sandwich:** large centered name on top, featured work in the middle (cards slightly rotated or overlapping), discipline or role below. Instant presence; needs excellent images.
- **Showcase (work first):** no fluff; one short positioning line, then straight to a row or grid of projects (horizontal scroll works well).
- **Sticky split:** fixed left column with name, role, short about and links; scrolling project grid on the right. Premium feel and clear hierarchy; collapses to one column with a compact header on mobile.

1. Choose by the real material: number and strength of projects, brand tone, goal (hiring, selling, prestige). Explain the choice.
2. Define hierarchy, vertical rhythm, typography and responsive behavior.
3. Build with the project's design system (`DESIGN.md` when present) and reusable components.
4. Subtle motion with a function; respect `prefers-reduced-motion`.
5. Real content only: no invented names, logos or clients.

## Beyond the checklist

Add one authorship detail (a typographic gesture, a transition, a considered project order) a competitor cannot copy as is.

## Limits

- Never reproduce a specific site's design or text: extract layout principles.
- No effect that costs performance or accessibility.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
