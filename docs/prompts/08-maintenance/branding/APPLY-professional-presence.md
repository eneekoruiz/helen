---
action: APPLY
phase: 08-maintenance
summary: Keep the project's public face current: author metadata, badges, profile links, demo links, screenshots, features list, broken links.
modifies_code: true
aliases:
  - apply-personal-branding-and-developer-credibility
  - apply-portfolio-showcase-maintenance
---

# Professional Presence Maintenance

## Goal

Keep the project's public presentation and its author's credits accurate and professional over time.

## Use when

- After significant releases, when demo URLs or the feature set change, or when the project appears in a portfolio or showcase.

## Requirements

1. **Author metadata:** `author` in `package.json` (name, public email, website); `CONTRIBUTORS`/`AUTHORS` when there are external contributors.
2. **Badges:** license, version, CI status, coverage; only badges that reflect real, working signals.
3. **Links:** GitHub, LinkedIn, portfolio and demo URLs current; no link points to a dead domain.
4. **Showcase:** screenshots of the current UI (e.g. `docs/assets/`), an updated features and stack list, an Open Graph image.
5. `SECURITY.md` for responsible vulnerability reports when the project is public.

## Limits

- No private contact data (recovery emails, personal phone numbers) in public files.
- Screenshots never expose real client data, emails, invoices or private IPs.
- Do not change a client's brand descriptions without written consent.

## Checks

- The README renders correctly on GitHub; build still passes after metadata changes.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
