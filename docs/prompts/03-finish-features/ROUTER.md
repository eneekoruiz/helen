---
action: ENHANCE
label: ENHANCE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# ENHANCE- Router Finish Features

Usa este router para llevar una experiencia funcional a nivel premium.

## Decision rapida
- No existe infraestructura 3D: usa `3d/generate-3d-global-canvas-setup.md`.
- Existe setup 3D y falta una escena concreta: usa `3d/generate-3d-isolated-experience-component.md`.
- La escena existe pero parece barata o inestable: usa `3d/enhance-3d-premium-scene-polish.md`.
- Hay dudas visuales o UX: usa primero un prompt **AUDIT-**.
- La UI necesita pulido general: usa `apply-full-polish-flow.md` como **ENHANCE-**.

## Stop
No anadas efectos si reducen legibilidad, conversion, rendimiento o accesibilidad.
