---
name: helen-seo-compliance
description: Use before publishing a public website - technical SEO and indexability, i18n fallbacks, privacy/cookie/legal compliance (GDPR), and claims that create legal or trust exposure. Verifies metadata against the real product.
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

Related prompts: `audit-final-seo`, `audit-privacy-legal-and-compliance`, `audit-i18n-flow`. An external `seo` skill exists in the catalog (`helen skills external seo`).
