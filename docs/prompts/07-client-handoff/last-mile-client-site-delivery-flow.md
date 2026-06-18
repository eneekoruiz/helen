# Last-Mile Client Site Delivery Flow

**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Ejecutar la última capa de revisión antes de una demo, publicación o entrega de una web: contenido, CMS, enlaces, formularios, CTAs, assets, navegador, responsive, accesibilidad básica y handoff.

## Fase Ideal

Al finalizar la estabilización de releases (Client Handoff).

## Prompts Incluidos

1. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/fast-build-test-verification.md)
2. [content-copy-brand-and-claims-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/content-copy-brand-and-claims-audit.md)
3. [cms-editable-content-conversion.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/cms-editable-content-conversion.md)
4. [links-forms-ctas-and-conversion-paths-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/links-forms-ctas-and-conversion-paths-audit.md)
5. [media-assets-alt-text-and-performance-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/media-assets-alt-text-and-performance-audit.md)
6. [responsive-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/responsive-pass.md)
7. [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/basic-accessibility-pass.md)
8. [browser-smoke-test-and-demo-readiness-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/browser-smoke-test-and-demo-readiness-audit.md)
9. [client-handoff-and-support-readiness.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/client-handoff-and-support-readiness.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/build-and-compile-checkpoint.md).
- **Post-conversiones**: Validar visualmente que no hay layout shift ni controles solapados.
- **Post-enlaces/forms**: Smoke test manual de los formularios de contacto y enlaces primarios.
- **Post-assets/responsive**: Cargar [visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual-ux-regression-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-readiness-checkpoint.md).

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
