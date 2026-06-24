---
action: AUDIT
label: AUDIT-
phase: 05-final-audit
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# AUDIT- Router Final Audit

Usa este router para el cierre tecnico y visual.

## Decision rapida
- Hay UI premium o 3D: usa `audit-visual-quality-40k.md`.
- Hay dudas de mantenibilidad: usa `audit-code-quality.md`.
- Hay multiidioma: usa `audit-i18n-flow.md`.
- El README o docs pueden prometer de mas: usa `audit-documentation.md`.
- El repo va a ser publico: usa `audit-github-repository-flow.md`.

## Stop
Esta fase no reescribe logica. Genera hallazgos y deriva tareas separadas.
