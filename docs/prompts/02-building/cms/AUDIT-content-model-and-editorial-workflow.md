---
action: AUDIT
phase: 02-building
summary: Check that editable content is usable and safe for the person editing it: fields, validation, repeatable blocks and handoff notes.
modifies_code: false
---

# Content Model and Editorial Workflow Audit

## Goal

Make sure editable content is not just technically editable but usable, safe and pleasant for the non-developer who will edit it tomorrow.

## Use when

- Before or after converting static content into CMS fields, and before client handoff.

## Requirements

1. **Content model:** fields, groups, repeatable sections, images, rich text, links, metadata, legal and global content; naming, types, validation, fallbacks, required vs optional.
2. **Editor experience:** can a non-developer find and edit the right content safely? Flag confusing or duplicate fields, overly granular fields, missing previews, fields that can break layout.
3. **Content safety:** max lengths, rich text limits, image constraints, link validation, required alt text, fallback behavior; changes that could break UX, SEO, accessibility or legal claims.
4. **Repeatability:** sections that should be arrays or repeatable blocks; keys stable across reorder, delete, duplicate and localization.
5. **Delivery readiness:** editor instructions, defaults, examples and recovery guidance.

## Beyond the checklist

Hunt avoidable support tickets: unclear labels, no preview, no image or alt-text guidance, fields that accept too much or too little. Recommend simplifying the schema when too many fields make the CMS fragile.

## Limits

- Audit only: do not modify files.
- Editors should not control product-critical logic unless intended; do not make every string editable; prefer structured fields to unbounded rich text.

## Output

1. Content model map.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Fields to merge, split, rename or constrain; missing repeatable structures.
4. Handoff recommendations and a delivery-risk verdict.
