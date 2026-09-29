---
action: AUDIT
label: AUDIT-
phase: 04-before-production
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

# [AUDIT] - Security Risk Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Stop unsafe changes before release, delivery, or public exposure.

## Command

Use available commands:
- `npm audit`
- dependency scanner if configured;
- project-specific security checks.

## Manual Review

Check:
- secrets;
- private URLs;
- unsafe logs;
- path handling;
- input validation;
- auth and permissions if applicable;
- dependency risk;
- destructive operations.

## Blocks Progress

- Secret committed or exposed.
- Critical/high dependency issue with reachable impact.
- Unsafe destructive behavior.
- Public release with known sensitive data leakage.

## Warning Only

- Low-severity dependency issue with no reachable path.
- Security improvement that requires larger architecture work and is documented.

## Recovery

Remove exposure, patch or mitigate, document residual risk, and repeat the checkpoint.
