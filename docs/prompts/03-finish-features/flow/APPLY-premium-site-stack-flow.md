---
action: APPLY
label: APPLY-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
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

# [APPLY] - Premium Site Stack Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Construir o elevar una web premium siguiendo un stack de trabajo completo: inspiración, diseño, textos, animación y componentes, calidad, SEO y publicación.

## Fase Ideal

Al iniciar el pulido de una web visual y hasta dejarla publicada.

## Prompts Incluidos

1. [design-md-and-inspiration](../../01-start-project/init/INIT-design-md-and-inspiration.md): inspiración y `DESIGN.md`.
2. [portfolio-layout-patterns](../visual/GENERATE-portfolio-layout-patterns.md): patrón de layout.
3. [taste-visual-pov](../visual/ENHANCE-taste-visual-pov.md): criterio visual propio.
4. [ai-trace-erasure-and-human-craft](../visual/AUDIT-ai-trace-erasure-and-human-craft.md): eliminar rastros de plantilla o IA.
5. [copy-humanization-and-cro](../visual/ENHANCE-copy-humanization-and-cro.md): textos y conversión.
6. [motion-polish-and-transitions](../motion/ENHANCE-motion-polish-and-transitions.md) y [scroll-linked-sequences](../motion/ENHANCE-scroll-linked-sequences.md): animación al hacer scroll.
7. [modern-ui-libraries](../visual/GENERATE-modern-ui-libraries-aceternity-magic-ui.md): componentes listos.
8. [basic-accessibility-pass](../performance/APPLY-basic-accessibility-pass.md) y [basic-performance-pass](../performance/APPLY-basic-performance-pass.md): calidad y rendimiento.
9. [final-seo](../../04-before-production/compliance/AUDIT-final-seo.md): SEO técnico.
10. [deploy-github-and-hosting](../../06-release/deploy/APPLY-deploy-github-and-hosting.md): publicación.

## Herramientas opcionales (catálogo de skills)

Cada paso puede apoyarse en una herramienta externa. Revísala antes con [third-party-skills-supply-chain](../../08-maintenance/ops/AUDIT-third-party-skills-supply-chain.md) y elige **una sola** skill de diseño principal:

| Paso | Herramienta | Comando informativo |
|---|---|---|
| Inspiración | awesome-design-md, google design.md | `helen skills external awesome-design-md` |
| Diseño | taste-skill, impeccable o ui-ux-pro-max | `helen skills external taste-skill` |
| Textos | humanizer, cro-optimization | `helen skills external humanizer` |
| Animación | scroll-craft | `helen skills external scroll-craft` |
| Componentes | 21st.dev | `helen skills external 21st-dev` |
| Calidad | web-design-guidelines | `helen skills external web-design-guidelines` |
| Verificación visual | playwright-cli | `helen skills external playwright-cli` |
| SEO | seo (ECC) | `helen skills external seo` |

## Checkpoints Entre Pasos

- **Inicio**: cargar [build-and-compile-checkpoint](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Tras animación**: cargar [visual-ux-regression-checkpoint](AUDIT-visual-ux-regression-checkpoint.md).
- **Antes de publicar**: cargar [release-readiness-checkpoint](../../06-release/flow/AUDIT-release-readiness-checkpoint.md).

## Condiciones para Avanzar

- La web compila y los tests pasan.
- Sin regresiones visuales ni de accesibilidad.
- Ninguna skill de terceros instalada sin revisión.

## Cuándo Detenerse

- Si el rendimiento cae fuera del presupuesto acordado.
- Si un paso requiere inventar contenido, testimonios o métricas.
- Si falta el material real del cliente (imágenes, textos, permisos).

## Resumen Final

1. Pasos completados y omitidos, con motivo.
2. Herramientas externas usadas y su versión.
3. Cambios aplicados.
4. Riesgos pendientes.
5. Acciones manuales (imágenes, dominio, variables de entorno).
