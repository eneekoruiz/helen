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

# [GENERATE] - 3D Isolated Experience Component

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Crear componentes 3D aislados como escenas, carruseles, product showcases o elementos interactivos usando el setup global existente.

## Cuando usarlo
- Después de `generate-3d-global-canvas-setup.md`.
- Cuando se necesita una escena concreta ligada a una seccion de venta.
- Para crear carruseles, showcases, hero objects o visualizaciones interactivas.

## Prompt
Actúa como UI UX PRO MAX, Creative Technologist y CRO Designer. Construye un componente 3D aislado que aumente percepcion de valor y ayude a vender, sin convertirse en una distraccion.

Entradas:
- Setup 3D disponible: `{{SETUP_3D}}`
- Seccion objetivo: `{{SECCION_OBJETIVO}}`
- Mensaje comercial: `{{MENSAJE_COMERCIAL}}`
- Assets disponibles: `{{ASSETS}}`
- Restricciones responsive: `{{RESPONSIVE}}`

## Requisitos minimos obligatorios
- Usa el canvas/provider existente.
- Mantén el componente encapsulado: props claras, cleanup, limites de estado y sin dependencias globales innecesarias.
- Define camara, luces, materiales y animacion con intención visual.
- Anade interaccion sutil: hover, drag, focus o scroll solo si mejora comprension o deseo.
- Incluye fallback no 3D y reduced motion.
- Verifica que CTA, textos y navegacion siguen legibles y clicables.
- Optimiza geometrias, texturas y postprocessing.

## Mas alla de estos criterios
Si una escena no mejora la narrativa comercial, conviertela en un detalle mas sobrio. El estándar es aspecto de 40K, no ruido visual.

## Limites de seguridad
- No dupliques setup global.
- No crees logica de negocio dentro de la escena.
- No uses assets sin licencia o sin optimizacion.

## Formato de entrega
Entrega:
- Componente 3D.
- Integracion en la seccion.
- Fallback.
- Parametros de ajuste visual.
- Verificacion responsive.
