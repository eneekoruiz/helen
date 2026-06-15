# Final i18n Audit

Use this prompt when a project supports multiple languages or intends to present itself as multilingual.

## Prompt

Review this project as a strict senior engineer performing a final internationalization audit.

Goal: determine whether the multilingual experience is complete, coherent, accessible, and safe to ship without inflating the product's real maturity.

Audit posture:

- Be strict about user-visible inconsistency.
- Treat mixed-language output, broken fallbacks, and locale mistakes as release-quality defects.
- Do not recommend expanding scope into unnecessary languages, frameworks, or SEO work.
- Fail the audit if multilingual support is being claimed more strongly than it is implemented.

Non-negotiable rules:

- Do not accept "mostly translated" if critical paths still leak the wrong language.
- Do not accept locale-aware claims without checking actual formatting behavior.
- Do not let a language selector pass if it is inaccessible, confusing, or non-persistent.
- Do not let the project present itself as multilingual if the second language is clearly incomplete.

Audit these areas:

1. Hardcoded user-facing text
- Find strings outside the translation system across UI, forms, errors, toasts, loaders, empty states, metadata, emails, PDFs, legal text, and admin flows if present.
- Check dynamic strings and interpolated values, not just obvious labels.

2. Translation completeness
- Identify missing keys, raw key leakage, fallback leakage, partial screens, untranslated validation messages, and inconsistent terminology.
- Compare equivalent flows across locales, not just individual files.
- Check whether feature flags, rarely used settings pages, and destructive flows are translated too.

3. Language consistency
- Review whether each locale reads as one coherent language rather than a mix of borrowed English and partial translations.
- Check product naming, technical vocabulary, button labels, error tone, and legal wording for consistency.
- Flag cases where the same concept has multiple translations without a good reason.

4. Locale-sensitive formatting
- Verify date, time, relative time, currency, number, decimal, thousands separator, pluralization, and list formatting behavior.
- Check whether formatting truly follows the active locale rather than the developer's default locale.
- Review time zone assumptions where relevant.

5. Accessibility of language switching
- Check whether the language switcher is keyboard accessible, clearly labeled, visually understandable, and announces the current language appropriately.
- Confirm language choice persists across navigation and reloads when expected.
- Verify that switching language does not silently drop user state unless unavoidable.

6. Routing and navigation
- Review localized routes, locale prefixes, route generation, internal links, breadcrumbs, and redirects if the app uses language-specific URLs.
- Check whether deep links survive language changes sensibly.
- Flag broken canonical behavior or duplicate content risks if routing is localized.

7. SEO for multilingual public projects
- If the project is public and intended for indexing, review translated metadata, `hreflang`, canonical rules, sitemap behavior, and indexability per locale.
- Check whether metadata stays in sync with the selected locale.
- Skip this section only if search visibility is explicitly out of scope.

8. Fallback behavior and resilience
- Confirm the default locale, fallback chain, and missing-key behavior.
- Check what happens when translation bundles fail to load or a locale is unsupported.
- Flag any behavior that exposes raw keys, empty text, or broken UI.

9. Developer maintainability
- Review whether locale files are organized, named consistently, and easy to maintain.
- Flag unused keys, duplicate keys, and structures that make future drift likely.
- Check whether the project has a sane process for adding or updating translations.

Automatic fail conditions:

- Critical user flows contain mixed-language output.
- Missing translation keys are visible in the UI.
- Locale formatting ignores the selected language in important screens.
- The language switcher is inaccessible, misleading, or not functional.
- The repo claims multilingual support but one supported locale is clearly incomplete.
- Fallback behavior exposes raw keys, blank strings, or broken pages.

Output format:

- Start with blocking issues that make the multilingual experience unfit for release.
- Then list consistency and maintainability risks.
- Then give only the smallest justified fixes needed before release.
- End with a verdict of `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence stating whether the project can honestly market itself as multilingual today.
