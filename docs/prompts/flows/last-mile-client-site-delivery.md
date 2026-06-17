# Last-Mile Client Site Delivery Flow

## Objetivo

Ejecutar la última capa de revisión antes de demo, publicación o entrega de una web: contenido, CMS, enlaces, formularios, CTAs, assets, navegador, responsive, accesibilidad básica y handoff.

## Fase Ideal

Después de que el producto compile y antes de enseñar, entregar, grabar demo o publicar.

## Prompts Incluidos

1. `../steps/testing/fast-build-test-verification.md`
2. `../last-mile/01-content-copy-brand-and-claims-audit.md`
3. `../cms/01-static-content-to-editable-cms-fields.md`
4. `../last-mile/02-links-forms-ctas-and-conversion-paths-audit.md`
5. `../last-mile/03-media-assets-alt-text-and-performance-audit.md`
6. `../steps/visual/responsive-pass.md`
7. `../steps/accessibility/basic-accessibility-pass.md`
8. `../last-mile/04-browser-smoke-test-and-demo-readiness-audit.md`
9. `../steps/delivery/client-delivery-readiness.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de CMS/contenido: revisar visualmente que no hubo cambios de layout.
- Después de links/forms: smoke test manual de los caminos principales.
- Después de assets/responsive/accessibility: `../checkpoints/visual-ux-regression-checkpoint.md`
- Final: `../checkpoints/release-readiness-checkpoint.md`

## Condiciones para Avanzar

- El proyecto compila o el bloqueo está documentado y aceptado.
- No hay placeholders visibles en caminos principales.
- CTAs y formularios críticos tienen destino claro.
- Assets principales cargan bien y no rompen layout.
- CMS/editable fields no degradan SEO, accesibilidad ni diseño.
- La demo puede ejecutarse sin errores obvios.

## Cuándo Detenerse

- Build o runtime básico falla.
- Formulario crítico no tiene destino o pierde datos.
- Hay contenido falso, claims dudosos o información privada visible.
- Hay links rotos en rutas principales.
- El primer viewport o mobile principal está roto.
- Una mejora requiere decisión de negocio, legal, CMS o cliente.

## Qué Hacer si Falla Algo

Corregir fallos locales y seguros. Repetir el checkpoint afectado. Si el fallo requiere credenciales, proveedor externo, decisión de negocio o cambio de contrato, parar y dejar una decisión explícita.

## Resumen Final

1. Estado de entrega.
2. Cambios aplicados.
3. Rutas y flujos probados.
4. CMS/editable status.
5. Links/forms/CTAs status.
6. Assets/media status.
7. Demo blockers.
8. Warnings aceptables.
9. Comandos/checks ejecutados.
