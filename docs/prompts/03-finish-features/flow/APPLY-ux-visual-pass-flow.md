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

# [APPLY] - UX + Visual Pass Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Pulir y mejorar la usabilidad (UX), estética visual, responsive y accesibilidad de las interfaces del proyecto.

## Fase Ideal

Durante el refinamiento de la interfaz (Finish Features).

## Prompts Incluidos

1. [primary-user-experience-audit.md](../ux/AUDIT-primary-user-experience.md)
2. [empty-states-errors-and-microcopy.md](../ux/APPLY-empty-states-errors-and-microcopy.md)
3. [premium-visual-polish-pass.md](../visual/APPLY-premium-visual-polish-pass.md)
4. [responsive-pass.md](../visual/APPLY-responsive-pass.md)
5. [basic-accessibility-pass.md](../performance/APPLY-basic-accessibility-pass.md)

## Checkpoints Entre Pasos

- **Durante el flujo**: Cargar [visual-ux-regression-checkpoint.md](AUDIT-visual-ux-regression-checkpoint.md) tras modificar textos y layouts.
- **Final**: Repetir la validación de regresión visual para certificar el cierre.

## Condiciones para Avanzar

- El flujo principal de interacción no sufre regresiones funcionales.
- No hay solapes de textos, overflow horizontal ni menús inaccesibles en los viewports verificados.

## Cuándo Detenerse

- Si las modificaciones de usabilidad detectadas exigen un rediseño de producto.
- Si no hay modo de testear visualmente los componentes modificados.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ UX y diseño visual pulidos. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las mejoras visuales/UX aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
