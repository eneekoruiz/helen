---
action: AUDIT
phase: 03-finish-features
summary: Blocking gate: user-facing changes are coherent, usable and not visually broken across viewports and states.
modifies_code: false
---

# Visual and UX Regression Checkpoint

## Goal

Confirm user-facing changes are coherent, usable and not visually broken before the flow continues.

## Use when

- After any change to layout, copy, motion or components, and at the end of visual flows.

## Requirements

1. Open the affected screens in a real browser when a dev server exists and capture screenshots (`helen skills external playwright-cli` helps); otherwise review the code and say that no visual check could run.
2. Check the primary flow, responsive layout, loading, error and empty states, keyboard focus, text overflow, obvious contrast problems, visual hierarchy and public assets.
3. **Blocks progress:** broken layout in the primary viewport; overlapping or unreadable text; the primary flow cannot be completed; a visual state contradicts product behavior.
4. **Warning only:** minor spacing or copy polish outside the primary flow; improvements that need a design or product decision.

## Limits

- Fix only the smallest visible issue, recheck the affected viewport and record what remains.

## Output

Screens and viewports checked, blockers and warnings with evidence, and the verdict `GATE PASSED` or `GATE BLOCKED`.
