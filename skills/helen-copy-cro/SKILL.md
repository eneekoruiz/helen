---
name: helen-copy-cro
description: Use when reviewing or writing website copy - removing AI-sounding text, checking brand tone and unsupported claims, and improving conversion (headlines, CTAs, forms, friction). Never invents facts, testimonials, or metrics.
---

# Copy, Claims and Conversion

## Review

1. **Visible copy:** headings, CTAs, labels, nav, footer, forms, errors, empty states, metadata, testimonials, FAQs, pricing. Find typos, mixed language, vague promises, and robotic phrasing.
2. **Tone:** coherent across pages, matching the product's real maturity; remove filler that makes it generic.
3. **Claims:** flag unsupported "best", "secure", "guaranteed", "AI-powered", "trusted by", or performance promises. Offer safer wording.
4. **Conversion:** CTA text matches intent; primary and secondary CTAs differ; remove ambiguity and dead ends.
5. **SEO copy:** titles, descriptions, headings; no keyword stuffing.

## Humanizing

AI traces to remove: staged run-ups, forced triples, inflated significance, sales language, symmetric structure. Rewrite with specific, checkable detail from the real business. An external `humanizer` skill and `cro-optimization` skill are in the catalog.

## Limits

- Do not invent facts, testimonials, metrics, logos, awards, or certifications.
- Do not change legal, privacy, or pricing language in risky ways without flagging it.
- Preserve translations, i18n structure, and CMS field identity.

Prompts: `audit-content-copy-brand-and-claims`, `audit-links-forms-ctas-and-conversion-paths`, `audit-ai-trace-erasure-and-human-craft`, `enhance-copy-humanization-and-cro`.
