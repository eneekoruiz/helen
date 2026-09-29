---
action: AUDIT
label: AUDIT-
phase: 02-building
modifies_code: false
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md
verification:
  - inspect_relevant_files
  - run_available_checks
---

# [AUDIT] - Lint and Typecheck Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


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
