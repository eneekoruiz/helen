---
action: APPLY
phase: 02-building
summary: Flow: convert static pages so texts, links and images use the inline Visual CMS components, with i18n-aware keys.
modifies_code: true
repeatable: true
stage: building
---

# CMS Editable Content Conversion Flow

## Goal

Convert a static page or site so relevant texts, links and images use the Visual CMS inline components (from the HELEN `cms` module), integrated with the `/admin` route and i18n when present.

## Use when

- A static mockup becomes a client-editable site, during building or before handoff.

## Steps

1. [audit-quality-gates-checkpoint](../checkpoint/AUDIT-quality-gates-checkpoint.md): start from a passing build.
2. **Provider and route:** wrap the app in `<CMSProvider>` and render `<CMSToolbar />` in the main layout; visual editing activates on `/admin`.
3. **Inline editing:** replace hardcoded text with `<EditableText contentKey="key" />`, images with `<EditableImage contentKey="key" />`, links with `<EditableLink textKey="textKey" urlKey="urlKey" />`.
4. **Content model:**
   - With i18n: the toolbar shows a language selector; translatable fields (titles, paragraphs, descriptions) change only for the active language; universal fields (phones, emails, external links, structural images) sync across languages.
   - Without i18n: modular, clean keys in `content.json` so going multilingual later is trivial.
5. Keep SEO and accessibility: heading hierarchy, alt text, no layout shift in edit mode.
6. [audit-quality-gates-checkpoint](../checkpoint/AUDIT-quality-gates-checkpoint.md), then check visually that edit-mode outlines do not break responsive layout.

## Stop when

- The project has no CMS module and the user has not asked to add one (`helen add cms`).

## Limits

- Stable, meaningful content keys; never make product-critical logic editable.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
