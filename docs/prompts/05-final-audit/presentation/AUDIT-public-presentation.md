---
action: AUDIT
phase: 05-final-audit
summary: Decide whether the project deserves public exposure and whether README, screenshots, GitHub metadata and Open Graph match reality.
modifies_code: false
aliases:
  - apply-public-presentation-pass
  - audit-github-repository-flow
---

# Public Presentation Audit

## Goal

Decide whether the project is genuinely ready to be shown publicly (GitHub, portfolio, LinkedIn, client demo, hiring, launch) without inventing capabilities, hiding weaknesses or relying on cosmetic polish. A smaller truthful project beats a larger misleading one.

## Use when

- The project may appear in public, or the repository will become public.

## Requirements

1. **Truthfulness:** what the project is today; working vs partial, demo-only, stubbed, mocked or roadmap; every mismatch with its public description.
2. **README:** the first paragraph explains the project fast and honestly; it answers what, for whom, scope, how to run, required environment, tradeoffs and known limits; no inflated wording or stale links.
3. **Assets:** screenshots real, current, readable and representative; no placeholders or mocked impossible states; sensible file names, alt text and sizes.
4. **GitHub:** name, description, topics, website URL, social preview, license, releases; `.gitignore` excludes personal notes, credentials and temporary files; demo, docs and repository URLs reinforce each other.
5. **Open Graph** for a live site: `og:title`, `og:type`, `og:image`, `og:url`, ideally `og:description`, `og:site_name`, `og:locale`, `og:image:alt`; images readable small and on light and dark surfaces.
6. **Proof:** real gates run (build, lint, tests, types, preview, accessibility, performance, security, SEO); downgrade any claim that cannot be shown.
7. **Credibility:** would a recruiter, client or peer trust it after opening it cold?

**Automatic FAIL:** inaccurate setup; fake, stale or misleading screenshots; metadata that overstates; absent or unreproducible claimed features; secrets, broken links, placeholder copy or contradictory docs; core verification failing without explanation.

References: GitHub social preview and topics docs, [ogp.me](https://ogp.me/).

## Beyond the checklist

Sharper positioning, a better screenshot sequence, a stronger cover image, a simpler README, a small demo script, or postponing exposure. Presentation must reveal quality, never compensate for missing substance.

## Limits

- Audit only: do not modify files; settings in the GitHub web UI are listed as manual actions.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Minimal presentation fixes before going public, and manual GitHub settings to change.
3. Verdict: `PASS`, `PASS WITH CAVEATS` or `FAIL`, and whether you would attach this project to a professional profile today.
