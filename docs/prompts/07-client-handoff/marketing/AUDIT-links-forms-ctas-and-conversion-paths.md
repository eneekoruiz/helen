---
action: AUDIT
phase: 07-client-handoff
summary: Verify every important path works: CTAs, links, routes, forms, validation, success states and conversion measurement.
modifies_code: false
---

# Links, Forms, CTAs and Conversion Paths Audit

## Goal

Verify that people can actually complete the important journeys (click CTAs, submit forms, navigate, contact the business, recover from errors), as if paid traffic starts tomorrow.

## Use when

- Before a demo, launch, handoff, paid traffic or portfolio publication.

## Requirements

1. **Inventory:** primary and secondary CTAs, navigation, footer, social, contact (mailto, tel), download, auth, booking, checkout and internal links; the intended conversion path per audience.
2. **Links and routes:** broken links, placeholder URLs, `#`, empty `href`, dead buttons, wrong targets, missing `rel` on external links; consistency between desktop and mobile navigation.
3. **Forms:** labels, required fields, validation, error, success, loading and disabled states, keyboard use, autocomplete, spam protection, real submission destination; failed submissions give useful feedback and never lose input.
4. **CTAs:** clear visual and semantic priority; copy matches destination; no competing CTAs; no dead-end pages.
5. **Measurement:** key conversion events, thank-you states, confirmation emails, CRM or webhook assumptions.

## Beyond the checklist

Hidden leaks: low-trust form placement, no proof near the CTA, no sticky action on mobile, contact buried, slow feedback, unclear next step after submit.

## Limits

- Audit only. Do not wire forms to new external services, collect extra personal data, bypass validation, consent or security, or create fake analytics events.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Forms reviewed with fixes; links and routes checked; CTA improvements.
3. Measurement gaps and remaining risks before launch.
