# Links, Forms, CTAs, and Conversion Paths Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Verify that users can actually complete the important journeys: click CTAs, submit forms, navigate pages, contact the business, and recover from errors.

Use this before demo, launch, client handoff, paid traffic, portfolio publication, or any moment where broken interaction would look careless.

## Prompt

Act as a QA Lead, Growth Engineer, Product Manager, UX researcher, accessibility reviewer, and conversion-focused Staff Frontend Engineer.

Inspect the full project and audit every important click path, form, CTA, link, and conversion action.

## Requisitos mínimos obligatorios

1. Inventory interactive paths
- Find primary CTAs, secondary CTAs, nav links, footer links, social links, contact links, email/phone links, download links, auth links, booking links, checkout links, and internal route links.
- Identify the intended conversion paths for each audience.

2. Validate links and routes
- Check for broken links, placeholder URLs, `#`, empty hrefs, dead buttons, wrong targets, wrong external link behavior, and missing `rel` attributes where needed.
- Check route consistency across desktop and mobile navigation.

3. Validate forms
- Check field labels, required fields, validation, error states, success states, loading states, disabled states, keyboard navigation, autocomplete, spam protection assumptions, and submission destination.
- Ensure failed submissions give useful feedback.
- Check that forms do not silently lose user input.

4. Validate CTAs and conversion hierarchy
- Ensure primary CTAs are visually and semantically clear.
- Check that CTA copy matches destination and intent.
- Find competing CTAs that dilute conversion.
- Ensure important pages do not end in dead ends.

5. Validate analytics and follow-up hooks where applicable
- Check whether key conversion actions can be measured.
- Flag missing event names, lead attribution, thank-you states, confirmation emails, or CRM/webhook assumptions when relevant.

## Más allá de estos criterios

Think like someone paying for traffic tomorrow.

Look for hidden conversion leaks: confusing button labels, low-trust form placement, no proof near the CTA, missing mobile sticky action, contact options buried too deep, slow interaction feedback, unclear next step after submit, or a form that technically works but feels risky to use.

Recommend the smallest changes that make the path feel reliable, intentional, and premium.

## Límites de seguridad

- Do not wire forms to a new external service without confirmation.
- Do not collect extra personal data unless justified.
- Do not bypass validation, consent, privacy, or security protections.
- Do not create fake analytics events that imply tracking exists when it does not.
- Do not change business logic without owner confirmation.

## Checks finales

- All primary CTAs reviewed.
- All forms reviewed.
- Broken or placeholder links found.
- Mobile navigation paths reviewed.
- Error/success states considered.
- Measurement/follow-up gaps flagged.

## Formato de entrega

1. Critical broken paths and link issues (classified by severity: Críticos, Importantes, Opcionales).
2. Forms reviewed and recommended fixes.
3. CTA/conversion improvements.
4. Links/routes checked.
5. Analytics/follow-up gaps.
6. Remaining risks before launch or delivery.
