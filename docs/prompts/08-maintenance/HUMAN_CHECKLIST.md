---
action: AUDIT
label: AUDIT-
phase: 08-maintenance
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 08 Maintenance

## Que incluye esta fase
- Mantener calidad despues de publicar.
- Revisar backups, datos, dependencia, gobernanza y crecimiento.
- Evitar que la biblioteca de prompts se infle sin orden.
- Mejorar credibilidad publica y presencia profesional.

## Que puedes hacer con los prompts de esta fase
- **AUDIT-**: detectar deuda operativa, riesgos de datos, crecimiento o gobernanza.
- **ENHANCE-**: aplicar mantenimiento, dependabot, branding o portfolio.
- **GENERATE-**: crear briefs o artefactos de agente.
- **INIT-**: redefinir sistema operativo de calidad si el repo crecio demasiado.

## Checklist humano recurrente
- [ ] Dependencias y scripts siguen sanos.
- [ ] Backups y recuperacion estan entendidos.
- [ ] No hay prompts duplicados o contradictorios.
- [ ] La documentacion publica sigue siendo verdadera.
- [ ] Los costes, datos y automatizaciones siguen bajo control.
- [ ] Hay oportunidades de crecimiento priorizadas por ROI.

## Prompts clave
- `apply-prompt-library-maintenance-flow.md`
- `audit-repository-governance-and-compliance.md`
- `audit-data-lifecycle-backup-and-recovery.md`
- `audit-growth-model.md`
