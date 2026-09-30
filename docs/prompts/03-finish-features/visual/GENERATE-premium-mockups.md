---
action: GENERATE
phase: 03-finish-features
summary: Present products, apps and case studies inside premium device mockups and layouts (CSS/SVG or light 3D) that build desire without hurting speed.
modifies_code: true
aliases:
  - generate-integrated-premium-mockups
  - generate-premium-mockup-layout-system
---

# Premium Mockups

## Goal

Package screenshots, videos, demos and deliverables inside high-end mockups integrated into the layout, so visitors feel the product exists, has weight and deserves a conversation.

## Use when

- Selling software, apps, dashboards, portfolios, identity, packaging or creative services.
- Heroes, case studies, social proof, comparisons and feature sections.

## Requirements

1. **Audit the material:** screenshots, renders, photos, logos, UI states, before/after, video; quality, resolution and license.
2. **Mockup type:** vector mockups in CSS or SVG (device frames with exact rounded corners) or light WebGL 3D where the screen is a real interactive texture (video or live component). Avoid heavy static PNG device photos.
3. **Composition:** hero mockup, detail mockups, case-study composition and responsive variants; depth with realistic shadows, subtle reflections, masks and perspective.
4. **Interaction:** subtle tilt on pointer move (CSS `perspective` with `--rx`/`--ry` variables updated in JS) and a hint of simulated light; disabled with reduced motion and on touch.
5. **Performance:** `picture` with AVIF/WebP, lazy loading, fixed dimensions, useful alt text; 3D mockups compressed below about 500 KB with screen textures at most 1080p.

## Beyond the checklist

Build tangible desire with restraint: fewer, better mockups beat saturated compositions.

## Limits

- No premium mockup assets without a license (e.g. ls.graphics).
- Never replace real evidence with misleading renders.
- Legibility and conversion come before composition.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
