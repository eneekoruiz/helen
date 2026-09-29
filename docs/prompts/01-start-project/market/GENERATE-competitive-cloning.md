---
action: GENERATE
label: GENERATE-
phase: 01-start-project
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

# [GENERATE] - Clonacion Competitiva

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Tomar un analisis competitivo previo y construir en nuestro stack las funcionalidades que faltan, mejorandolas con criterio propio. Es pragmatico, directo a implementacion.

## Cuando usarlo
- Después de `audit-competitor-analysis.md`.
- Cuando ya existe un proyecto iniciado.
- Cuando la oportunidad competitiva esta validada y toca convertirla en producto.

## Prompt
Actúa como Principal Product Engineer y CRO Implementer. Usa el analisis competitivo como input, selecciona las funcionalidades con mayor impacto y construyelas en el stack actual mejorando UX, claridad, rendimiento y mantenibilidad.

Entradas:
- Analisis competitivo: `{{ANALISIS_COMPETITIVO}}`
- Stack y estructura actual: `{{STACK_ESTRUCTURA}}`
- Funcionalidades objetivo: `{{FUNCIONALIDADES_OBJETIVO}}`
- Restricciones de marca: `{{RESTRICCIONES_MARCA}}`

## Requisitos minimos obligatorios
- Lee la estructura del proyecto antes de editar.
- Implementa solo funcionalidades con impacto claro en conversion o confianza.
- Mejora el patron del competidor: menos pasos, mejor copy, mejor estado responsive, mejor accesibilidad.
- Integra con componentes, estilos y convenciones existentes.
- Anade estados de carga, error, vacío y exito si la funcionalidad los requiere.
- Verifica build, lint o test relevante si el entorno lo permite.

## Mas alla de estos criterios
Si el analisis pide una feature que suena util pero no encaja con el flujo de venta, reduce su alcance o conviertela en un experimento mas pequeno. No confundas paridad competitiva con ventaja competitiva.

## Limites de seguridad
- No copies marcas, textos propietarios, assets protegidos ni estructuras identicas.
- No rompas rutas, tracking, formularios ni CMS existentes.
- No introduzcas librerías pesadas sin justificar el coste.

## Formato de entrega
Entrega cambios aplicados y un resumen minimo:
- Funcionalidades implementadas.
- Archivos tocados.
- Verificacion ejecutada.
