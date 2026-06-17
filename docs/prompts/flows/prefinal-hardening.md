# Prefinal Hardening Flow

## Objetivo

Endurecer el proyecto antes de convertirlo en release candidate.

## Fase Ideal

Después de full polish y antes de release candidate.

## Prompts Incluidos

1. `../steps/testing/fast-build-test-verification.md`
2. `../steps/clean-code/safe-clean-code-simplification-pass.md`
3. `../steps/security/security-hardening.md`
4. `../steps/performance/basic-performance-pass.md`
5. `../steps/accessibility/basic-accessibility-pass.md`
6. `../steps/ux/loading-error-empty-states.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de clean code: `../checkpoints/lint-and-typecheck.md`
- Después de security: `../checkpoints/security-risk-checkpoint.md`
- Final: `../checkpoints/test-suite-checkpoint.md`

## Condiciones para Avanzar

- Compilación pasa.
- Riesgos críticos de seguridad no quedan abiertos.
- Cambios de limpieza no alteran comportamiento.

## Cuándo Detenerse

- Build, typecheck o tests fallan.
- Aparece vulnerabilidad crítica.
- Se detecta deuda que requiere rediseño mayor.

## Qué Hacer si Falla Algo

Corrige, repite el checkpoint y resume. Si la corrección es mayor, pide confirmación.

## Resumen Final

1. Hardening aplicado.
2. Checks ejecutados.
3. Bloqueadores eliminados.
4. Warnings aceptados.
5. Preparación para `release-candidate`.
