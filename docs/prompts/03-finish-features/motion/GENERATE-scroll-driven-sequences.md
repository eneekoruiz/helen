---
action: GENERATE
phase: 03-finish-features
summary: Scroll-linked storytelling (GSAP ScrollTrigger, Lenis, canvas frame sequences or video scrubbing) with beats, preloading and fallbacks.
modifies_code: true
aliases:
  - enhance-scroll-linked-sequences
  - generate-scroll-video-scrubbing-sequence
---

# Scroll-Driven Sequences

## Goal

Tell a story with scroll: reveal a transformation, process, product or before/after in memorable beats, with exact control over frames, performance and fallback.

## Use when

- Scroll should reveal complex information memorably, and frames, video or renders justify the choreography.

## Requirements

1. **Technique:** native CSS scroll-driven animations when enough; GSAP ScrollTrigger timelines; Lenis smooth scroll when concurrent scroll animations jitter; canvas image sequences or video `currentTime` for scrubbing. Justify the choice.
2. **Beats:** start and end frame, text for each beat, CTAs, and what the visitor learns in each segment.
3. **Timeline:** calibrated triggers (e.g. `start: "top 80%"`, `end: "bottom 20%"`), `scrub: 1` for a soft follow, `pin: true` only when a sequence needs full attention.
4. **Video and frames:** modern compressed formats (WebM/AV1) with frequent keyframes; prefer pre-rendered frames on canvas; update inside `requestAnimationFrame`, never decode per scroll event.
5. **Loading:** progressive preload, initial poster, stable dimensions, mobile fallback, reduced-motion version that keeps the message.
6. **Measure:** total weight, time to first frame, perceived FPS, CLS and LCP.

## Beyond the checklist

It should feel directed, not like a trick: motion compresses explanation and increases desire. Catalog helpers: `helen skills external scroll-craft`.

## Limits

- No hundreds of heavy frames above the fold without a strategy.
- Never block native scroll or hide essential content inside an inaccessible animation.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also list the beats, technique and fallback.
