---
action: GENERATE
label: GENERATE-
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

# [GENERATE] - Premium Mockup Layout System Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear layout con mockups high-end integrados)

## Objetivo

Empaquetar productos, portfolios, apps, dashboards, marcas o casos de estudio dentro de mockups ultra-premium integrados en el layout web, tomando como benchmark la calidad de ls.graphics y estudios visuales top. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para vender software, apps, portfolios, identidad visual, packaging, dashboards o servicios creativos.
- Cuando el usuario necesita mostrar entregables con percepcion de valor alto.
- En heroes, case studies, social proof, comparativas y secciones de features.

## Rol de la IA

Actúa como Art Director de producto digital, experto en composición high-end, packaging visual y optimización de assets.

## Requisitos mínimos obligatorios

1. Audita screenshots, renders, fotos, logos, UI states, before/after, video, calidad, resolucion y licencia.
2. Diseña mockup hero, mockups de detalle, composición de caso de estudio y variantes responsive.
3. Integra profundidad con sombras realistas, reflejos sutiles, recortes, masks y perspectiva.
4. Optimiza con `picture`, AVIF/WebP, lazy loading, dimensiones estables y alt text ?til.

## Más allá de estos criterios

Construye deseo tangible. El visitante debe sentir que el producto ya existe, tiene peso, esta cuidado y merece una conversacion comercial.

## Límites de seguridad

- No uses mockups premium sin licencia.
- No sustituyas evidencia real por renders engañosos.
- No sacrifiques legibilidad ni conversión por composiciones saturadas.

## Checks finales

- [ ] Los mockups aumentan confianza y deseo.
- [ ] La composición se siente editorial, no plantilla.
- [ ] El rendimiento de imagen esta controlado.
- [ ] La version mobile conserva intención.

## Formato de entrega

```text
Sistema de mockups premium generado.
Piezas integradas:
- ...
Optimizacion:
- ...
Acciones manuales necesarias:
- ...
```

