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

# [ENHANCE] - Cinematic Loading and Page Transition Polish

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: ENHANCE (pulir loaders, page transitions y momentos muertos)

## Objetivo

Convertir esperas, cargas, rutas y cambios de estado en momentos premium breves, útiles y memorables, sin esconder lentitud real ni bloquear conversión. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Cuando existen loaders genéricos, saltos bruscos, rutas secas o transiciones pobres.
- Después de tener contenido y estructura funcional.
- Antes de demo, lanzamiento o entrega high-end.

## Rol de la IA

Actúa como Motion Designer y Performance Engineer.

## Requisitos mínimos obligatorios

1. Audita initial load, route change, data loading, form submit y modal open/close.
2. Mejora skeletons útiles, progress feedback, page transitions breves, stagger sutil y reduced motion.
3. No tapes errores, no retrases artificialmente y no generes CLS.

## Más allá de estos criterios

Los loaders premium no entretienen: orientan, dan confianza y hacen que el sistema parezca caro porque responde con criterio.

## Límites de seguridad

- No añadas esperas artificiales.
- No ocultes fallos de red.
- No uses animaciones infinitas si puede haber progreso real.

## Checks finales

- [ ] Los estados de espera explican que pasa.
- [ ] Las transiciones son rápidas.
- [ ] Reduced motion preserva informacion.
- [ ] No hay CLS.

## Formato de entrega

```text
Pulido cinematico de cargas/transiciones aplicado.
Superficies:
- ...
Acciones manuales necesarias:
- ...
```

