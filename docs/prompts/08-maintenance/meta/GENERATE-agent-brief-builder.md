---
action: GENERATE
label: GENERATE-
phase: 08-maintenance
modifies_code: true
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

# [GENERATE] - Agent Brief Builder

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (Generar plantillas, notas, checklists o documentación)

Purpose: Turn an audit or product goal into a precise brief for an editor-integrated coding agent.

## Prompt

Act as a Staff Engineer writing an execution brief for a capable agent with full repository access.

Create a brief that lets the agent work independently without making arbitrary changes.

## Requisitos mínimos obligatorios

1. Objective
- State the concrete outcome.

2. Context to inspect
- List files, folders, commands, docs, tests, UI surfaces, and external constraints the agent should inspect first.

3. Scope boundaries
- Define what the agent may change, may propose only, and must not touch.

4. Quality criteria
- Include functional, UX, code, documentation, security, performance, and maintenance criteria as applicable.

5. Verification
- Define commands, manual checks, screenshots, fixtures, or artifacts required before completion.

6. Reporting
- Define final response format, risks, caveats, and follow-ups.

## Más allá de estos criterios

Use expert judgment to add missing context, likely edge cases, and hidden risks.

If the goal is underspecified, propose a safe execution path and mark assumptions explicitly.

## Formato de entrega

Return a ready-to-use agent brief with:
1. Mission.
2. Context.
3. Constraints.
4. Work plan.
5. Verification plan.
6. Definition of done.
