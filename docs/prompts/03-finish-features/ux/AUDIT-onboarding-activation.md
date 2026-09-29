---
action: AUDIT
label: AUDIT-
phase: 03-finish-features
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

# [AUDIT] - Onboarding and Activation Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Reduce time-to-value and make the first successful outcome obvious.

## Prompt

Act as a Product Designer, UX Researcher, Growth Engineer, and Staff Product Engineer.

Review the first-run experience and activation path.

## Requisitos mínimos obligatorios

1. Identify the primary activation event.
2. Walk through the first session from zero context.
3. Find friction, unclear choices, missing defaults, and confusing terminology.
4. Review setup, permissions, sample data, first success, and next step.
5. Identify where users would abandon.

## Más allá de estos criterios

Look for ways to make the product feel inevitable: clearer first action, better defaults, progressive disclosure, better examples, fewer decisions, stronger feedback, and faster proof of value.

## Formato de entrega

1. Activation definition.
2. First-run blockers and friction areas (classified by severity: Críticos, Importantes, Opcionales).
3. Quick wins.
4. Larger onboarding improvements.
5. One recommended first-session redesign.
