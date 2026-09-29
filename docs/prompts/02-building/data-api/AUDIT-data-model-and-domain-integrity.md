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

# [AUDIT] - Data Model and Domain Integrity Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Detect weak domain modeling, data inconsistency, schema drift, and missing invariants before they become expensive.

## Prompt

Act as a Principal Engineer, data architect, domain modeler, and reliability-minded product engineer.

Review the repository's data model and domain integrity.

## Requisitos mínimos obligatorios

1. Identify core entities, schemas, config objects, persisted data, generated artifacts, cache data, and external data shapes.
2. Review invariants, validation, defaults, nullability, ownership, lifecycle, migrations, and serialization.
3. Check whether the same domain concept appears under multiple names or incompatible shapes.
4. Identify where invalid states can be represented.
5. Review tests around schema boundaries and data transformations.

## Más allá de estos criterios

Look for domain friction: names that lie, data structures that force awkward code, missing canonical source of truth, implicit migrations, state that can become inconsistent, or product concepts that are not modeled explicitly enough.

Recommend simplification before abstraction.

## Formato de entrega

1. Domain model map.
2. Invariant gaps and risks (classified by severity: Críticos, Importantes, Opcionales).
3. Drift and duplication.
4. Migration or compatibility risks.
5. Recommended model improvements.
6. Verdict: `DOMAIN MODEL CLEAR`, `MODEL DRIFT RISK`, or `INTEGRITY RISK`.
