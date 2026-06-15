# Final i18n Audit

Use this prompt when a project supports more than one language or plans to.

## Prompt

Review this project as a senior engineer performing a final internationalization audit.

Goal: confirm that multilingual behavior is consistent, complete, and maintainable without changing the product scope.

Rules:

- Do not invent languages or translation systems the project does not need.
- Keep recommendations proportional to the current product.
- Prefer small, concrete fixes over architectural rewrites.

Audit these areas:

1. Hardcoded text
- Find user-facing strings that bypass the translation system.
- Include UI labels, form errors, toasts, metadata, empty states, and email or legal copy if present.

2. Missing or inconsistent translations
- Check for missing keys, fallback leaks, mixed-language screens, and inconsistent terminology.
- Make sure repeated product terms are translated consistently across the app.

3. Locale-sensitive formatting
- Review date, time, currency, number, and plural formatting.
- Check whether formatting respects the active locale instead of assuming one default.

4. Language switching and accessibility
- Review the language selector behavior if one exists.
- Confirm keyboard access, visible labels, current-language indication, and persistence of the selected locale.

5. Routing and navigation
- Check localized routes, locale-aware navigation, and canonical handling if the app supports language-specific URLs.
- Make sure switching language does not break deep links unnecessarily.

6. SEO for multilingual projects
- If the project is public and multilingual, review translated metadata, canonical rules, `hreflang` handling, and indexability.
- Skip this if the project is not exposed to search engines.

7. Fallback behavior
- Confirm what happens when a translation key is missing.
- Check the default locale, fallback chain, and error resilience.

Output format:

- Start with broken or user-visible issues.
- Then list consistency gaps and content gaps.
- Then list structural improvements only if they are justified.
- End with a short assessment of whether the i18n setup is good enough for release.
