---
action: AUDIT
label: AUDIT-
phase: 06-release
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 06 Release

## Que incluye esta fase
- Preparar version publicable.
- Generar notas, changelog y paquete demo.
- Validar que no se publica algo roto o confuso.
- Cerrar versionado, tags y checklist final.

## Que puedes hacer con los prompts de esta fase
- **GENERATE-**: crear release notes, changelog y paquete de demo.
- **AUDIT-**: comprobar readiness antes de publicar.
- **ENHANCE-**: ejecutar flujo de release candidate o automatizaciones.
- **INIT-**: preparar checklist operativo de salida.

## Checklist humano antes de publicar
- [ ] Version, changelog y notas de release estan claros.
- [ ] Build y tests pasan.
- [ ] No hay secretos, TODOs privados ni archivos basura.
- [ ] El paquete demo explica valor y uso sin inflar promesas.
- [ ] El release candidate tiene veredicto claro.
- [ ] Rollback o recuperacion basica esta entendida.

## Prompts clave
- `plan-release-checklist.md`
- `generate-release-notes-changelog-and-demo-package.md`
- `audit-release-readiness-checkpoint.md`
- `apply-release-candidate-flow.md`
