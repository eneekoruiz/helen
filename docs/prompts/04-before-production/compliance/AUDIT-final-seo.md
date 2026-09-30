---
action: AUDIT
phase: 04-before-production
summary: Verify technical SEO before publishing: titles, descriptions, Open Graph, canonicals, robots, sitemap, headings and indexability.
modifies_code: false
---

# Final SEO Audit

## Goal

Make sure a public site is indexable, correctly described and shareable before it goes live.

## Use when

- Before publishing public web projects, landing pages, docs or portfolios.

## Skip when

- SEO is explicitly out of scope, or there is no indexable content.

## Requirements

1. `title` and meta description per key page, unique and matching the real content.
2. Open Graph (`og:title`, `og:type`, `og:image`, `og:url`, plus `og:description`, `og:image:alt`) and Twitter cards; social images readable at small sizes.
3. Canonical URLs, `robots.txt`, XML sitemap, no accidental `noindex` in production, no duplicate content.
4. One `h1` per page and a logical heading order; descriptive link text; image alt text.
5. Language and alternates (`lang`, `hreflang`) when multilingual; structured data where it clearly applies.
6. Core Web Vitals risks that affect ranking (coordinate with the performance prompts).

## Beyond the checklist

Organic discoverability: comparison pages, documentation keywords, clean sitemaps, attractive share snippets. External help: `helen skills external seo`.

## Limits

- Audit only: do not modify files.
- No SEO claims, keyword stuffing or misleading marketing text the product cannot back.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Proposed meta tags and heading fixes, ready to paste.
3. Organic opportunities.
