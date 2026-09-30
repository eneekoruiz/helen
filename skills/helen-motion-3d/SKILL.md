---
name: helen-motion-3d
description: Use when adding or auditing motion, scroll-driven sequences, view transitions, 3D (Spline or React Three Fiber), shaders, or video scrubbing on a website - with a performance budget and graceful degradation.
---

# Motion, 3D and Cinematic Effects

## Rules

1. Motion needs a concept and a function (attention, hierarchy, feedback). Decorative motion is the first thing to cut.
2. Set a **performance budget first**, then measure: LCP, CLS, INP, total JS, image/video/model weight, perceived FPS.
3. Inspect lazy loading, preloads, posters, device pixel ratio, pausing off-screen canvases, reduced-motion behavior, and asset compression.
4. Degrade gracefully (static poster, simpler scene) before removing the charm; never accept heavy loads without a fallback.
5. `prefers-reduced-motion` must be respected everywhere.
6. Prefer native features (View Transitions API, CSS scroll-driven animations) over heavy libraries when they are enough.

## Choosing 3D

Spline for fast interactive embeds; React Three Fiber when you need code-level control and integration. Decide by need, team skill, and budget, then isolate the 3D component so the rest of the page works without it.

## Tools

Catalog entries that help: `scroll-craft` (scroll-driven sites), `21st-dev` (ready components). Review any script they ship before running.

Prompts: `audit-motion-and-3d-performance`, `enhance-view-transitions`, `generate-scroll-driven-sequences`, `generate-3d-foundation`, `generate-shader-experience`.
