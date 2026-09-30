---
action: ENHANCE
phase: 03-finish-features
summary: Refined motion for UI elements, loaders and page changes: custom easings, combined transforms, useful waits, GPU-only properties.
modifies_code: true
aliases:
  - enhance-cinematic-loading-and-page-transition-polish
---

# Motion Polish and Transitions

## Goal

Give common interface elements (dropdowns, modals, alerts, sliders), loading moments and route changes a refined, physical feel, turning waits into brief, useful moments without hiding real slowness.

## Use when

- The UI has generic browser easings, abrupt jumps, dry route changes or generic loaders.
- Content and structure work, and a demo, launch or high-end delivery is close.

## Requirements

1. **Audit the moments:** initial load, route change, data loading, form submit, modal and dropdown open/close.
2. **Custom easings** instead of `ease`/`ease-in-out`: e.g. `cubic-bezier(0.16, 1, 0.3, 1)` for entrances and reveals, `cubic-bezier(0.7, 0, 0.84, 0)` for exits. Store them as tokens.
3. **Combined transitions:** dropdowns and modals animate opacity plus a small scale (0.98 to 1) and an 8-12px vertical offset; section reveals use a subtle stagger via a `--delay` variable.
4. **Waiting states:** useful skeletons, real progress feedback, short page transitions. They must explain what is happening.
5. **GPU-only properties:** animate `transform` and `opacity`; never `width`, `height`, `top`, `left`, `margin` or `padding`.
6. Input response under 100 ms; `prefers-reduced-motion` keeps all information with minimal motion.

## Beyond the checklist

Premium loaders do not entertain: they orient and build confidence because the system responds with judgment.

## Limits

- No artificial delays; never hide network errors; no infinite animations when real progress can be shown; no layout shift.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
