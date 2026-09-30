---
action: APPLY
phase: 03-finish-features
summary: Verify and fix mobile, tablet and desktop layouts: overflow, overlap, broken menus, unreachable buttons, clipped text, density.
modifies_code: true
---

# Responsive Pass

## Goal

Make every surface work, and look designed, on mobile, tablet and desktop.

## Use when

- During polish, and before public screenshots or a web release.

## Skip when

- The project has no responsive interface.

## Requirements

1. Check small (360-414px), medium (768-1024px), large (1280-1440px) and wide (1920px) viewports; use a real browser when available (`helen skills external playwright-cli`).
2. Fix horizontal overflow, overlap, broken menus, unreachable buttons, clipped text and wrong density.
3. The main flow can be completed on every device.
4. Touch targets and spacing work with fingers, not only with a mouse.

## Beyond the checklist

Each viewport should look natively designed, not just shrunk by CSS.

## Limits

- Avoid restructuring large layouts; fix visible, blocking problems first.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
