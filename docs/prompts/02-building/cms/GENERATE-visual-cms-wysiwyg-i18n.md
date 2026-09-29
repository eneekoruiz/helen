---
action: GENERATE
label: GENERATE-
phase: 02-building
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

# [GENERATE] - Visual CMS WYSIWYG i18n

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


## Proposito e intención
Implementar un CMS visual protegido para que el cliente final edite contenido comercial sin tocar codigo, con soporte i18n diferenciando campos universales y traducibles.

## Cuando usarlo
- Durante Building, cuando el sitio ya tiene estructura comercial estable.
- Cuando el cliente necesita editar textos, imagenes, CTAs o bloques de venta.
- Antes del handoff si habra mantenimiento por parte de negocio.

## Prompt
Actúa como Principal CMS Architect, Product Engineer y i18n Lead. Implementa un CMS WYSIWYG seguro, claro y mantenible para contenido de ventas. El cliente debe poder gestionar la web sin ver codigo ni romper el diseno.

Entradas:
- Stack actual: `{{STACK}}`
- Idiomas soportados: `{{IDIOMAS}}`
- Roles de edicion: `{{ROLES}}`
- Modelo de contenido deseado: `{{MODELO_CONTENIDO}}`
- Restricciones de persistencia: `{{PERSISTENCIA}}`

## Requisitos minimos obligatorios
- Audita primero que contenido debe ser editable y que debe permanecer fijo.
- Separa campos universales de campos traducibles.
- Campos universales: slugs tecnicos, orden, visibilidad, relaciones, layout, media compartida, flags de campana.
- Campos traducibles: titulares, subtitulos, body copy, CTAs, alt text, SEO title, SEO description, FAQs y mensajes de formulario.
- Protege el diseno: limites de longitud, tipos de campo, validaciones, previews y fallback por idioma.
- Incluye permisos o modo protegido para evitar edicion accidental de componentes criticos.
- Anade preview visual y estados de borrador/publicado si el stack lo permite.
- Mantén el CMS orientado a ventas: CTAs, pruebas, objeciónes y bloques de confianza deben ser editables con intención.

## Mas alla de estos criterios
Si el proyecto no necesita un CMS completo, implementa una capa editorial minima pero robusta. La simplicidad que protege la conversion vale mas que un panel enorme que el cliente no usara.

## Limites de seguridad
- No expongas secretos, tokens ni configuracion sensible en el cliente.
- No permitas HTML libre sin sanitizacion.
- No rompas rutas ni SEO existente al introducir i18n.
- No generes traducciones inventadas como contenido definitivo.

## Formato de entrega
Entrega:
- Modelo de contenido.
- Implementacion del CMS.
- Matriz universal/traducible.
- Validaciones.
- Instrucciones minimas para el cliente.
- Verificacion ejecutada.
