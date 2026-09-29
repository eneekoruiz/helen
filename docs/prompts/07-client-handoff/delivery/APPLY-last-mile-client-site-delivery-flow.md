---
action: APPLY
label: APPLY-
phase: 07-client-handoff
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

# [APPLY] - Last-Mile Client Site Delivery Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Ejecutar la última capa de revisión antes de una demo, publicación o entrega de una web: contenido, CMS, enlaces, formularios, CTAs, assets, navegador, responsive, accesibilidad básica y handoff.

## Fase Ideal

Al finalizar la estabilización de releases (Client Handoff).

## Prompts Incluidos

1. [fast-build-test-verification.md](../../04-before-production/qa/AUDIT-fast-build-test-verification.md)
2. [content-copy-brand-and-claims-audit.md](../marketing/AUDIT-content-copy-brand-and-claims.md)
3. [cms-editable-content-conversion.md](../../02-building/cms/APPLY-cms-editable-content-conversion-flow.md)
4. [links-forms-ctas-and-conversion-paths-audit.md](../marketing/AUDIT-links-forms-ctas-and-conversion-paths.md)
5. [media-assets-alt-text-and-performance-audit.md](../verification/AUDIT-media-assets-alt-text-and-performance.md)
6. [responsive-pass.md](../../03-finish-features/visual/APPLY-responsive-pass.md)
7. [basic-accessibility-pass.md](../../03-finish-features/performance/APPLY-basic-accessibility-pass.md)
8. [browser-smoke-test-and-demo-readiness-audit.md](../verification/AUDIT-browser-smoke-test-and-demo-readiness.md)
9. [client-handoff-and-support-readiness.md](AUDIT-client-handoff-and-support-readiness.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-conversiones**: Validar visualmente que no hay layout shift ni controles solapados.
- **Post-enlaces/forms**: Smoke test manual de los formularios de contacto y enlaces primarios.
- **Post-assets/responsive**: Cargar [visual-ux-regression-checkpoint.md](../../03-finish-features/flow/AUDIT-visual-ux-regression-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](../../06-release/flow/AUDIT-release-readiness-checkpoint.md).

## Condiciones para Avanzar

- No se detectan placeholders visibles en las rutas principales de conversión.
- Todos los formularios envían datos correctamente a sus destinos reales de producción/staging.

## Cuándo Detenerse

- Si algún link crítico o botón de CTA conduce a un error `404` o página en blanco.
- Si hay textos falsos, placeholders de Lorem Ipsum, o imágenes rotas visibles.

## Resumen Final

1. Estado de entrega: `CMS READY`, `CMS READY WITH CAVEATS` o `NOT READY`.
2. Cambios aplicados durante el flujo.
3. Rutas y flujos probados.
4. Estado de links/forms/CTAs.
5. Estado de assets y Social Preview.
6. Bloqueadores restantes para la demo.
7. Warnings aceptados.
