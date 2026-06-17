# Full Polish Flow

## Objetivo

Elevar un proyecto funcional a un nivel claramente más refinado sin convertir el flujo en release final.

## Fase Ideal

Después de feature-complete básico y antes de prefinal hardening.

## Prompts Incluidos

1. `../steps/audit/initial-project-risk-scan.md`
2. `../steps/ux/primary-user-experience-audit.md`
3. `../steps/visual/premium-visual-polish-pass.md`
4. `../steps/visual/responsive-pass.md`
5. `../steps/ux/loading-error-empty-states.md`
6. `../steps/clean-code/safe-clean-code-simplification-pass.md`
7. `../steps/performance/basic-performance-pass.md`
8. `../steps/accessibility/basic-accessibility-pass.md`
9. `../steps/testing/fast-build-test-verification.md`

## Orden Exacto

1. Quick audit.
2. UX general.
3. Visual premium.
4. Responsive.
5. Loading/error/empty states.
6. Clean code.
7. Performance básica.
8. Accessibility básica.
9. Fast verification.

## Checkpoints Entre Pasos

- Después del paso 1: decide si continuar o corregir bloqueadores.
- Después del paso 5: `../checkpoints/visual-ux-regression-checkpoint.md`.
- Después del paso 6: `../checkpoints/lint-and-typecheck.md` si hay cambios de código.
- Al final: `../checkpoints/test-suite-checkpoint.md` si existen tests.

## Condiciones para Avanzar

- No hay bloqueadores obvios del flujo principal.
- Los cambios son acotados.
- Los checkpoints requeridos pasan o quedan warnings explícitos.

## Cuándo Detenerse

- El proyecto no compila.
- El flujo principal está roto.
- Una mejora requiere rediseño amplio o decisión de producto.
- Hay riesgo de romper comportamiento existente.

## Qué Hacer si Falla Algo

1. Corrige el fallo más pequeño y verificable.
2. Repite el checkpoint.
3. Si el fallo requiere decisión, detén el flujo y explica opciones.

## Resumen Final

Entrega:

1. pasos ejecutados;
2. mejoras aplicadas;
3. checkpoints;
4. riesgos restantes;
5. próximos pasos recomendados.
