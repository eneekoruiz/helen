# Clean Code Pass Flow

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Simplificar y mejorar el código de forma segura sin alterar el comportamiento funcional del proyecto.

## Fase Ideal

Durante el desarrollo de funcionalidades (Building).

## Prompts Incluidos

1. [initial-project-risk-scan.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/initial-project-risk-scan.md)
2. [safe-clean-code-simplification-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/safe-clean-code-simplification-pass.md)
3. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/fast-build-test-verification.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/build-and-compile-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/test-suite-checkpoint.md).

## Condiciones para Avanzar

- No se realizan refactorizaciones masivas.
- Se conserva todo el comportamiento existente.
- Todos los checkpoints pasan sin fallos de compilación.

## Cuándo Detenerse

- Si los cambios de simplificación requieren rediseño arquitectónico.
- Si los tests o los typechecks fallan.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Clean code pass completado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con simplificaciones de código aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones como correr tests manualmente]
```
*No generes informes extensos ni explicaciones teóricas.*
