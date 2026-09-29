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

# [AUDIT] - Build and Compile Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Confirm the project can build or compile before deeper polishing or release work continues.

## Command

Use the repo's real build command. Common candidates:
- `npm run build`
- `npm run typecheck`

## Manual Review

If no build command exists, inspect project scripts, docs, and source structure. Explain why no compile checkpoint can run.

## Blocks Progress

- Build fails.
- Type generation fails.
- Required environment is missing and not documented.
- The build only works because of local machine assumptions.

## Warning Only

- Non-blocking warnings that do not affect output.
- Missing optional optimization if the project is not release-bound.

## Recovery

Fix the smallest credible cause, rerun the checkpoint, and document the result.
