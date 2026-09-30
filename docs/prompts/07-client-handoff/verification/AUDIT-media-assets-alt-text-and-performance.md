---
action: AUDIT
phase: 07-client-handoff
summary: Audit images, video, icons, logos, favicons and social previews for quality, alt text, formats, sizes and layout shift.
modifies_code: false
---

# Media Assets, Alt Text and Performance Audit

## Goal

Make every image, video and icon look premium without hurting accessibility or performance.

## Use when

- Visual polish matters, assets came from mixed sources, or a public site is about to launch.

## Requirements

1. **Inventory:** images, videos, backgrounds, SVGs, icons, logos, favicons, app icons, social previews, CMS image fields, galleries, screenshots; content vs decorative.
2. **Quality:** crop, aspect ratio, resolution, blur, compression artifacts, focal point, stretching, mismatched icon weights; good on mobile, desktop, high-DPI and social previews.
3. **Accessibility:** useful alt text for meaningful images, empty alt for decoration, accessible names for semantic icons, captions where useful.
4. **Performance:** oversized files, legacy formats, missing lazy/eager strategy, missing `width`/`height`, layout shift, heavy or autoplaying video, unnecessary preloads; above-the-fold media keeps priority.
5. **Delivery assets:** favicon, app icon, Open Graph and social images, README images, demo visuals.

## Beyond the checklist

Blurry logos, inconsistent screenshot crops, weak social preview, generic stock imagery, CMS replacement images that will break the layout. Propose an asset strategy if one is missing.

## Limits

- Audit only. No brand asset replacement without confirmation; no unlicensed images; no destructive compression.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Accessibility and performance fixes, social and favicon status, remaining asset risks.
