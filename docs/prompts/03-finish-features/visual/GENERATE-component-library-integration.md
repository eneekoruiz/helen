---
action: GENERATE
phase: 03-finish-features
summary: Integrate premium pre-animated components (Aceternity UI, Magic UI, shadcn/ui, 21st.dev...) re-styled so nobody recognizes the template.
modifies_code: true
aliases:
  - generate-premium-component-library-integration
  - generate-modern-ui-libraries-aceternity-magic-ui
---

# Component Library Integration

## Goal

Speed up premium sections with proven components, then absorb them into the project's own visual language so they look born inside the product.

## Use when

- Bento grids, marquees, interactive cards, testimonials, pricing, navigation, backgrounds, reveals, command palettes, beams, sparkles, animated grids.
- The project already has a visual direction (`DESIGN.md` or tokens) and needs precise execution.

## Requirements

1. **Choose the source:** Aceternity UI, Magic UI, Motion Primitives, Origin UI, shadcn/ui, 21st.dev (`helen skills external 21st-dev`), or native CSS/Motion when enough.
2. **Import atomically:** copy the single component (e.g. TypeScript + Tailwind + Motion) into the local components folder (e.g. `src/components/ui/`) instead of installing a whole library for one effect; install only its real helpers (`clsx`, `tailwind-merge`, `motion`).
3. **Re-style:** replace hardcoded colors with the project's tokens; adapt typography, rhythm, radii, shadows, copy and motion timings to the project's motion tone. Remove demo content and recognizable template traits.
4. **Performance:** cap particles and animated elements; pause or hide animations when off-screen (`IntersectionObserver`).
5. **Verify:** license, keyboard access and semantics, responsive behavior, real dependency cost.

## Beyond the checklist

The test: nobody should recognize the original component at first sight.

## Limits

- Check the license before copying code.
- No large dependencies for a small effect; no components with keyboard traps or broken semantics.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also list each component with its origin and license.
