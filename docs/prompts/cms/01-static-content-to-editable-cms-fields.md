# Static Content to Editable CMS Fields

Purpose: convert every meaningful page text and image into editable CMS-backed fields without breaking layout, design quality, SEO, accessibility, or performance.

Use this when a site currently has hardcoded paragraphs, headings, labels, CTA copy, captions, alt text, or images that should be editable by a client, content team, or admin UI.

## Prompt

Act as a Staff Frontend Engineer, CMS architect, Product Designer, SEO reviewer, accessibility reviewer, and client-delivery consultant.

Convert the site or app so that all relevant static content is editable.

## Requisitos mínimos obligatorios

1. Inventory all editable content
- Find headings, paragraphs, button labels, captions, hero copy, card copy, FAQ items, testimonials, metadata copy, legal snippets, alt text, image sources, gallery images, logos, icons used as content, and content-driven backgrounds.
- Separate product/UI chrome from client-editable content.
- Do not convert purely structural labels unless the product requires it.

2. Convert text to editable fields
- Replace hardcoded client-editable text with the project's editable text abstraction, such as `EditableField`.
- Preserve semantic HTML, heading hierarchy, typography, spacing, responsive behavior, and existing copy.
- Use stable IDs/keys that survive copy changes.
- Avoid duplicate keys for repeated sections.

3. Convert images to editable images
- Replace hardcoded content images with the project's editable image abstraction, such as `EditableImage`.
- Preserve aspect ratio, dimensions, priority/loading behavior, object-fit, responsive sources, captions, and alt text.
- Ensure image fallbacks do not create broken layouts.

4. Preserve SEO and accessibility
- Keep headings meaningful.
- Ensure alt text remains editable when the image is content.
- Preserve metadata strategy where content affects SEO.
- Do not degrade keyboard navigation, contrast, focus, layout stability, or screen reader output.

5. Preserve design and performance
- Editable wrappers must not add visual noise, spacing shifts, hydration issues, layout jumps, or oversized client bundles.
- The page should look identical unless an explicit improvement is needed.

6. Verify editor behavior
- Check that fields are uniquely addressable.
- Check that edit controls do not overlap content.
- Check empty or missing CMS values.
- Check long text, short text, missing image, and replacement image edge cases.

## Más allá de estos criterios

Think like someone delivering to a client tomorrow.

Look for content the client will obviously ask to change later: section titles, pricing text, process steps, card descriptions, testimonials, logos, hero images, gallery images, social proof, badges, repeated content blocks, and SEO snippets.

Also look for content that should *not* be editable because changing it would break product logic, navigation, legal safety, or design integrity.

Recommend content schema improvements if the project needs repeatable groups instead of isolated fields.

## Límites de seguridad

- Do not change the visual design unless needed to support editing safely.
- Do not convert code-owned UI state labels into CMS fields without justification.
- Do not invent CMS infrastructure if the project already has an editable abstraction.
- Do not remove SEO/accessibility information while wrapping content.
- Do not make destructive migrations without confirmation.

## Checks finales

- Every meaningful paragraph and text block reviewed.
- Every content image reviewed.
- Editable IDs are stable and unique.
- Long/empty/missing content states considered.
- Visual layout preserved.
- Build/typecheck/tests run when available.

## Formato de entrega

1. Content inventory summary.
2. Converted text fields.
3. Converted image fields.
4. Content intentionally left static and why.
5. Edge cases tested.
6. Risks before client delivery.
7. Commands/checks executed.
