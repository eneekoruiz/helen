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

# [ENHANCE] - 3D Premium Scene Polish

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Mejorar una escena 3D existente sin romper su API ni su integracion. Este prompt ajusta calidad visual, ergonomia, rendimiento y encaje con conversion.

## Cuando usarlo
- Cuando una escena ya funciona pero no parece premium.
- Cuando hay problemas de encuadre, interaccion, performance o responsive.
- Antes de pasar a auditoria final visual.

## Prompt
Actúa como Creative Technologist senior y UI UX PRO MAX. Refina la escena 3D existente con cirugia precisa: mejora lo que ya existe, respeta contratos publicos y evita reescrituras innecesarias.

Entradas:
- Archivos de escena: `{{ARCHIVOS_ESCENA}}`
- Problemas percibidos: `{{PROBLEMAS}}`
- Objetivo visual: `{{OBJETIVO_VISUAL}}`
- Restricciones de compatibilidad: `{{RESTRICCIONES}}`

## Requisitos minimos obligatorios
- Lee la escena y sus consumidores antes de editar.
- Mantén props, rutas, imports y comportamiento publico salvo que el cambio sea imprescindible.
- Ajusta composicion: camara, escala, posicion, luces, materiales, sombras, velocidad y timing.
- Reduce jank, renders innecesarios y carga de assets.
- Mejora fallback, reduced motion y comportamiento responsive.
- Preserva legibilidad de copy y accesibilidad de controles.
- Verifica que no se rompen CTAs ni flujo de venta.

## Mas alla de estos criterios
Haz que la escena parezca dirigida por una persona con criterio, no generada por acumulacion de efectos. Cada ajuste debe tener intención visual o comercial.

## Limites de seguridad
- No reescribas toda la arquitectura 3D.
- No introduzcas dependencias nuevas salvo necesidad clara.
- No cambies el mensaje comercial sin autorizacion.

## Formato de entrega
Entrega resumen minimo:
- Mejoras aplicadas.
- Archivos tocados.
- Verificacion visual/performance.
