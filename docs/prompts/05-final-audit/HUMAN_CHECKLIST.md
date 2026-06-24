---
action: AUDIT
label: AUDIT-
phase: 05-final-audit
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 05 Final Audit

## Que incluye esta fase
- Emitir veredictos finales, no seguir improvisando.
- Auditar codigo, documentacion, i18n, repositorio y calidad visual 40K.
- Separar bloqueos reales de mejoras opcionales.
- Decidir si el proyecto esta listo para release.

## Que puedes hacer con los prompts de esta fase
- **AUDIT-**: revisar con severidad sin modificar codigo.
- **GENERATE-**: crear runbooks o artefactos finales si faltan.
- **ENHANCE-**: solo como tarea derivada, nunca mezclada con la auditoria.
- **INIT-**: no aplica; si hace falta, el proyecto no esta listo.

## Checklist humano antes de pasar a Release
- [ ] Calidad de codigo tiene veredicto PASS o PASS WITH CAVEATS.
- [ ] La documentacion coincide con el estado real del repo.
- [ ] La presentacion publica no tiene placeholders ni promesas falsas.
- [ ] i18n no muestra claves crudas ni fallbacks rotos.
- [ ] La auditoria visual no detecta aspecto barato, IA o plantilla.
- [ ] Los bloqueos criticos estan cerrados o aceptados explicitamente.

## Prompts clave
- `audit-code-quality.md`
- `audit-documentation.md`
- `audit-i18n-flow.md`
- `audit-visual-quality-40k.md`
- `generate-runbook.md`
