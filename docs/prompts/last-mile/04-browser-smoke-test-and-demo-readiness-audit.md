# Browser Smoke Test and Demo Readiness Audit

Purpose: perform a practical browser-level check that the product can be demoed, clicked, resized, refreshed, and shown without obvious failures.

Use this at the end of a polish cycle, before recording a demo, before client delivery, or before sending a public link.

## Prompt

Act as a QA Lead, SRE-minded frontend engineer, UX reviewer, product owner, and demo operator.

Run the project if possible, inspect it in a browser, and verify that the visible experience is ready to show.

## Requisitos mínimos obligatorios

1. Start and inspect the app
- Identify the correct install/dev/build commands.
- Start the app only with safe local commands.
- If a server is already running, reuse it or choose a safe available port.

2. Smoke test critical pages
- Visit the home page and major routes.
- Check reload behavior, missing routes, console errors, obvious runtime errors, hydration errors, broken assets, and blank screens.
- Check desktop and mobile viewport basics.

3. Smoke test critical interactions
- Click primary navigation, CTAs, forms, menus, filters, modals, accordions, carousels, theme toggles, language controls, and edit controls where applicable.
- Check loading, error, empty, and success states when reachable.

4. Demo readiness
- Check that the first viewport looks intentional.
- Check that there is no obvious placeholder content, debug UI, private paths, console noise, lorem ipsum, broken screenshots, or unfinished admin affordances.
- Check that the product can survive a refresh and basic back/forward navigation.

5. Record evidence when useful
- Capture screenshots only when they help diagnose or prove readiness.
- Summarize exact pages and interactions tested.

## Más allá de estos criterios

Think like the person who will share the screen tomorrow.

Look for anything that would create embarrassment in a demo: flicker, jumpy layout, awkward initial loading, obvious scroll issues, menu overlap, mobile nav weirdness, broken CMS editing affordances, focus traps, invisible text, poor hero crop, or a CTA leading nowhere.

Prioritize fixes that reduce demo risk quickly.

## Límites de seguridad

- Do not run destructive commands.
- Do not deploy without explicit confirmation.
- Do not test against production writes unless explicitly approved.
- Do not create accounts, payments, emails, or external side effects without confirmation.
- Do not hide failures; report them with severity.

## Checks finales

- App started or blocker documented.
- Key routes visited.
- Key interactions tested.
- Mobile and desktop checked.
- Console/runtime issues noted.
- Demo blockers separated from warnings.

## Formato de entrega

1. Routes tested.
2. Interactions tested.
3. Blockers fixed.
4. Remaining blockers.
5. Warnings.
6. Commands run.
7. Demo readiness verdict.
