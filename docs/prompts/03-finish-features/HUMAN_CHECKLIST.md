---
action: AUDIT
label: AUDIT-
phase: 03-finish-features
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 03 Finish Features

## Que incluye esta fase
- Convertir una interfaz funcional en una experiencia premium.
- Pulir responsive, accesibilidad, microcopy, estados y motion.
- Crear o mejorar experiencias 3D sin matar conversion ni rendimiento.
- Revisar que el producto no parezca plantilla ni IA.

## Que puedes hacer con los prompts de esta fase
- **GENERATE-**: crear setup 3D o componentes visuales nuevos.
- **ENHANCE-**: pulir UI, responsive, accesibilidad, micro-interacciones y escenas existentes.
- **AUDIT-**: revisar UX, calidad visual, regresiones y excelencia Awwwards sin modificar.
- **INIT-**: no aplica salvo reinicio estrategico.

## Checklist humano antes de pasar a Before Production
- [ ] El primer viewport comunica valor y tiene CTA claro.
- [ ] La web funciona bien en movil, tablet y desktop.
- [ ] No hay textos cortados, solapados o desalineados.
- [ ] Existen estados de carga, error, vacio y exito.
- [ ] Las interacciones son sutiles y ayudan, no decoran por decorar.
- [ ] Si hay 3D, tiene fallback y no tapa conversion.
- [ ] La experiencia parece artesanal, no generada.

## Prompts clave
- `generate-3d-global-canvas-setup.md`
- `generate-3d-isolated-experience-component.md`
- `enhance-3d-premium-scene-polish.md`
- `audit-product-ux-and-premium-quality.md`
- `audit-visual-ux-regression-checkpoint.md`
