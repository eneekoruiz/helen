---
action: GENERATE
label: GENERATE-
phase: 06-release
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

# [GENERATE] - Release Notes, Changelog, and Demo Package Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (Generar plantillas, notas, checklists o documentación)

Purpose: Make releases understandable, credible, and reusable by generating notes, changelogs, and demo guides.

## Prompt

Act as a release manager, product marketer, technical writer, and founder.

Audit and generate release communication and demo materials.

## Requisitos mínimos obligatorios

1. Review or generate changelog, release notes, demo script, screenshots guidance, social preview text, README updates, and migration notes.
2. Check whether release communication explains user value, breaking changes, known issues, and verification commands.
3. Identify missing screenshots or demo steps.
4. Flag inflated claims or vague release language.
5. Ensure generated artifacts match the actual shipped state.

## Más allá de estos criterios

Look for reusable launch assets: short demo, long demo, screenshot set, social card, release summary, migration guide, FAQ, and post-release follow-up checklist.

## Formato de entrega

1. Release communication gaps (in current documents).
2. Proposed/Generated Changelog (markdown format).
3. Demo Script/Package (exact steps to demonstrate the release).
4. Public announcement text/copy.
5. Recommended release narrative.
