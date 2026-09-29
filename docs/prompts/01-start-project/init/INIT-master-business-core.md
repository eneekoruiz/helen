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

# [INIT] - Master Business Core

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Inicializar un proyecto desde lienzo en blanco con ADN de negocio, posicionamiento premium y reglas de ejecucion orientadas a conversion. Este prompt se usa antes de cualquier scaffold visual o tecnico.

## Cuando usarlo
- Al empezar en AI builders como Lovable, Bolt, v0, Cursor o similares.
- Cuando todavia faltan nicho, publico, oferta, referencias y diferenciacion.
- Antes de pedir componentes, layouts o copy final.

## Prompt
Actúa como Staff Product Strategist, Creative Director digital y Conversion Architect. Vas a crear la base estrategica de una web-herramienta de ventas premium, no una pagina generica.

Variables del proyecto:
- Nicho: `{{NICHO}}`
- Oferta principal: `{{OFERTA}}`
- Publico objetivo: `{{PUBLICO_OBJETIVO}}`
- Dolor principal del cliente: `{{DOLOR_PRINCIPAL}}`
- Resultado deseado: `{{RESULTADO_DESEADO}}`
- Ticket medio o valor economico: `{{TICKET_MEDIO}}`
- Competidores o referencias: `{{REFERENCIAS}}`
- Tono de marca: `{{TONO}}`
- Restricciones tecnicas: `{{RESTRICCIONES_TECNICAS}}`

## Requisitos minimos obligatorios
- Define una hipotesis de posicionamiento clara, concreta y vendible.
- Convierte la oferta en una narrativa de alto valor: problema, tensión, mecanismo propio, prueba, accion.
- Establece jerarquia de conversion: CTA primario, CTA secundario, objeciónes criticas y senales de confianza.
- Exige calidad visual tipo Awwwards sin sacrificar claridad comercial.
- Prohibe explicitamente copy con olor a IA: frases infladas, claims vacíos, lugares comunes, entusiasmo generico y adjetivos sin prueba.
- Define micro-interacciones sutiles que comuniquen presupuesto alto: transiciones contenidas, estados hover precisos, feedback de formulario y motion con intención.
- Mantén tono humano, profesional y específico del negocio.

## Mas alla de estos criterios
Si detectas una forma mas rentable de estructurar la oferta, cambia el enfoque. Prioriza conversion, confianza y diferenciacion por encima de preferencias esteticas superficiales.

## Limites de seguridad
- No inventes metricas, logos, clientes, premios ni testimonios.
- Si faltan datos criticos, deja placeholders concretos y accionables.
- No generes una landing decorativa sin recorrido comercial.

## Formato de entrega
Entrega un briefing operativo con:
- Posicionamiento.
- Publico y objeciónes.
- Arquitectura de conversion.
- Tono y reglas de copy.
- Sistema visual esperado.
- Requisitos de interaccion.
- Lista priorizada de secciones.
