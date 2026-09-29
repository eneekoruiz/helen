---
action: APPLY
label: APPLY-
phase: 03-finish-features
modifies_code: true
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

# [APPLY] - Responsive Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Verificar y corregir de forma segura que las superficies de la UI funcionen correctamente en mobile, tablet y desktop.

## Cuándo Usarlo

- En la fase de pulido visual y UX.
- Antes de capturas públicas o release web.

## Cuándo NO Usarlo

- Si el proyecto no tiene interfaz de usuario responsive.

## Criterios Mínimos

- Revisa viewports pequeños (móvil), medianos (tablet) y grandes (desktop).
- Corrige overflow horizontal, solapes, menús rotos, botones inaccesibles, textos cortados y densidades incorrectas.
- Comprueba que el flujo principal se pueda completar en todos los dispositivos.

## Más allá de estos criterios

Evalúa si cada viewport parece diseñado de forma nativa e intencionada, no simplemente encogido o forzado por CSS.

## Límites de Seguridad

Evita reestructurar layouts grandes sin necesidad. Corrige primero los problemas de visualización e interacción visibles y bloqueantes.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Ajustes de responsive aplicados. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las correcciones responsive aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
