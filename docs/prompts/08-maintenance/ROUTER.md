---
action: ENHANCE
label: ENHANCE-
phase: 08-maintenance
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# ENHANCE- Router Maintenance

Usa este router para mantener calidad, gobernanza y crecimiento.

## Decision rapida
- La biblioteca de prompts crece sin orden: usa `apply-prompt-library-maintenance-flow.md`.
- Hay riesgo de datos o backups: usa `audit-data-lifecycle-backup-and-recovery.md`.
- Hay deuda de repositorio: usa `audit-repository-governance-and-compliance.md`.
- Hay oportunidad de crecimiento: usa `audit-growth-model.md`.

## Stop
No anadas prompts redundantes; fusiona o enruta antes de inflar la biblioteca.
