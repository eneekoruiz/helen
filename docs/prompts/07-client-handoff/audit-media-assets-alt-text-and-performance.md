# Media Assets, Alt Text, and Performance Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Audit images, video, icons, logos, favicons, social previews, backgrounds, and media delivery so the product looks premium without hurting accessibility or performance.

Use this when visual polish matters, when assets came from mixed sources, or before publishing a public-facing site.

## Prompt

Act as a Principal Frontend Engineer, visual designer, accessibility reviewer, performance engineer, SEO reviewer, and brand QA lead.

Inspect all media assets and report or make the smallest high-impact fixes that improve quality, loading, accessibility, and presentation.

## Requisitos mínimos obligatorios

1. Inventory media assets
- Find images, videos, background images, SVGs, icons, logos, favicons, app icons, social previews, CMS image fields, galleries, screenshots, and decorative media.
- Separate content images from decorative assets.

2. Review visual quality
- Check crop, aspect ratio, resolution, blur, compression artifacts, inconsistent style, poor alignment, wrong focal point, stretched images, and mismatched icon weights.
- Ensure images look good on mobile, desktop, high-DPI screens, and common social previews where applicable.

3. Review accessibility
- Ensure meaningful images have useful alt text.
- Ensure decorative images are handled correctly.
- Check icons with semantic meaning have accessible names.
- Preserve or improve captions where useful.

4. Review performance
- Check oversized assets, unoptimized formats, missing lazy/eager strategy, missing width/height, layout shift risk, heavy videos, autoplay risk, and unnecessary preloads.
- Preserve priority loading for above-the-fold critical media.

5. Review metadata and delivery assets
- Check favicon, app icon, Open Graph image, Twitter/social preview image, screenshots, README images, and demo visuals where relevant.

## Más allá de estos criterios

Think like a product designer zooming in before a premium laúnch.

Look for small asset problems that make the product feel unfinished: blurry logos, inconsistent screenshot crops, weak social preview, generic stock imagery, mismatched icon sets, awkward hero image framing, unbalanced empty space, or CMS replacement images that will break the layout.

If the project needs a better asset strategy, propose it clearly.

## Límites de seguridad

- Do not replace brand assets without confirmation.
- Do not use unlicensed images.
- Do not remove meaningful alt text.
- Do not compress assets destructively without preserving acceptable quality.
- Do not add heavy media or new asset libraries without strong justification.

## Checks finales

- All important media reviewed.
- Alt text and decorative semantics reviewed.
- Oversized or layout-shifting assets flagged.
- Social/favicons checked.
- CMS image behavior considered.
- Visual consistency improved or reported.

## Formato de entrega

1. Asset issues and performance risks (classified by severity: Críticos, Importantes, Opcionales).
2. Accessibility changes.
3. Performance changes.
4. Social/favicons status.
5. Remaining asset risks.
