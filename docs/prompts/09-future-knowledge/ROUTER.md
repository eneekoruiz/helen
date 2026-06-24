---
action: GENERATE
label: GENERATE-
phase: 09-future-knowledge
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# GENERATE- Router Future Knowledge

Usa este router para preservar contexto y continuidad.

## Decision rapida
- Falta contexto para agentes futuros: usa `generate-ai-context.md`.
- Falta bitacora de decisiones: usa `generate-decision-log.md`.
- Hay riesgo de factor autobus: usa `audit-bus-factor.md`.
- Hay riesgo de onboarding futuro: usa `audit-future-developer-onboarding.md`.
- Necesitas preservacion automatizada: usa `apply-automated-knowledge-preservation.md` como **ENHANCE-**.

## Stop
No documentes ruido. Preserva decisiones, invariantes, riesgos y rutas de recuperacion.
