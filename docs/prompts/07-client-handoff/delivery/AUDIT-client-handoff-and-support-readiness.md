---
action: AUDIT
label: AUDIT-
phase: 07-client-handoff
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

# [AUDIT] - Client Handoff and Support Readiness Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: REPORT (Generar conocimiento) / PLAN (Diseñar estrategias y fases)

Purpose: Make sure a project can be handed to a client, teammate, maintainer, or future self without hidden knowledge.

## Prompt

Act as a senior consultant, Staff Engineer, support lead, and product owner.

Audit handoff readiness.

## Requisitos mínimos obligatorios

1. Review setup, deployment, credentials, configuration, docs, known limitations, and support expectations.
2. Identify operational tasks the recipient must perform.
3. Check whether troubleshooting and recovery are documented.
4. Identify hidden owner knowledge.
5. Confirm deliverables are organized and named professionally.

## Más allá de estos criterios

Look for confidence builders: demo script, acceptance checklist, support FAQ, maintenance calendar, risk register, decision log, and owner handoff note.

## Formato de entrega

1. Handoff blockers (classified by severity: Críticos, Importantes, Opcionales).
2. Missing recipient knowledge.
3. Support risks.
4. Deliverable checklist.
5. Recommended handoff package.
