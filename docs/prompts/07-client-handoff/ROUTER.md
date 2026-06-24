---
action: AUDIT
label: AUDIT-
phase: 07-client-handoff
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# AUDIT- Router Client Handoff

Usa este router antes de entregar al cliente.

## Decision rapida
- Formularios, CTAs o links pueden fallar: usa `audit-links-forms-ctas-and-conversion-paths.md`.
- Copy, marca o claims pueden sonar genericos: usa `audit-content-copy-brand-and-claims.md`.
- Assets o alt text pueden estar flojos: usa `audit-media-assets-alt-text-and-performance.md`.
- Necesitas flujo de entrega completo: usa `apply-client-delivery-flow.md` como **ENHANCE-**.

## Stop
No entregues si el cliente no puede operar, entender o confiar en el activo.
