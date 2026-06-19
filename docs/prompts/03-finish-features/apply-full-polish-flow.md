# Full Polish Flow

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Elevar un proyecto funcional a un nivel claramente más refinado en UX, diseño visual, responsive, accesibilidad, clean code y rendimiento sin convertir el flujo en release final.

## Fase Ideal

Al finalizar funcionalidades y antes de pruebas de producción o hardening final.

## Prompts Incluidos

1. [initial-project-risk-scan.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/initial-project-risk-scan.md)
2. [primary-user-experience-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/primary-user-experience-audit.md)
3. [premium-visual-polish-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/premium-visual-polish-pass.md)
4. [responsive-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/responsive-pass.md)
5. [empty-states-errors-and-microcopy.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/empty-states-errors-and-microcopy.md)
6. [safe-clean-code-simplification-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/safe-clean-code-simplification-pass.md)
7. [basic-performance-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/basic-performance-pass.md)
8. [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/basic-accessibility-pass.md)
9. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/fast-build-test-verification.md)

## Checkpoints Entre Pasos

- **Inicio (UX/Visual)**: Cargar [visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual-ux-regression-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/test-suite-checkpoint.md).

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
