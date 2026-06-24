# Final Release Gate

**Intención**: PLAN (Diseñar estrategias y fases) / AUDIT (No modificar código, buscar problemas)

Final gate only. This prompt is intentionally compact, but it is not a substitute for the deeper audits in this library.

Purpose: Confirm that earlier audit layers are resolved before the project is marked finished, released, archived, or presented.

Expected output:
- compact release decision;
- unresolved blockers;
- additional final judgment;
- `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this repository as the final release owner.

Goal: decide whether the project can honestly be marked finished right now.

Do not treat this as a mechanical checklist. Use the checklist as the minimum gate, then apply senior judgment across the whole repository.

## Requisitos mínimos obligatorios

Confirm all applicable items:

- The project works locally from a reasonably clean setup, not only on the original developer machine.
- The primary build passes.
- Lint, tests, and type checks pass if the repository includes them.
- The main user flow has been exercised manually after the last meaningful change.
- The README matches the real project, real commands, real setup, and real limitations.
- Documentation is accurate enough for the intended audience.
- Screenshots are real, current, and worth keeping if screenshots exist or are needed.
- DeepWiki or external docs are present only if they add real value.
- An Open Graph or social preview image exists if the project is meant to be shared publicly.
- The About box is complete when public presentation matters: description, relevant URL, topics, and social preview.
- If the project has a live website, page-level Open Graph tags are present and match the product.
- GitHub description, topics, and public metadata are specific and accurate.
- `.env.example` or equivalent setup guidance exists if configuration is required.
- No secrets, tokens, private URLs, machine-specific paths, generated junk, or accidental personal artifacts are committed.
- No feature, performance, security, accessibility, scale, SEO, or production-ready claim remains unless it can be demonstrated.
- Demo-only behavior, mocks, seeded content, and known limitations are clearly labeled where necessary.
- Earlier audit findings are resolved or intentionally accepted with explicit rationale.
- The repository is clean enough that publishing it improves trust instead of damaging it.
- The project is genuinely good enough for portfolio, client, release, handoff, or archival use if that is the intended outcome.

## Más allá de estos criterios

Act like the accountable release owner.

Look for anything that still feels off even if the checklist passes: weak final narrative, brittle verification, unresolved risk, suspicious silence in tests, unclear ownership, public claims that feel inflated, hidden setup assumptions, rough first-run experience, or small quality issues that make the project feel unfinished.

You may block release for a reason not explicitly listed if it materially affects quality, trust, maintainability, user experience, security, or presentation.

You may also recommend release with caveats if the remaining risks are honest, bounded, and documented.

## Release gate

If any core verification fails, any public claim is misleading, any critical user flow is broken, or the presentation creates more confidence than the product deserves, do not mark the project as finished.

## Formato de entrega

1. State the final verdict first: `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
2. List unresolved blockers, if any (classified by severity: Críticos, Importantes, Opcionales).
3. List accepted caveats, if any.
4. List "Más allá de estos criterios" observations that affect the decision.
5. Give the smallest next action required.
6. End with one sentence saying whether you would personally sign off on this release today.
