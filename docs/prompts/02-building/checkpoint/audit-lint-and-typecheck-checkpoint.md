# [AUDIT] - Lint and Typecheck Checkpoint

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Confirm static checks pass before continuing.

## Command

Use available scripts:
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`

## Manual Review

If no static checks exist, inspect configuration and decide whether the absence is acceptable for the flow.

## Blocks Progress

- Typecheck fails.
- Lint fails in touched code.
- Format check fails in a release-bound flow.
- Static checks are claimed in docs but not actually available.

## Warning Only

- Missing format check in small internal projects.
- Non-critical lint warnings outside touched files, if documented.

## Recovery

Fix touched code first. Avoid broad style churn unless the flow is specifically about cleanup.
