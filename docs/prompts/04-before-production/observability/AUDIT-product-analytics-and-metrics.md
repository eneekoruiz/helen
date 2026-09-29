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

# [AUDIT] - Product Analytics and Metrics Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Define the metrics that show whether the product is actually working.

## Prompt

Act as a Product Manager, Growth Engineer, data-informed founder, and privacy-aware engineer.

Audit product analytics and metrics.

## Requisitos mínimos obligatorios

1. Define activation, retention, conversion, quality, reliability, and support metrics.
2. Identify events that should be tracked.
3. Check privacy, consent, and data minimization.
4. Identify vanity metrics.
5. Connect metrics to product decisions.

## Más allá de estos criterios

Look for the smallest measurement system that would change decisions.

Do not recommend analytics that create privacy risk or operational burden without clear value.

## Formato de entrega

1. North-star metric candidates.
2. Event map.
3. Missing instrumentation and gaps (classified by severity: Críticos, Importantes, Opcionales).
4. Privacy constraints.
5. Decision dashboard proposal.
