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

# [APPLY] - Premium Visual Polish Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Detectar detalles visuales que hacen que el producto parezca menos premium, menos coherente o menos terminado y corregirlos de forma segura.

## Cuándo Usarlo

- Después de validar la UX básica.
- Antes de screenshots, demos, portfolio o release público.

## Cuándo NO Usarlo

- Antes de que el flujo principal funcione.
- Para maquillar un producto con problemas de comportamiento base.

## Criterios Mínimos

- Revisa layout, jerarquía, espaciado, tipografía, contraste, alineación, iconos, densidad, responsive y estados interactivos.
- Comprueba que no haya solapes, overflow, textos cortados ni jerarquía confusa.
- Evalúa consistencia visual entre pantallas y componentes.

## Más allá de estos criterios

Usa criterio de diseño. Busca ritmo, intención, calma visual, precisión, coherencia y detalles que un equipo de primer nivel no dejaría pasar.

## Límites de Seguridad

No cambies identidad visual completa sin confirmación. No introduzcas librerías visuales innecesarias.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Pulido visual premium aplicado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con los ajustes visuales aplicados]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
