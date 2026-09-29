---
action: PLAN
label: PLAN-
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

# [PLAN] - Quality Operating System Design

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases)

Purpose: Design a complete quality methodology for a repository instead of running isolated audits.

## Prompt

Act as a Principal Engineer, AI Workflow Architect, CTO, Staff Product Engineer, QA Lead, SRE, Security Engineer, Product Designer, and founder obsessed with quality.

Design a quality operating system for this repository.

## Requisitos mínimos obligatorios

1. Lifecycle map
- Define phases from discovery to maintenance and archive.
- Add gates for assumptions, implementation, UX, QA, security, operations, growth, delivery, and final release.

2. Prompt map
- Map each phase to prompts that should exist.
- Identify missing prompts, duplicated prompts, and prompts that should be merged.

3. Evidence model
- Define what evidence proves quality in each phase: tests, screenshots, logs, metrics, benchmarks, user flows, docs, demos, or manual QA.

4. Decision gates
- Define `PASS`, `PASS WITH CAVEATS`, `FAIL`, and `DO NOT SHIP` rules.

5. Agent workflow
- Define how an editor-integrated agent should inspect, plan, implement, verify, and report.
- Include when it may apply changes and when it must only propose.

## Más allá de estos criterios

Think like a world-class product engineering team.

Add uncommon but valuable rituals: pre-mortems, kill criteria, competitor deltas, adoption friction review, support burden review, rollback rehearsal, data export rehearsal, dependency exit plan, incident narrative drill, screenshot truth audit, and premium detail pass.

Remove ceremony that does not create quality.

## Formato de entrega

1. Proposed methodology.
2. Folder structure changes.
3. New prompt families or integrations.
4. Prompt execution graph.
5. Quality gates definition.
6. Highest-leverage next changes.
