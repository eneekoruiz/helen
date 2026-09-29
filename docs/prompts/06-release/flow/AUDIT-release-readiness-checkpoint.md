---
action: AUDIT
label: AUDIT-
phase: 06-release
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

# [AUDIT] - Release Readiness Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Decide whether the project can move from polish/hardening into release or delivery.

## Required Evidence

- Build passes.
- Tests or smoke checks pass.
- Lint/typecheck pass if available.
- README and docs match reality.
- No known secrets or private artifacts.
- Release notes or handoff notes exist when needed.
- Public claims are demonstrable.

## Blocks Progress

- Any core verification fails.
- README/setup is misleading.
- Public presentation overstates the product.
- Known critical issue is unresolved.
- Required owner decision is missing.

## Warning Only

- Minor polish issue with explicit caveat.
- Non-critical docs improvement already tracked.

## Recovery

Return to the flow step that introduced the gap, fix it, rerun required checkpoints, then reattempt release.
