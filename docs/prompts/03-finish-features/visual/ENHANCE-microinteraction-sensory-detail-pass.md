---
action: ENHANCE
phase: 03-finish-features
summary: Make buttons, inputs, cards, menus and feedback feel crafted: consistent states and motion, optional subtle UI sound with a mute toggle.
modifies_code: true
aliases:
  - enhance-ui-audio-micro-feedback
---

# Microinteraction and Sensory Detail Pass

## Goal

Make the interface feel handmade, expensive and human. People should not be able to name every detail, but they should feel them.

## Use when

- The layout is right but the interface feels flat (SaaS, portfolio, dashboard, e-commerce, premium landing), before the final visual audit.

## Requirements

1. **Audit** buttons, links, inputs, cards, menus, tooltips, toggles and media controls.
2. **States:** hover, focus, active, disabled, success and error feedback for each, with one consistent easing or spring language; cursor-aware highlights only when they add something.
3. **Optional sound** (only if it suits the brand): 50-250 ms cues at 5-15% gain, synthesized with the Web Audio API or tiny preloaded files (64 kbps mono); soft tick for hover, two rising tones for success, one low damped tone for error. A global mute toggle saved in `localStorage` is mandatory; start muted when in doubt.
4. Keep visible focus, hit targets, reduced motion and contrast.

## Limits

- Never move critical elements; never remove outlines without a replacement; never put essential information behind hover.
- No sound that autoplays loudly or cannot be muted.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
