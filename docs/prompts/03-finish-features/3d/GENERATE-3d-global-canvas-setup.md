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

# [GENERATE] - 3D Global Canvas Setup

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Crear la base tecnica global para experiencias 3D premium: canvas, motor, rendimiento, accesibilidad, fallback y reglas de integracion. No crea escenas especificas.

## Cuando usarlo
- Antes de anadir carruseles, hero scenes o escenas aisladas.
- Cuando el proyecto necesita presencia visual de alto presupuesto.
- Cuando todavia no existe infraestructura 3D estable.

## Prompt
Actúa como UI UX PRO MAX, Creative Technologist y Principal Frontend Engineer especializado en Three.js/react-three-fiber. Implementa un setup 3D global premium, eficiente y mantenible.

Entradas:
- Stack actual: `{{STACK}}`
- Objetivo visual: `{{OBJETIVO_VISUAL}}`
- Dispositivos prioritarios: `{{DISPOSITIVOS}}`
- Restricciones de rendimiento: `{{PERFORMANCE_BUDGET}}`

## Requisitos minimos obligatorios
- Lee la arquitectura frontend antes de introducir dependencias.
- Usa Three.js o una integracion probada del ecosistema si el stack lo permite.
- Crea un canvas global o provider reutilizable con control de DPR, resize, suspension y cleanup.
- Define fallback para movil, reduced motion, dispositivos lentos y errores de WebGL.
- Aisla assets, loaders, camaras, luces y configuracion de render.
- Establece reglas de performance: lazy loading, suspense, texture budgets, frameloop y limites de postprocessing.
- Garantiza que la experiencia 3D no tape CTAs ni degrade conversion.

## Mas alla de estos criterios
Prioriza presencia premium estable frente a efectos ostentosos. La escena debe sentirse cara porque esta bien compuesta, no porque consuma recursos sin criterio.

## Limites de seguridad
- No crees escenas de negocio especificas en este prompt.
- No introduzcas assets pesados sin estrategia de carga.
- No bloquees interaccion, formularios, navegacion ni accesibilidad.

## Formato de entrega
Entrega:
- Setup 3D implementado.
- API de uso para escenas.
- Fallbacks.
- Presupuesto de rendimiento.
- Verificacion visual y tecnica.
