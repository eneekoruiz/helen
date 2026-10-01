---
name: helen-release
description: Use for any release question, decision or task: checking if code is ready to release, ship, tag or deploy (e.g. 'Can we tag vX today?', 'Release is today', flaky tests before shipping, CI failures before release), writing changelogs and release notes from commit lists, reviewing release blockers, or deciding release candidate (RC) readiness with an RC READY / NOT RC READY verdict. Use when auditing or implementing technical SEO and launch readiness (title tags, meta descriptions, noindex blockers, heading hierarchy, Open Graph, sitemaps, robots.txt); evaluating privacy and GDPR compliance (cookie consent banners, analytics and Meta pixel tracking disclosures, privacy policies); or verifying internationalization (i18n), raw translation keys in UI, and locale formatting. Use when preparing to hand off or deliver a project to a client or new maintainer, assembling delivery packages, conducting pre-demo browser smoke tests (checking console errors, broken assets, forms, mobile viewports), planning repository or file transfers (warning against sending .env or node_modules in zip archives), verifying credentials management, and writing handoff documentation and sign-offs.
---


## From helen-release

# Release Candidate

Decide if the project can be packaged as a release candidate, with guarantees.

## Sequence

1. Load and pass the **build and compile** checkpoint.
2. Fast build/test verification, then the **test suite** checkpoint.
3. Security hardening, then the **security risk** checkpoint.
4. i18n audit and final SEO audit.
5. **Lint and typecheck** checkpoint before documenting.
6. GitHub repository audit; release notes, changelog, and demo package.
7. **Release readiness** checkpoint.

The detailed prompts live in the HELEN library: `helen prompts flow release-candidate` prints the full flow and links to each step.

## Conditions to advance

- Build, linter, and test suite pass with no exceptions.
- No open secrets or critical security gaps.
- Documentation and quickstarts match the real state of the software.

## Stop when

- Any checkpoint or critical verification fails. Never hide or cosmetically fix a type, build, or security error.
- Indexability directives or language fallbacks are broken.
- A destructive or high-risk change needs confirmation: ask the user first.

## Final summary

1. Verdict: `RC READY`, `RC WITH CAVEATS`, or `NOT RC READY`.
2. Checks executed.
3. Changes made during the flow.
4. Remaining blockers.
5. Draft release notes or pending items.

## From helen-seo-compliance

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

## From helen-client-handoff

# Client Handoff

## Checklist

1. Setup and deployment reproduce on a clean machine.
2. No credentials, tokens, or development access exposed in the repo or docs.
3. Ownership is clear: domains, hosting, repositories, databases, SaaS accounts, and where credentials live (name the vault, never the secret).
4. Links, forms, and CTAs work; media has alt text and sensible weight.
5. A browser smoke test passes on every main route, including reload (deep links) and back/forward navigation, on mobile and desktop (a headless browser tool such as `playwright-cli` helps).
6. Release notes, changelog, and a demo package exist.
7. The receiver has a clear roadmap to keep operating.

## Final summary

1. Handoff package structure and links.
2. Quality verification status.
3. Documented technical and support risks.
4. Access and IP transfer instructions.
5. Sign-off recommendation.

Run the verification checkpoints first (build, tests, security, release readiness). Flow: `helen prompts flow client-delivery`.