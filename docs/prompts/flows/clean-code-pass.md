# Clean Code Pass Flow

## Objetivo

Simplificar y endurecer código sin cambiar comportamiento.

## Fase Ideal

Después de funcionalidad estable y antes de hardening final.

## Prompts Incluidos

1. `../steps/audit/initial-project-risk-scan.md`
2. `../steps/clean-code/safe-clean-code-simplification-pass.md`
3. `../steps/testing/fast-build-test-verification.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de clean code: `../checkpoints/lint-and-typecheck.md`
- Final: `../checkpoints/test-suite-checkpoint.md`

## Condiciones para Avanzar

- No hay refactor masivo.
- Comportamiento existente se conserva.
- Verificación pasa.

## Cuándo Detenerse

- Cambios requieren rediseño.
- Tests o typecheck fallan.
- El cambio toca demasiadas áreas sin necesidad.

## Qué Hacer si Falla Algo

Revertir o ajustar solo tu propio cambio. No tocar cambios ajenos.

## Resumen Final

1. Simplificaciones.
2. Riesgos reducidos.
3. Checks.
4. Deuda restante.
