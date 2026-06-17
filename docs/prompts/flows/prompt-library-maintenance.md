# Prompt Library Maintenance Flow

## Objetivo

Mantener la biblioteca de prompts pequeña en intención, amplia en cobertura, coherente, accesible por CLI y resistente a duplicados.

## Fase Ideal

Después de añadir, renombrar, fusionar o eliminar prompts. También antes de una publicación importante del repositorio.

## Prompts Incluidos

1. `../agent-quality/02-prompt-library-integrity-and-coverage-audit.md`
2. `../agent-quality/01-agent-workflow-and-prompt-quality-audit.md`
3. `../orchestration/00-prompt-router.md`
4. `../orchestration/03-cross-audit-synthesis.md`

## Checkpoints Entre Pasos

- Inicio: leer `../STANDARDS.md`, `../TAXONOMY.md`, `../COVERAGE.md`, `../registry.json` y `../README.md`.
- Después del audit de integridad: validar que cada propuesta sea merge, rename, removal, doc update, test update o nueva intención real.
- Después de cambios estructurales: validar registry y resolución CLI.
- Final: ejecutar typecheck/tests si el repo los tiene.

## Condiciones para Avanzar

- Cada prompt nuevo cubre una intención distinta.
- Cada rename actualiza referencias.
- Cada flujo sigue teniendo orden, checkpoints, stop conditions y resumen final.
- La README explica cómo encontrar lo nuevo.
- `COVERAGE.md` evita duplicados futuros.

## Cuándo Detenerse

- Una intención nueva parece solaparse con una existente.
- Un rename rompe referencias.
- La registry no parsea.
- La CLI no puede resolver un prompt importante.
- La mejora aumenta complejidad sin mejorar uso real.

## Qué Hacer si Falla Algo

Corregir el problema localmente, repetir la validación afectada y no seguir añadiendo prompts hasta que el sistema vuelva a estar coherente.

## Resumen Final

1. Cambios estructurales.
2. Cambios de prompts.
3. Cambios de registry/CLI.
4. Duplicados eliminados o evitados.
5. Gaps cerrados.
6. Gaps restantes.
7. Validaciones ejecutadas.
