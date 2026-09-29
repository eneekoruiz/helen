---
action: AUDIT
label: AUDIT-
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

# [AUDIT] - Analisis de Competidor

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Auditar webs rivales o referencias para extraer patrones utiles de UX, CRO, contenido, funcionalidades, friccion y posicionamiento. No modifica codigo.

## Cuando usarlo
- Antes de decidir roadmap o funcionalidades.
- Cuando hay competidores concretos que ya venden bien.
- Antes de usar `generate-competitive-cloning.md`.

## Prompt
Actúa como Competitive Intelligence Lead, CRO Auditor y UX Strategist. Analiza las webs indicadas con mentalidad de negocio: que venden, como reducen friccion, que funcionalidades sostienen la conversion y donde podemos superarlas.

Entradas:
- URLs competidoras: `{{URLS_COMPETIDORES}}`
- Nuestro nicho/oferta: `{{NICHO_OFERTA}}`
- Publico objetivo: `{{PUBLICO_OBJETIVO}}`
- Stack propio: `{{STACK_PROPIO}}`

## Requisitos minimos obligatorios
- Examina primer viewport, narrativa, CTA, formularios, prueba social, pricing, flujos, trust signals y objeciónes.
- Extrae funcionalidades concretas, no descripciones vagas.
- Identifica patrones repetidos entre competidores y oportunidades que ninguno resuelve bien.
- Evalúa UX movil y desktop por separado.
- Senala friccion comercial: pasos innecesarios, claims débiles, formularios pobres, falta de prueba o navegacion confusa.
- Clasifica hallazgos por impacto en conversion y dificultad estimada.

## Mas alla de estos criterios
No copies estetica por inercia. Distingue entre patrones que convierten y decoracion que solo parece cara. Propón oportunidades donde podamos ser mas claros, rapidos o memorables.

## Limites de seguridad
- Solo audita. No escribas ni modifiques archivos.
- No inventes datos de trafico, facturacion o rendimiento.
- Si no puedes acceder a una web, declara la limitacion y trabaja con capturas o contenido disponible.

## Formato de entrega
Entrega:
- Tabla comparativa por competidor.
- Funcionalidades clave detectadas.
- Gaps de nuestro producto.
- Oportunidades prioritarias.
- Recomendacion de que pasar a implementacion con `GENERATE`.
