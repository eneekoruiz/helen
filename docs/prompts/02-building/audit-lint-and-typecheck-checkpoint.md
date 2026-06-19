# Lint and Typecheck Checkpoint

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
