# Clean Code and Staff Architecture Audit Flow

## Objetivo

Ejecutar una revisión exigente de clean code, mantenibilidad y arquitectura sin hacer refactors arbitrarios.

## Fase Ideal

Después de que el proyecto funcione y antes de hardening o release candidate.

## Prompts Incluidos

1. `../steps/audit/quick-project-audit.md`
2. `../steps/architecture/staff-architecture-audit.md`
3. `../steps/clean-code/clean-code-pass.md`
4. `../steps/testing/fast-verification.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de arquitectura: decidir si los cambios son seguros o requieren confirmación.
- Después de clean code: `../checkpoints/lint-and-typecheck.md`
- Final: `../checkpoints/test-suite-checkpoint.md`

## Condiciones para Avanzar

- Build o typecheck inicial no falla.
- Los cambios son pequeños, reversibles y con impacto claro.
- Las recomendaciones arquitectónicas grandes quedan separadas de fixes inmediatos.

## Cuándo Detenerse

- El proyecto no compila.
- La mejora requiere rediseño de arquitectura.
- El flujo detecta contratos públicos que podrían romperse.
- No hay tests o checks suficientes para validar un refactor.

## Qué Hacer si Falla Algo

Corrige solo defectos pequeños y verificables. Para cambios estructurales, entrega propuesta y pide confirmación.

## Resumen Final

1. Hallazgos clean code.
2. Hallazgos arquitectura.
3. Cambios aplicados.
4. Cambios propuestos.
5. Checks ejecutados.
6. Veredicto de mantenibilidad.
