---
action: AUDIT
label: AUDIT-
phase: 02-building
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 02 Building

## Que incluye esta fase
- Construir funcionalidades reales.
- Mantener codigo limpio, modular y seguro.
- Definir modelos de datos, contratos de API y automatizaciones.
- Implementar CMS si el cliente va a editar contenido.
- Verificar build, lint, tipos y tests durante el desarrollo.

## Que puedes hacer con los prompts de esta fase
- **GENERATE-**: crear CMS, modelos, integraciones o componentes nuevos.
- **ENHANCE-**: refactorizar, endurecer seguridad o convertir contenido existente sin romperlo.
- **AUDIT-**: revisar datos, APIs, scripts, arquitectura y CMS antes de tocar codigo.
- **INIT-**: solo si hay que redefinir la base porque el proyecto empezo mal.

## Checklist humano antes de pasar a Finish Features
- [ ] Las funcionalidades principales existen y son usables.
- [ ] No hay secretos ni credenciales expuestas.
- [ ] Los modelos de datos y contratos de API son coherentes.
- [ ] El CMS separa contenido editable de estructura fija.
- [ ] Si hay i18n, los campos traducibles y universales estan diferenciados.
- [ ] Build, lint, tipos o tests relevantes pasan.
- [ ] La implementacion no introduce deuda absurda para el valor que aporta.

## Prompts clave
- `generate-visual-cms-wysiwyg-i18n.md`
- `apply-cms-editable-content-conversion-flow.md`
- `audit-data-model-and-domain-integrity.md`
- `audit-api-integration-and-contract.md`
- `audit-build-and-compile-checkpoint.md`
