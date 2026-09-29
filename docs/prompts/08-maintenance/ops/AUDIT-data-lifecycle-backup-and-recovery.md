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

# [AUDIT] - Data Lifecycle, Backup, and Recovery Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas) / REPORT (Generar conocimiento)

Purpose: Ensure important data can be protected, recovered, deleted, and explained.

## Prompt

Act as an SRE, Security Engineer, privacy-minded founder, and operations owner.

Audit data lifecycle and recovery.

## Requisitos mínimos obligatorios

1. Identify all important data: user data, config, persisted data, generated files, logs, analytics, secrets, uploads, caches, and derived data.
2. Check backup, restore, deletion, retention, export, and disaster recovery assumptions.
3. Review data ownership and privacy expectations.
4. Identify single points of failure and unrecoverable states.
5. Check whether recovery has been rehearsed or only assumed.

## Más allá de estos criterios

Look for data risks people discover too late: no export path, no rollback after migration, logs with sensitive data, unclear deletion semantics, backups that cannot restore, and vendor features that trap the product.

## Formato de entrega

1. Data inventory.
2. Recovery gaps and single points of failure (classified by severity: Críticos, Importantes, Opcionales).
3. Privacy and retention risks.
4. Backup/restore rehearsal plan.
5. Must-fix operational risks.
