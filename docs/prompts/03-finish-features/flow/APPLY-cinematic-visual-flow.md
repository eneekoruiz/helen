---
action: APPLY
phase: 03-finish-features
summary: Flow: turn a working site into a cinematic, award-level experience (taste, motion, scroll, 3D, shaders, mockups) within a performance budget.
modifies_code: true
repeatable: true
stage: polish
aliases:
  - apply-40k-visual-craft-flow
  - apply-cinematic-and-3d-visual-conversion
---

# Cinematic Visual Flow

## Goal

Sequence the high-end visual work (taste, interactive blocks, motion, scroll, view transitions, editorial type, shaders, 3D and mockups) so the site reaches award-level craft with stable FPS, zero AI traces and intact functionality.

## Use when

- The layout and functional flows are validated and the brand needs a premium, immersive finish (launch, portfolio, demo, high-ticket client).

## Skip when

- Core logic or data flows still have bugs, or motion would hurt accessibility or clarity.

## Steps

Run only the steps the project needs; skip the rest with a reason.

1. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).
2. [enhance-taste-and-art-direction](../visual/ENHANCE-taste-and-art-direction.md): tokens and visual point of view.
3. [generate-premium-web-artifacts](../visual/GENERATE-premium-web-artifacts.md) and [generate-component-library-integration](../visual/GENERATE-component-library-integration.md).
4. [enhance-motion-polish-and-transitions](../motion/ENHANCE-motion-polish-and-transitions.md).
5. [generate-scroll-driven-sequences](../motion/GENERATE-scroll-driven-sequences.md) and [enhance-view-transitions](../motion/ENHANCE-view-transitions.md).
6. [enhance-editorial-typography](../graphics/ENHANCE-editorial-typography.md).
7. [generate-shader-experience](../graphics/GENERATE-shader-experience.md), or [generate-3d-foundation](../3d/GENERATE-3d-foundation.md) with [generate-3d-experience-component](../3d/GENERATE-3d-experience-component.md), and [generate-premium-mockups](../visual/GENERATE-premium-mockups.md).
8. [enhance-microinteraction-sensory-detail-pass](../visual/ENHANCE-microinteraction-sensory-detail-pass.md).
9. [audit-motion-and-3d-performance](../performance/AUDIT-motion-and-3d-performance.md), then [audit-visual-ux-regression-checkpoint](AUDIT-visual-ux-regression-checkpoint.md).

Rules for every step: ornamental layers use `pointer-events: none` and never cover inputs, links or buttons; event handlers and API calls behave exactly as before; heavy loops start lazily after first paint; animate only `transform` and `opacity`; `prefers-reduced-motion` gives an elegant static version.

## Stop when

- Responsive breaks critically, FPS stays below 50, or the target hardware cannot run the chosen technique (e.g. WebGPU without fallback).

## Limits

- Do not change semantic HTML that affects indexing; no aggressive scroll-jacking; no heavy library when CSS or light canvas is enough.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also list the techniques used and the final performance numbers.
