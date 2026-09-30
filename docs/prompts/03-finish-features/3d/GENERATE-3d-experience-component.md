---
action: GENERATE
phase: 03-finish-features
summary: Build one isolated 3D scene or showcase on the existing foundation, with an asset pipeline, motion templates and a non-3D fallback.
modifies_code: true
aliases:
  - generate-3d-isolated-experience-component
  - generate-3d-motion-templates
  - generate-motion-template-asset-system
---

# 3D Experience Component

## Goal

Build a concrete, encapsulated 3D piece (hero object, product showcase, carousel, interactive visualization) that raises perceived value and helps sell, without becoming a distraction.

## Use when

- After `generate-3d-foundation`, for a scene tied to a specific sales section.
- The brand needs a recognizable object, symbol or scene that drives composition and storytelling.

## Requirements

Inputs: available 3D foundation, target section, commercial message, assets, responsive constraints.

1. **Meaning first:** define the main object, what advantage it communicates (speed, precision, security, modularity, control, transformation), scale, materials, behavior, mobile version, poster and reduced-motion version.
2. **Asset pipeline:** GLB/GLTF with Draco or Meshopt, KTX2/Basis textures, atlases, LOD, naming, license and attribution. Screen textures at most 1080p (WebP).
3. **Scene:** reuse the existing canvas; clear props, cleanup, bounded state; camera (fov 35-50 for a premium, undistorted look), directional lights plus a low-resolution environment map, subtle depth of field only if it helps focus.
4. **Motion templates:** intro, hover, scroll reveal, state transition, idle motion and CTA response, all driven by one clock in a single render loop (`useFrame(({ clock }) => ...)`), no independent loops.
5. **Hybrid layer:** HTML labels or buttons that follow 3D nodes (Drei `<Html>`) stay legible and clickable.
6. Subtle interaction (hover, drag, focus, scroll) only when it improves understanding or desire.
7. Non-3D fallback and reduced motion; verify CTAs, text and navigation stay usable. Performance budget and graceful degradation: `audit-motion-and-3d-performance`.

## Beyond the checklist

Turn assets into arguments. If the scene does not improve the sales narrative, make it a quieter detail.

## Limits

- Do not duplicate the global setup or put business logic in the scene.
- No unlicensed or unoptimized assets; no huge above-the-fold textures without a poster; never block LCP or first interactions.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also list the tuning parameters (camera, lights, timings) and the responsive checks done.
