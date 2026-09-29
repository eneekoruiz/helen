---
action: ENHANCE
label: ENHANCE-
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

# [ENHANCE] - Microinteraction Sensory Detail Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: ENHANCE (pulir microinteracciones y detalles sensoriales)

## Objetivo

Elevar botones, inputs, cards, menús, estados, hover, focus, drag, selection y feedback para que la interfaz se sienta hecha a mano, cara y humana. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Cuando el layout esta bien pero la interfaz se siente plana.
- En productos SaaS, portfolios, dashboards, ecommerce y landings premium.
- Antes de auditoria visual final.

## Rol de la IA

Actúa como Interaction Designer obsesionado con tactilidad, respuesta y calidad percibida.

## Requisitos mínimos obligatorios

1. Audita buttons, links, inputs, cards, menús, tooltips, toggles y media controls.
2. Aplica hover/focus/active, spring o easing consistente, cursor-aware highlights si aporta y feedback de exito/error.
3. Mantiene focus visible, hit targets, reduced motion y contraste.

## Más allá de estos criterios

El usuario no debe poder nombrar todos los detalles, pero debe sentirlos. Esa es la diferencia entre plantilla y producto de alto valor.

## Límites de seguridad

- No uses microinteracciones que muevan elementos críticos de sitio.
- No elimines outlines sin reemplazo.
- No dependas de hover para informacion esencial.

## Checks finales

- [ ] Todos los estados interactivos estan cubiertos.
- [ ] El movimiento tiene un lenguaje único.
- [ ] Accesibilidad intacta.
- [ ] No hay ruido visual.

## Formato de entrega

```text
Pase de microinteracciones aplicado.
Superficies:
- ...
Detalles:
- ...
Acciones manuales necesarias:
- ...
```

