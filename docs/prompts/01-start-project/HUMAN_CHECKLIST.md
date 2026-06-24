---
action: AUDIT
label: AUDIT-
phase: 01-start-project
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 01 Start Project

## Que incluye esta fase
- Entender el negocio antes de construir.
- Definir oferta, publico, dolor, conversion y tono.
- Detectar riesgos iniciales del repositorio o del proyecto.
- Analizar competidores y referencias.
- Priorizar roadmap por impacto real, no por capricho tecnico.

## Que puedes hacer con los prompts de esta fase
- **INIT-**: arrancar desde cero con ADN de negocio y scaffold premium.
- **AUDIT-**: revisar riesgos, metodologia, arquitectura, competidores y onboarding sin tocar codigo.
- **GENERATE-**: crear una funcionalidad competitiva cuando el analisis ya esta claro.
- **ENHANCE-**: mejorar una base existente si el proyecto ya empezo.

## Checklist humano antes de pasar a Building
- [ ] La oferta esta escrita de forma clara y vendible.
- [ ] El publico objetivo y sus objeciones estan definidos.
- [ ] Hay una conversion principal y una secundaria.
- [ ] Se han revisado competidores o referencias relevantes.
- [ ] El roadmap prioriza ventas, confianza y reduccion de friccion.
- [ ] No quedan placeholders criticos sin resolver.
- [ ] La arquitectura inicial no contradice el objetivo comercial.

## Prompts clave
- `init-master-business-core.md`
- `init-architecture-and-scaffold.md`
- `audit-competitor-analysis.md`
- `generate-competitive-cloning.md`
- `audit-initial-project-risk-scan.md`
