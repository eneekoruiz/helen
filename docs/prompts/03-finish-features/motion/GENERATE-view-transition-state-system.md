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

# [GENERATE] - View Transition State System Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear sistema de transiciones nativas de estado, tema y página)

## Objetivo

Implementar transiciones de estado nativas, máscaras, morphs, page transitions y cambios de tema con View Transitions API, CSS masks, Motion/Framer Motion o fallback equivalente. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para cambios de tema, página, filtros, pricing toggles, tabs, navegacion editorial o estados de producto.
- Cuando la continuidad visual reduce fricción cognitiva.
- En experiencias donde la marca se expresa en el paso entre estados.

## Rol de la IA

Actúa como Interaction Designer y Frontend Architect experto en View Transitions API, animación de estado y progressive enhancement.

## Requisitos mínimos obligatorios

1. Mapea tema claro/oscuro, rutas, tabs/filtros, modales/drawers y cards a detalle.
2. Implementa `document.startViewTransition`, `view-transition-name`, CSS masks, clip-path, reveal radial o shared elements cuando aplique.
3. Protege input, foco, historial, navegacion nativa y reduced motion.
4. Crea fallback sin API.

## Más allá de estos criterios

Haz que cambiar de estado se sienta como una decisión de marca. La transicion debe dar continuidad, no hacer esperar.

## Límites de seguridad

- No implementes una capa de router custom innecesaria.
- No rompas accesibilidad de foco.
- No uses animaciones largas para acciones repetidas.

## Checks finales

- [ ] Hay progressive enhancement real.
- [ ] La navegacion no se rompe.
- [ ] El foco queda donde corresponde.
- [ ] Reduced motion es sobrio y completo.

## Formato de entrega

```text
Sistema de transiciones de estado generado.
Estados cubiertos:
- ...
Técnicas:
- ...
Fallback:
- ...
```

