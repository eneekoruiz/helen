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

# [AUDIT] - Migrations, Import, Export, and Lock-in Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas) / REPORT (Generar conocimiento)

Purpose: Ensure the project can evolve without trapping users or maintainers.

## Prompt

Act as a Staff Engineer, platform architect, and founder planning for long-term trust.

Audit migration, import, export, and vendor lock-in strategy.

## Requisitos mínimos obligatorios

1. Identify data, config, API, schema, file, and integration formats that may need migration.
2. Check import and export paths.
3. Review versioning, backward compatibility, rollback, and migration tests.
4. Identify vendor dependencies and exit costs.
5. Flag one-way doors.

## Más allá de estos criterios

Look for trust-building features: user-owned exports, migration dry runs, compatibility checks, changelog warnings, deprecation policy, and clear data portability story.

## Formato de entrega

1. Migration surfaces and versioning risks (classified by severity: Críticos, Importantes, Opcionales).
2. Import/export gaps.
3. Vendor lock-in risks and exit strategies.
4. Compatibility strategy.
5. Recommended next safeguards.
