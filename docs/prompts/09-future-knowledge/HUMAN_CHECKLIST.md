---
action: AUDIT
label: AUDIT-
phase: 09-future-knowledge
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 09 Future Knowledge

## Que incluye esta fase
- Preservar contexto para agentes y personas futuras.
- Documentar decisiones, riesgos, gaps y recuperacion.
- Reducir dependencia de una sola persona.
- Hacer que el proyecto sobreviva a cambios de equipo o herramienta.

## Que puedes hacer con los prompts de esta fase
- **GENERATE-**: crear contexto IA, decision logs y documentacion de continuidad.
- **AUDIT-**: revisar bus factor, gaps de conocimiento, onboarding y resistencia legacy.
- **ENHANCE-**: automatizar preservacion de conocimiento.
- **INIT-**: no aplica salvo rediseño de gobernanza.

## Checklist humano de continuidad
- [ ] Las decisiones importantes tienen razon y fecha.
- [ ] Un agente futuro puede entender estructura, objetivos y restricciones.
- [ ] Los riesgos no resueltos estan documentados.
- [ ] El onboarding no depende de memoria oral.
- [ ] Hay ruta de recuperacion si se pierde contexto.
- [ ] La documentacion no es ruido: ayuda a reconstruir decisiones.

## Prompts clave
- `generate-ai-context.md`
- `generate-decision-log.md`
- `audit-bus-factor.md`
- `audit-future-developer-onboarding.md`
- `apply-automated-knowledge-preservation.md`
