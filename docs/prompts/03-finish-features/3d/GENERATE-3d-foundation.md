---
action: GENERATE
phase: 03-finish-features
summary: Choose Spline or React Three Fiber and build the reusable 3D foundation: canvas, loading, fallbacks and performance rules.
modifies_code: true
aliases:
  - generate-3d-global-canvas-setup
  - generate-3d-react-fiber-premium-architecture
  - generate-3d-spline-vs-react-three-fiber
  - generate-spline-rapid-interactive-embed
---

# 3D Foundation (Spline or React Three Fiber)

## Goal

Make the right 3D architecture decision and build the global base that every scene will use: canvas or embed, loading, camera and lights, fallbacks and performance rules. No business scenes here.

## Use when

- Before adding hero scenes, carousels, product showcases or configurators, and no stable 3D base exists.
- The project needs a high-budget visual presence that 3D can actually justify.

## Requirements

Inputs: stack, visual goal, priority devices, performance budget.

1. **Decide and justify** with this matrix:

   | | Spline (`@splinetool/react-spline`) | React Three Fiber (`three`, `@react-three/fiber`, Drei) |
   |---|---|---|
   | Delivery speed | High: designed in a visual editor | Medium: scenes built in code |
   | Bundle weight | Heavier runtime | Tree-shakable, optimizable |
   | Shaders | Built-in materials only | Fully programmable (uniforms, custom shaders, WebGPU) |
   | Node access | Limited (object names) | Full (refs, hooks, physics) |

   Spline for fast, bounded brand pieces; R3F for configurators, persistent scenes, product logic, custom shaders or state. Document when a Spline scene should migrate to R3F.
2. **Foundation:** reusable canvas/provider with adaptive DPR, resize, suspense, cleanup, error boundary; isolated loaders, camera rig, environment and lights, render config; `frameloop="demand"` when possible.
3. **Loading:** lazy-load the runtime (`React.lazy` or dynamic import), premium loader, static poster.
4. **Fallbacks** for mobile, `prefers-reduced-motion`, slow devices and WebGL failure.
5. **Performance rules:** texture budgets, instancing for repeated meshes, compression, postprocessing limits, pause when off-screen. Performance budget and graceful degradation: `audit-motion-and-3d-performance`.
6. Verify: desktop and mobile captures, canvas never blank, no hydration errors, CTAs and navigation remain usable.

## Beyond the checklist

Premium means stable and well composed, not resource-hungry. If 3D does not help people decide, understand or remember, propose a lighter alternative.

## Limits

- Read the frontend architecture before adding dependencies.
- No heavy assets without a loading strategy; never block interaction, forms, navigation or accessibility.
- No critical business logic inside meshes or Spline scenes.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also state the decision (Spline or R3F) and why, the usage API for scenes, the fallbacks and the budget.
