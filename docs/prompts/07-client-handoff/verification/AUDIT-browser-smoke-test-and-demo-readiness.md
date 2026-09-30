---
action: AUDIT
phase: 07-client-handoff
summary: Run the app in a browser and check it can be demoed: routes, reloads, console errors, key interactions, mobile and desktop.
modifies_code: false
---

# Browser Smoke Test and Demo Readiness

## Goal

Check in a real browser that the product can be clicked, resized, refreshed and shown tomorrow without embarrassment.

## Use when

- End of a polish cycle, before recording a demo, delivering, or sending a public link.

## Requirements

1. **Start the app** with safe local commands (reuse a running server or pick a free port). A headless browser helps: `helen skills external playwright-cli` or `playwright-mcp`.
2. **Pages:** home and main routes; reload, unknown routes, console and runtime errors, hydration errors, broken assets, blank screens; desktop and mobile basics.
3. **Interactions:** navigation, CTAs, forms, menus, filters, modals, accordions, carousels, theme and language toggles, CMS edit controls; loading, error, empty and success states when reachable.
4. **Demo readiness:** intentional first viewport; no placeholders, debug UI, private paths, console noise, lorem ipsum or unfinished admin affordances; survives refresh and back/forward.
5. Screenshots only when they prove readiness or help diagnose; list exact pages and interactions tested.

## Beyond the checklist

Flicker, layout jumps, awkward first load, scroll issues, menu overlap, focus traps, invisible text, poor hero crop, CTAs leading nowhere.

## Limits

- No destructive commands, deploys, production writes, accounts, payments or emails without explicit confirmation. Never hide failures.

## Output

1. Commands run, routes and interactions tested.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Verdict: `READY`, `NEEDS FIXES` or `DO NOT DEMO`.
