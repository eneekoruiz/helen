---
action: AUDIT
phase: 03-finish-features
summary: Performance budget and safety of animation, 3D, video and shaders: FPS, CLS, LCP, leaks, context loss, fallbacks and reduced motion.
modifies_code: false
aliases:
  - audit-animated-and-3d-visuals-performance-safety-and-integration
  - audit-animation-performance-and-fps
  - audit-performance-budget-for-cinematic-sites
---

# Motion and 3D Performance Audit

## Goal

Check that animations, 3D, video, shaders and mockups raise perceived value without hurting speed, stability, accessibility or conversion, and define a budget they must respect.

## Use when

- Before or after adding WebGPU, Three.js, video scrubbing, heavy motion or large assets; before production; when the site feels spectacular but slow.

## Requirements

1. **Budget and metrics:** LCP, CLS, INP, total JS, image/video/3D weight, perceived FPS. Propose a budget for JS, media, 3D and motion.
2. **Rendering:** stable 60 FPS (120 where supported); no layout thrashing (reading geometry such as `offsetHeight` and writing the DOM in a loop); no animated `width`, `height`, `top`, `left`, `margin` or `box-shadow`; `will-change` only on elements that need it (it costs video memory).
3. **Layout stability:** explicit dimensions or `aspect-ratio` for images, video and canvases; fonts with `font-display: swap` or preload.
4. **Resources:** textures, geometries, materials, listeners and animation loops released on unmount (`cancelAnimationFrame`); WebGL context loss (`webglcontextlost`) handled with recovery; rendering paused off-screen; DPR capped.
5. **Loading:** heavy libraries (`three`, `gsap`, `motion`) lazy-loaded; models compressed (Draco, Meshopt, KTX2); posters and preloads; nothing blocks first paint.
6. **Progressive enhancement:** the product stays fully usable and legible if animation or 3D fails, is disabled or unsupported, with elegant static fallbacks.
7. **Accessibility and comfort:** `prefers-reduced-motion` honored everywhere; no flashing, sudden spins or endless loops without a pause option; text over animated layers keeps WCAG contrast; custom gestures never break native touch scroll.

## Beyond the checklist

Do not kill visual charm out of dogma: cut what is invisible, degrade gracefully and protect what sells. Real traces help: `helen skills external chrome-devtools-mcp`.

## Limits

- Audit only: do not modify files.
- Never recommend removing an effect without weighing its function; never judge metrics without business context.

## Output

1. Visual performance state and fallback behavior.
2. Findings as **Critical** (leaks, main-thread blocking, missing fallback that breaks the screen, CLS above 0.1, sustained FPS below 45), **Important** (noticeable FPS drops, unoptimized or synchronous 3D assets, no reduced motion) and **Optional** (easing sync, contrast on dynamic backgrounds, loop micro-optimizations), each with evidence and the exact fix.
3. Recommended budget: JS, images and video, 3D, motion.
4. Safe action plan: what can be applied now without regression risk.
