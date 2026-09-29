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

# [GENERATE] - Spline Rapid Interactive Embed Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear integracion 3D rápida con Spline)

## Objetivo

Integrar escenas Spline para interactividad 3D rápida, prototipado visual o piezas de marca ligeras, manteniendo performance, accesibilidad y conversión. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Cuando se necesita una escena 3D interactiva rápidamente.
- Para heroes, objetos de marca, pequeñas demos o fondos reactivos.
- Si el equipo creativo trabaja mejor con tooling visual.

## Rol de la IA

Actúa como Creative Technologist experto en integrar Spline sin convertirlo en deuda técnica ni lastre de rendimiento.

## Requisitos mínimos obligatorios

1. Decide si Spline es correcto frente a React Three Fiber por velocidad visual, control, mantenimiento y rendimiento.
2. Implementa lazy load, loader premium, poster/fallback, reduced motion y container responsive estable.
3. Protege CTA, scroll, foco, formularios y contenido clave.
4. Documenta cuando migrar a R3F si la escena crece.

## Más allá de estos criterios

Usa Spline como bisturí visual: rápido, expresivo y acotado. Si la escena empieza a necesitar lógica de producto, cambia a R3F.

## Límites de seguridad

- No insertes embeds pesados above-the-fold sin estrategia.
- No dependas de servicios externos sin fallback.
- No uses Spline para lógica crítica de negocio.

## Checks finales

- [ ] Spline esta justificado.
- [ ] Hay fallback visual.
- [ ] Carga diferida y responsive.
- [ ] No bloquea interacciones.

## Formato de entrega

```text
Integracion Spline generada.
Escena:
- ...
Fallback:
- ...
Motivo para Spline:
- ...
```

