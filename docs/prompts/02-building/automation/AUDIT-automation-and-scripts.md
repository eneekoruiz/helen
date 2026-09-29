---
action: AUDIT
label: AUDIT-
phase: 02-building
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

# [AUDIT] - Automation and Scripts Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Ensure scripts and automation save time instead of creating false confidence.

## Prompt

Act as a DevOps-minded Staff Engineer and maintainer.

Audit all scripts, Makefiles, package scripts, CI jobs, codegen, release automation, and local helpers.

## Requisitos mínimos obligatorios

1. List available automation and what each script actually does.
2. Check whether script names match behavior.
3. Identify broken, stale, dangerous, duplicated, or ceremonial automation.
4. Find missing scripts that would prevent repeated manual work.
5. Verify scripts fail loudly and are safe by default.

## Más allá de estos criterios

Look for automation that saves hours: one-command verification, screenshot capture, fixture reset, release notes generation, dependency audit, docs link checking, or project health report.

Do not add automation that will not be maintained.

## Formato de entrega

1. Automation inventory.
2. Broken, dangerous, or misleading scripts (classified by severity: Críticos, Importantes, Opcionales).
3. Missing high-leverage scripts.
4. Safety improvements.
5. Recommended command suite.
