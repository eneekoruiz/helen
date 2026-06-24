---
action: INIT
label: INIT-
phase: 01-start-project
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# INIT- Router Start Project

Usa este router para elegir el primer prompt correcto.

## Decision rapida
- Lienzo en blanco o AI builder nuevo: usa `init-master-business-core.md`.
- Ya existe briefing de negocio pero falta estructura: usa `init-architecture-and-scaffold.md`.
- Hay competidores concretos que estudiar: usa `audit-competitor-analysis.md`.
- Ya hay analisis competitivo y toca construir ventaja: usa `generate-competitive-cloning.md`.
- El repo existe pero su estado es incierto: usa `audit-initial-project-risk-scan.md`.

## Stop
No generes UI ni codigo si no hay oferta, publico, objetivo de conversion y restricciones minimas.
