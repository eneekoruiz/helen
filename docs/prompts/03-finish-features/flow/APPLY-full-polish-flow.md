# [APPLY] - Full Polish Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Elevar un proyecto funcional a un nivel claramente más refinado en UX, diseño visual, responsive, accesibilidad, clean code y rendimiento sin convertir el flujo en release final.

## Fase Ideal

Al finalizar funcionalidades y antes de pruebas de producción o hardening final.

## Prompts Incluidos

1. [initial-project-risk-scan.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/audit/audit-initial-project-risk-scan.md)
2. [primary-user-experience-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/ux/audit-primary-user-experience.md)
3. [premium-visual-polish-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/apply-premium-visual-polish-pass.md)
4. [responsive-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/apply-responsive-pass.md)
5. [empty-states-errors-and-microcopy.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/ux/apply-empty-states-errors-and-microcopy.md)
6. [safe-clean-code-simplification-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/clean-code/apply-safe-clean-code-simplification-pass.md)
7. [basic-performance-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-performance-pass.md)
8. [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-accessibility-pass.md)
9. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/qa/audit-fast-build-test-verification.md)

## Checkpoints Entre Pasos

- **Inicio (UX/Visual)**: Cargar [visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/flow/audit-visual-ux-regression-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-test-suite-checkpoint.md).

## Condiciones para Avanzar

- El proyecto funciona perfectamente y compila sin errores.
- Los cambios aplicados son acotados y seguros.

## Cuándo Detenerse

- Si el linter, compilación o tests fallan de forma no recuperable rápidamente.
- Si un cambio visual o de UX requiere replantear decisiones fundamentales de diseño del producto.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Full polish completado con éxito. / [o] ⚠️ Completado con advertencias.

Mejoras aplicadas:
- [Breve lista de 1-3 viñetas con las correcciones visuales, de UX o código aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
