---
action: ENHANCE
phase: 03-finish-features
summary: Magazine-grade typography and layouts: off-DOM text measurement, shape-outside wrapping, editorial grids, drop caps and blend modes.
modifies_code: true
aliases:
  - enhance-dynamic-typography-pretext
---

# Editorial Typography and Layouts

## Goal

Give chosen sections a high-end editorial look with advanced typography, while keeping layout performance and accessibility intact.

## Use when

- Portfolios, case studies, manifestos, long-form or brand sections that should read like a printed magazine.

## Requirements

1. **Off-DOM measurement:** when text must be split into exact columns or flow around non-rectangular shapes, measure glyph widths with an in-memory `Canvas2D` context using the same font settings and compute line breaks before painting. Avoid repeated `getBoundingClientRect()`/`offsetWidth` reads that force reflows.
2. **Wrapping:** `shape-outside` (`circle()`, `polygon()`) with floats so text flows around canvases, images or badges.
3. **Editorial grid:** named `grid-template-areas`, large drop caps (`::first-letter`, `initial-letter`), headlines interlocked with images through z-index and `mix-blend-mode`, vertical captions (`writing-mode: vertical-lr`) aligned to the grid.
4. Responsive fallbacks that stay readable on mobile; real text stays selectable and readable by screen readers.

## Limits

- Do not turn body text into images or canvas-only text.
- Check contrast when using blend modes; respect font licenses.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
