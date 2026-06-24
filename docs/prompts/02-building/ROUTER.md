---
action: GENERATE
label: GENERATE-
phase: 02-building
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# GENERATE- Router Building

Usa este router durante desarrollo activo.

## Decision rapida
- Falta una funcionalidad nueva: usa un prompt **GENERATE-**.
- La funcionalidad existe pero necesita refactor o endurecimiento: usa un prompt legacy `apply-*` como **ENHANCE-**.
- Hay dudas sobre datos, API o CMS: usa primero **AUDIT-**.
- El cliente necesita editar ventas sin tocar codigo: usa `generate-visual-cms-wysiwyg-i18n.md`.

## Stop
No modifiques codigo sin leer estructura, tests, convenciones y contratos publicos.
