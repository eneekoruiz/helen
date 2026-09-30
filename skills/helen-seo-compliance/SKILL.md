---
name: helen-seo-compliance
description: Use when auditing or implementing technical SEO and launch readiness (title tags, meta descriptions, noindex blockers, heading hierarchy, Open Graph, sitemaps, robots.txt); evaluating privacy and GDPR compliance (cookie consent banners, analytics and Meta pixel tracking disclosures, privacy policies); or verifying internationalization (i18n), raw translation keys in UI, and locale formatting.
---

# SEO, i18n and Compliance

## SEO and indexability

- Check `title`, meta description, Open Graph, canonical URLs, `robots.txt`, sitemap, single `h1` and heading order, duplicate content.
- Metadata must match the real product. Never add spam keywords or claims the product cannot support.
- Confirm there is no accidental `noindex` in production.

## Internationalization

- Every visible string goes through the i18n layer; language fallbacks work; `hreflang` and language metadata are consistent.

## Privacy, legal and compliance

- Identify personal data, analytics, logs, uploads, support data, and third-party processors.
- Review consent and cookie behavior, tracking, retention, deletion, export, and data minimization.
- Check privacy policy, terms, licenses, and attribution. Flag claims such as "secure", "guaranteed", or "compliant" that need evidence.

## Limits

- Do not invent legal text or certifications; flag gaps and recommend review by the responsible person.
- Stop and ask when a change affects legal, privacy, or pricing language.

Related prompts: `audit-final-seo`, `enhance-privacy-and-legal-readiness`, `audit-i18n`. An external `seo` skill exists in the catalog (`helen skills external seo`).
