---
action: GENERATE
phase: 03-finish-features
summary: Create a shader-first visual layer (WebGPU with WebGL2 or CSS fallback) with identity, budgeted performance and a static fallback.
modifies_code: true
aliases:
  - generate-webgpu-shader-experience
  - generate-webgpu-shaders
---

# Shader Experience

## Goal

Create a memorable, proprietary visual layer (hero, interactive background, product reveal, editorial loader) with shaders, adapted to the brand, conversion and real device performance.

## Use when

- The project needs an effect that does not look like a template and the target devices can afford a budgeted GPU layer.

## Skip when

- The main content is still unclear, the effect does not help understanding, desire or trust, or the audience mostly uses low-power devices with no viable fallback.

## Requirements

1. **Technique:** native WebGPU (WGSL) first, with a WebGL2 (GLSL ES 3.0) fallback when `navigator.gpu?.requestAdapter()` is unavailable; or Three.js shader material, OGL, regl, canvas 2D or CSS when enough.
2. **Uniforms:** time, smoothed pointer (lerp), scroll, resolution, theme, intensity, reduced-motion flag.
3. **Effects with identity:** product refraction, vector fields, fluid noise (simplex or Perlin), procedural glass, reveal masks, subtle film grain, physical gradients. Avoid the generic tech nebula.
4. **Lifecycle:** lazy load, pause when off-screen (`IntersectionObserver`), `requestAnimationFrame` only while visible, capped DPR, robust resize, free textures, buffers and pipelines on unmount.
5. **Fallback:** a premium static image or CSS gradient; initial state never blank; no overlap with content; SSR and hydration safe.
6. Verify desktop and mobile. Budget: `audit-motion-and-3d-performance`.

## Limits

- Never copy proprietary shader code from galleries or commercial packs.
- No perpetual loops without visibility pause; no hard WebGPU dependency without fallback.
- Never place the effect above forms, menus or CTAs.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also state the technique, fallback and measured cost.
