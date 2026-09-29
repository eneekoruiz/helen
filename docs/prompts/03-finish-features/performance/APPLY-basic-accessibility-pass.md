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

# [APPLY] - Basic Accessibility Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Detectar y corregir problemas básicos de accesibilidad en la UI antes de release o presentación pública.

## Cuándo Usarlo

- En la fase de pulido visual y UX.
- Antes de publicar una UI web o entregar a cliente.

## Cuándo NO Usarlo

- Si el proyecto no tiene interfaz de usuario ni contenido interactivo.

## Criterios Mínimos

- Revisa navegación por teclado, visibilidad del focus, contrastes de color, etiquetas semánticas HTML, alt texts de imágenes de contenido, etiquetas de formularios y soporte básico para lectores de pantalla.
- Comprueba que el flujo principal no dependa únicamente de colores o de eventos hover.

## Más allá de estos criterios

Busca la accesibilidad como calidad de producto: claridad en textos de error, interfaces predecibles, facilidades de recuperación ante errores y lenguaje sencillo.

## Límites de Seguridad

No añadas atributos ARIA incorrectos o redundantes para aparentar accesibilidad técnica ("aria theater") si rompen la experiencia real del lector.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mejoras de accesibilidad aplicadas. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las mejoras de accesibilidad aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
