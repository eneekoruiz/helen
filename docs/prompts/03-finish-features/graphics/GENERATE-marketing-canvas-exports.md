---
action: GENERATE
phase: 03-finish-features
summary: Build a development-only canvas tool that exports App Store / Google Play screenshots, posters and banners at exact resolutions.
modifies_code: true
aliases:
  - generate-app-store-canvas-exports
---

# Marketing Canvas Exports

## Goal

Generate production-quality marketing assets (store screenshots, product posters, promo banners) straight from the web project, without depending on a design tool.

## Use when

- An app or product needs store screenshots or campaign images that must match the live design.

## Requirements

1. **Exact sizes:** e.g. 1242x2688 (iPhone 6.5") or 1290x2796 (iPhone 15 Pro Max); render with a forced pixel ratio of 3 or more for sharp output.
2. **Layout:** device mockup (SVG or vector image) in the lower third, persuasive copy with the project's typography in the upper two thirds, mathematically centered; background gradients from the project tokens.
3. **Export:** a floating panel available only in development (`process.env.NODE_ENV === 'development'`), downloading PNG via `canvas.toBlob` or `toDataURL`. Alternatively a Node/Playwright script for batch export.
4. Wait for fonts, images and mockups to load before exporting.

## Limits

- The tool must never ship to production users.
- Copy on store images follows the same no-invented-claims rule as the site.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
