---
action: AUDIT
phase: 05-final-audit
summary: Verify that multilingual support is real and complete: hardcoded strings, missing keys, fallbacks, locale formats, language switcher.
modifies_code: false
aliases:
  - audit-i18n-flow
---

# Internationalization (i18n) Audit

## Goal

Confirm multilingual support is real, coherent, accessible and honest before release.

## Use when

- The project claims to support more than one language.

## Requirements

1. **Hardcoded text:** user-facing strings outside the translation system in views, modals, toasts, loaders, errors and metadata.
2. **Translation integrity:** missing keys, wrong fallbacks exposing raw keys, mixed languages in one view.
3. **Locale formats:** dates, currencies, numbers, plurals and time zones follow the active language.
4. **Switcher:** keyboard and screen reader accessible, keeps the user's state, sets `lang` and alternates.
5. **Automatic FAIL:** mixed languages in critical flows; raw keys (`missing.key`) visible in production; a broken switcher; marketing multilingual support with incomplete translations.

## Limits

- Audit only: do not modify files. Never ship machine translations as final without flagging them.

## Output

1. Locale support status.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Fallback review and recommended improvements.
4. Verdict: `PASS`, `PASS WITH CAVEATS` or `FAIL`, and whether marketing can truthfully claim multilingual support.
