---
action: ENHANCE
phase: 03-finish-features
summary: Refine an existing 3D scene (framing, lights, materials, timing, performance, fallback) without breaking its API or integration.
modifies_code: true
aliases:
  - enhance-3d-premium-scene-polish
---

# 3D Scene Polish

## Goal

Make a working 3D scene look directed by someone with taste: precise surgery on what exists, not a rewrite.

## Use when

- A scene works but does not feel premium, or has framing, interaction, performance or responsive problems.
- Before the final visual audit.

## Requirements

Inputs: scene files, perceived problems, visual goal, compatibility constraints.

1. Read the scene and its consumers before editing; keep props, routes, imports and public behavior unless a change is essential.
2. Adjust composition: camera, scale, position, lights, materials, shadows, speed and timing.
3. Reduce jank, unnecessary renders and asset weight.
4. Improve fallback, reduced motion and responsive behavior.
5. Keep copy legible and controls accessible; CTAs and the sales flow must still work.

## Beyond the checklist

Every adjustment needs a visual or commercial reason. Remove effects that were added by accumulation.

## Limits

- Do not rewrite the 3D architecture or add dependencies without a clear need.
- Do not change the commercial message without authorization.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
