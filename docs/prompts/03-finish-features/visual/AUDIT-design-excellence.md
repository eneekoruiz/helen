---
action: AUDIT
phase: 03-finish-features
summary: The canonical design audit, from product-solid to Awwwards level: art direction, hierarchy, type, imagery, states, craft and conversion.
modifies_code: false
aliases:
  - audit-40k-creative-direction-and-conversion
  - audit-product-design-and-awards-visual-excellence
  - audit-awwwards-soty-design-review-flow
  - audit-visual-quality-40k
---

# Design Excellence Audit

## Goal

Judge design quality at the right ambition level and name the fewest changes that create the largest improvement in perceived quality, from a solid product up to Awwwards / Site of the Year standard.

## Use when

- Before presenting to a high-ticket client, publishing a premium site, or when the site is pretty but generic.
- At the end of the project as a final visual QA, including 3D (camera, lights, materials).

## Requirements

First state the ambition level (infer and say so if not given): **product-solid** (clear, usable, trustworthy), **premium** (refined, intentional, memorable), **awards-level** (concept, art direction, interaction, originality, craft).

1. **Fit:** does the visual system match the category, audience, maturity and ambition? Where does it over- or under-perform?
2. **Layout and hierarchy:** composition, grid, spacing, density, alignment, rhythm, scanning; crowded, template-like or weak sections.
3. **Typography and content:** type scale, line length, weight, contrast, headings, microcopy, responsive text.
4. **Color, imagery, icons, brand:** palette, image quality, icon consistency, recognizability, emotional tone; stock-like visuals, weak screenshots, decorative clutter.
5. **Interaction and states:** hover, focus, pressed, loading, empty, error, success, disabled, destructive, transitions.
6. **Technical craft:** mobile to wide desktop, asset quality, perceived performance, smooth animation, layout stability. For 3D: camera, lens, framing, lights, shadows, materials, shaders, postprocessing, fallback.
7. **Conversion:** clear offer, CTAs, objections handled, proof and trust close to the action.
8. **Anti-template:** own concept, generic claims, template layouts, obvious iconography, gratuitous animation (see `audit-ai-trace-erasure-and-human-craft`).
9. **Awards-level only:** first impression, originality, storytelling, scroll choreography, detail density, restraint, memorability, concept strength.

## Beyond the checklist

Be brutally specific: not "improve visuals" but which section betrays the level, why, and which prompt fixes it. Separate creative ambition from usability: an effect that hurts clarity, accessibility, conversion or performance is not an improvement. Prefer parameter-level fixes (camera, light, spacing, copy, motion) over redesigns.

## Limits

- Audit only: do not modify files.
- No full identity change, new design system, animation library or framework without strong justification; never hide weak substance behind decoration.

## Output

1. Ambition level and verdict: `PRODUCT-SOLID`, `PREMIUM-READY`, `STRONG BUT NOT AWARDS-LEVEL` or `DESIGN HOLD`.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. Include the file or area for each.
3. Highest-leverage improvements; changes safe to apply now versus those needing creative approval.
4. Recommended prompts to run next, in order.
