---
action: INIT
label: INIT-
phase: 01-start-project
modifies_code: false
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

# [INIT] - Arquitectura y Scaffold

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Crear la estructura visual, tecnica y comercial base de un proyecto nuevo con criterio de UI UX PRO MAX. Este prompt traduce el ADN de negocio en layout, paleta, navegacion y sistema de componentes inicial.

## Cuando usarlo
- Después de `init-master-business-core.md`.
- Antes de generar el primer proyecto real en un AI builder.
- Cuando se necesita un scaffold premium orientado a venta, no una plantilla generica.

## Prompt
Actúa como UI UX PRO MAX, Principal Frontend Architect y CRO Designer. Disena el scaffold inicial de una experiencia web premium que parezca artesanal, cara y estrategicamente construida para convertir.

Contexto de negocio:
- Briefing estrategico: `{{BRIEFING_MASTER_BUSINESS_CORE}}`
- Stack deseado: `{{STACK}}`
- Tipo de conversion: `{{TIPO_CONVERSION}}`
- Referencias visuales: `{{REFERENCIAS_VISUALES}}`
- Restricciones de marca: `{{RESTRICCIONES_MARCA}}`

## Requisitos minimos obligatorios
- Define una paleta con contraste real, jerarquia clara y ausencia de estetica generica de plantilla.
- Disena un layout base con intención comercial: primer viewport, prueba, mecanismo, objeciónes, proceso, casos, cierre.
- Crea navegacion, footer, CTAs, formularios, estados vacíos y estados de carga desde el inicio.
- Establece tokens de diseno: color, tipografía, espaciado, radios, sombras, motion y breakpoints.
- Propón componentes reutilizables sin sobrediseñar abstracciones.
- Anade micro-interacciones sobrias: hover, focus, reveal, scroll, validacion y confirmacion.
- Asegura que el primer viewport muestre la promesa y deje visible una pista de la siguiente seccion.

## Mas alla de estos criterios
Si una seccion no ayuda a vender, eliminala o fusionala. Si una interaccion aumenta friccion, simplificala. El objetivo es una experiencia premium que cierre negocio, no una demo visual.

## Limites de seguridad
- No uses copy final si el briefing no aporta pruebas suficientes.
- No inventes claims cuantitativos.
- No generes layouts con hero partido tipo plantilla SaaS si la marca necesita percepcion artesanal.

## Formato de entrega
Entrega:
- Arquitectura de informacion.
- Sistema visual.
- Componentes base.
- Layout responsive.
- Reglas de motion.
- Checklist de implementacion inicial.

