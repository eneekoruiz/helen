# Final i18n Audit

Deep audit only. Use this prompt when a project supports multiple languages or claims that it does.

Purpose: decide whether multilingual support is complete, coherent, accessible, maintainable, and honest enough to release or market.

Expected output:

- release-blocking locale issues;
- translation and fallback defects;
- additional internationalization opportunities;
- a hard `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this project as a strict senior engineer and localization-quality reviewer performing a final internationalization audit.

Goal: determine whether the multilingual experience is real, coherent, accessible, resilient, and safe to claim publicly.

Audit posture:

- Be strict about user-visible inconsistency.
- Inspect UI, docs, metadata, errors, tests, config, routes, generated content, and public claims.
- Treat mixed-language output, broken fallbacks, and locale mistakes as release-quality defects.
- Do not recommend unnecessary languages, frameworks, or SEO work.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Hardcoded user-facing text
- Find strings outside the translation system across UI, forms, errors, toasts, loaders, empty states, metadata, emails, PDFs, legal text, admin flows, and docs where relevant.
- Check dynamic and interpolated strings, not just obvious labels.

2. Translation completeness
- Identify missing keys, raw key leakage, fallback leakage, partial screens, untranslated validation messages, and inconsistent terminology.
- Compare equivalent flows across locales.
- Check rare settings, destructive flows, feature-flagged areas, and onboarding.

3. Language consistency
- Review whether each locale reads as one coherent language.
- Check product naming, technical vocabulary, button labels, error tone, marketing copy, legal wording, and support text.

4. Locale-sensitive formatting
- Verify date, time, relative time, currency, numbers, decimals, thousands separators, pluralization, list formatting, names, addresses, and time zones when applicable.
- Check that formatting follows the active locale, not the developer default.

5. Accessibility of language switching
- Check whether the language switcher is keyboard accessible, clearly labeled, visually understandable, and announces current language correctly.
- Confirm language choice persists across navigation and reloads when expected.
- Verify switching language does not silently drop user state.

6. Routing and navigation
- Review localized routes, locale prefixes, route generation, internal links, breadcrumbs, redirects, canonicals, and deep links if language-specific URLs exist.

7. Multilingual SEO for public projects
- If search visibility matters, review translated metadata, `hreflang`, canonical rules, sitemap behavior, indexability, Open Graph locale tags, and localized social previews.

8. Fallback behavior and resilience
- Confirm default locale, fallback chain, missing-key behavior, unsupported-locale behavior, and translation bundle failure behavior.
- Flag raw keys, blank text, broken pages, or silent fallback that misleads users.

9. Developer maintainability
- Review locale file organization, naming, duplicate keys, unused keys, translation ownership, review process, and drift risk.

## Más allá de estos criterios

Act like a senior localization engineer, product designer, and international growth reviewer.

Look for cultural awkwardness, tone mismatch, inconsistent product vocabulary, layout breakage from longer text, unsupported assumptions about names or regions, accessibility gaps, SEO opportunity, and places where the product technically translates but does not feel native.

You may recommend simplification, better locale boundaries, improved copy systems, stronger fallbacks, or removal of inflated multilingual claims.

Do not expand language scope unless there is a clear product reason.

## Automatic fail conditions

- Critical user flows contain mixed-language output.
- Missing translation keys are visible.
- Locale formatting ignores the selected language in important screens.
- The language switcher is inaccessible, misleading, or not functional.
- The repo claims multilingual support while a supported locale is clearly incomplete.
- Fallback behavior exposes raw keys, blank strings, or broken pages.

## Output format

1. Start with blocking issues that make multilingual release unsafe.
2. Then list consistency and maintainability risks.
3. Then list "Más allá de estos criterios" opportunities.
4. Give only the smallest justified fixes needed before release.
5. End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. Include one sentence stating whether the project can honestly market itself as multilingual today.
