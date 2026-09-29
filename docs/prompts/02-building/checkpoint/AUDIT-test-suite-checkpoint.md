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

# [AUDIT] - Test Suite Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Confirm the relevant test suite passes before advancing.

## Command

Use the repo's real test command. Common candidates:
- `npm test`
- `npm run test`

## Manual Review

If there are no tests, identify the risky flows that need manual verification.

## Blocks Progress

- Existing tests fail.
- Test command is broken or misleading.
- Critical flow has no automated or manual verification path in a release-bound flow.

## Warning Only

- Low-risk missing tests in a non-release polish flow.
- Slow tests if there is a documented smaller smoke path.

## Recovery

Fix failing behavior or outdated tests. Do not delete tests just to pass the checkpoint.
