---
action: AUDIT
label: AUDIT-
phase: 04-before-production
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# AUDIT- Router Before Production

Usa este router antes de congelar una version candidata.

## Decision rapida
- Riesgo legal o privacidad: usa `audit-privacy-legal-and-compliance.md`.
- Riesgo de escala, coste o rendimiento: usa `audit-stress-scale-and-cost.md`.
- Riesgo de bugs extremos: usa `audit-adversarial-qa-and-edge-cases.md`.
- Riesgo de medicion pobre: usa `audit-product-analytics-and-metrics.md`.
- Necesitas hardening compuesto: usa `apply-prefinal-hardening-flow.md` como **ENHANCE-** despues de auditar.

## Stop
No pases a release con riesgos criticos abiertos.
