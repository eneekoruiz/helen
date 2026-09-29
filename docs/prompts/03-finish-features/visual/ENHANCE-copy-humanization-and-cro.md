---
action: ENHANCE
label: ENHANCE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
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

# [ENHANCE] - Copy Humanization and CRO

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: ENHANCE (mejorar piezas existentes con restricciones de no-rotura)

## Objetivo

Quitar del texto las marcas de escritura automática y mejorar la conversión de títulos, botones y formularios sin cambiar lo que el producto realmente ofrece.

## Cuándo Usarlo

- Antes de entregar una landing, portfolio o web de cliente.
- Cuando el copy suena correcto pero intercambiable.

## Requisitos mínimos obligatorios

1. **Humanización**: detecta y reescribe patrones típicos de IA (preámbulos escalonados, triples forzados, importancia inflada, lenguaje comercial vacío, estructura simétrica). Sustituye por detalle concreto y verificable del negocio. Puedes apoyarte en la skill externa `humanizer` (`helen skills external humanizer`).
2. **CRO**: revisa titular principal, propuesta de valor, CTAs (texto, jerarquía primario/secundario), formularios (campos innecesarios, errores, confirmación) y prueba social. La skill externa `cro-optimization` aporta un marco de 13 principios (`helen skills external cro-optimization`).
3. Cada claim debe tener respaldo real; si no lo tiene, propón una alternativa honesta.
4. Mantén i18n y campos de CMS: cambia el texto, no la estructura.

## Más allá de estos criterios

Lee el texto en voz alta: si podría estar en la web de cualquier competidor, reescríbelo con un detalle que solo este cliente pueda decir.

## Límites de Seguridad

- No inventes testimonios, métricas, logos, premios ni garantías.
- No cambies texto legal, de privacidad o de precios sin señalarlo.
- No cambies el significado del mensaje del cliente.

## Checks Finales

- [ ] Claims sin respaldo señalados o sustituidos.
- [ ] CTAs con intención clara.
- [ ] i18n y CMS intactos.

## Formato de Entrega

Antes/después de los 5 cambios de mayor impacto y lista de claims que el cliente debe confirmar.
