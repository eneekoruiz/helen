---
action: AUDIT
label: AUDIT-
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

# [AUDIT] - Developer Onboarding Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Make a new developer productive quickly without private context.

## Prompt

Act as a Staff Engineer responsible for onboarding excellent developers into this repo.

Audit developer onboarding.

## Requisitos mínimos obligatorios

1. Verify setup from clone to first successful run.
2. Review README, docs, scripts, env examples, architecture notes, tests, and contribution guidance.
3. Identify hidden assumptions and local-machine dependencies.
4. Check how a developer discovers modules, commands, conventions, and ownership.
5. Flag confusing naming, missing examples, and weak troubleshooting.

## Más allá de estos criterios

Look for ways to reduce cognitive load: better scripts, better errors, command aliases, architecture map, first issue guide, smoke test, local seed data, or docs deletion.

## Formato de entrega

1. Onboarding path evaluation.
2. Blockers (classified as Críticos, Importantes, Opcionales).
3. Confusing areas.
4. Automation opportunities.
5. Documentation fixes.
