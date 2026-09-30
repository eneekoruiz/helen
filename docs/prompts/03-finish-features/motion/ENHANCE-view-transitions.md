---
action: ENHANCE
phase: 03-finish-features
summary: Native View Transitions API for pages, themes, tabs and shared elements, with clip-path reveals, focus safety and a no-API fallback.
modifies_code: true
aliases:
  - enhance-native-view-transitions
  - generate-view-transition-state-system
---

# View Transitions

## Goal

Make changes between pages and states (theme, routes, filters, pricing toggles, tabs, card to detail) feel continuous and on-brand using the native View Transitions API, with progressive enhancement.

## Use when

- Visual continuity would reduce cognitive friction, or the brand should show in the step between states.

## Requirements

1. **Map the states:** light/dark theme, routes, tabs and filters, modals and drawers, card to detail.
2. **Feature detection:** without support, update immediately.
   ```js
   if (!document.startViewTransition) updateDOM();
   else document.startViewTransition(() => updateDOM());
   ```
3. **Shared elements:** `view-transition-name` only on elements with the same identity in both views (the card that becomes the detail header); clear names dynamically to avoid duplicate-name collisions in React.
4. **Custom animations** with `::view-transition-old(root)` / `::view-transition-new(root)` instead of the default crossfade; `clip-path` reveals (e.g. a circle expanding from the click point) when they add meaning.
5. **Integrate** with the existing router (React Router, Next.js, vanilla) without building a custom router layer.
6. Protect input, focus position, history, native navigation and reduced motion.

## Limits

- Never break focus accessibility; no long animations for repeated actions.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
