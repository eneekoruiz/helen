---
action: GENERATE
phase: 02-building
summary: Build a protected visual CMS so the client edits sales content without code, separating universal and translatable fields.
modifies_code: true
---

# Visual CMS (WYSIWYG) with i18n

## Goal

Let the client manage the site's sales content safely, without seeing code or breaking the design, with correct multilingual behavior.

## Use when

- The site's commercial structure is stable and the client needs to edit text, images, CTAs or sales blocks.
- Before handoff when the business will maintain content.

## Requirements

Inputs: current stack, supported languages, editing roles, desired content model, persistence constraints.

1. First decide what must be editable and what stays fixed.
2. Separate **universal fields** (technical slugs, order, visibility, relations, layout, shared media, campaign flags) from **translatable fields** (headlines, subtitles, body copy, CTAs, alt text, SEO title and description, FAQs, form messages).
3. Protect the design: length limits, field types, validation, previews, per-language fallback.
4. Permissions or a protected mode so critical components cannot be edited by accident.
5. Visual preview and draft/published states when the stack allows.
6. Keep it sales-oriented: CTAs, proof, objections and trust blocks are editable on purpose.

## Beyond the checklist

If a full CMS is not needed, build a minimal but robust editorial layer. Simplicity that protects conversion beats a huge panel the client will not use.

## Limits

- Never expose secrets, tokens or sensitive configuration to the client.
- No free HTML without sanitization.
- Do not break routes or existing SEO when adding i18n.
- Never ship invented translations as final content.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also include the content model, the universal/translatable matrix and short editor instructions.
