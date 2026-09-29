---
action: AUDIT
label: AUDIT-
phase: 08-maintenance
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

# [AUDIT] - Cross-Audit Synthesis

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases)

Purpose: Consolidate findings from multiple prompts into one coherent execution plan.

## Prompt

Act as a Principal Engineer and Product Lead reviewing multiple audit outputs.

Synthesize them into a single prioritized plan.

## Requisitos mínimos obligatorios

1. Deduplicate findings
- Merge repeated issues across audits.
- Preserve the strongest evidence and highest severity.

2. Resolve conflicts
- Identify contradictory recommendations.
- Choose a direction or mark a decision needed.

3. Prioritize
- Rank by user impact, risk reduction, effort, leverage, and sequencing dependencies.

4. Assign phase
- Classify each item as now, next, later, or intentionally ignored.

5. Define execution packages
- Group related items into small coherent work batches.

## Más allá de estos criterios

Look for the hidden theme behind the findings.

Identify systemic causes: unclear product direction, weak architecture boundary, poor naming, missing ownership, insufficient verification, or presentation over substance.

Recommend deleting, merging, or simplifying work when that creates more quality than adding more.

## Formato de entrega

1. Executive summary.
2. Top risks (classified by severity: Críticos, Importantes, Opcionales).
3. Prioritized work packages.
4. Decisions needed.
5. Items to ignore or defer.
6. Recommended next prompt or agent brief.
