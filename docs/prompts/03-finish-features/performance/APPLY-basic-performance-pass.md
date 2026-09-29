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

# [APPLY] - Basic Performance Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Detectar y corregir problemas de rendimiento evidentes y de alto impacto (perceptibles por el usuario) en el código y en la carga de recursos.

## Cuándo Usarlo

- En la fase de pulido visual y UX.
- Antes de release web o de la aplicación.

## Cuándo NO Usarlo

- Para realizar microoptimizaciones prematuras sin datos de perfilado o evidencia.

## Criterios Mínimos

- Revisa el tamaño de assets y bundles, llamadas de red innecesarias, re-renders redundantes, bucles ineficientes, operaciones síncronas bloqueantes en el hilo principal y tiempos de carga inicial.
- Identifica cuellos de botella visibles para el usuario o el mantenedor.

## Más allá de estos criterios

Busca el menor cambio que mejore la percepción de velocidad: menor tiempo de espera visual, placeholders de carga amigables, lazy loading de imágenes y datos paginados.

## Límites de Seguridad

No introduzcas mecanismos complejos de caché, debounce o memorización sin necesidad o sin entender su ciclo de vida. No comprometas la corrección lógica por ganar milisegúndos.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mejoras de rendimiento aplicadas. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las optimizaciones de rendimiento aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
