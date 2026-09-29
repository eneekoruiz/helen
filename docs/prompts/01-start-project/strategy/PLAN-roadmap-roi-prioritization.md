---
action: PLAN
label: PLAN-
phase: 01-start-project
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

# [PLAN] - Roadmap, ROI, and Prioritization Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases)

Purpose: Turn ideas and audit findings into a disciplined roadmap.

## Prompt

Act as a Product Manager, CTO, Staff Engineer, and SaaS founder.

Prioritize what should be built, fixed, removed, or deferred.

## Requisitos mínimos obligatorios

1. Classify work by user value, risk reduction, revenue/growth value, maintenance value, and strategic value.
2. Estimate effort and confidence.
3. Identify dependencies and sequencing.
4. Separate quick wins from strategic bets.
5. Identify kill criteria for low-value work.

## Más allá de estos criterios

Challenge whether the roadmap is too feature-heavy, too technical, too cosmetic, or too reactive.

Look for leverage: one improvement that improves activation, support, trust, and maintainability at once.

## Formato de entrega

1. Roadmap themes.
2. Now/next/later table.
3. Quick wins (low effort, high value).
4. Strategic bets.
5. Work to delete or avoid.
6. Decision log.
