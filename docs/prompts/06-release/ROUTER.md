---
action: GENERATE
label: GENERATE-
phase: 06-release
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# GENERATE- Router Release

Usa este router para preparar version publicable.

## Decision rapida
- Falta checklist de salida: usa `plan-release-checklist.md` como **INIT-** operativo.
- Faltan notas o changelog: usa `generate-release-notes-changelog-and-demo-package.md`.
- Hay dudas de release: usa `audit-release-readiness-checkpoint.md`.
- La version necesita flujo completo: usa `apply-release-candidate-flow.md` como **ENHANCE-**.

## Stop
No publiques si build, tests, documentacion y versionado no estan claros.
