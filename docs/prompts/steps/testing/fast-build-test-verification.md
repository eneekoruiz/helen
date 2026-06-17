# Fast Build and Test Verification

## Objetivo

Ejecutar la verificación rápida adecuada para saber si se puede seguir avanzando.

## Cuándo Usarlo

- Entre fases.
- Después de cambios de código.
- Antes de release candidate.

## Cuándo NO Usarlo

- Como sustituto de QA manual o auditoría profunda cuando el riesgo es alto.

## Criterios Mínimos

- Detecta scripts disponibles.
- Ejecuta build, typecheck, lint, tests o smoke checks según aplique.
- Si un comando no existe, documenta la ausencia y propone sustituto.

## Más allá de estos criterios

Busca el set mínimo de comandos que da máxima confianza sin gastar tiempo innecesario.

## Límites de Seguridad

No cambies tests para ocultar fallos. No ignores errores de comandos principales.

## Checks Finales

- Comandos ejecutados.
- Resultado claro.
- Siguiente acción definida.

## Formato de Entrega

1. Checks disponibles.
2. Checks ejecutados.
3. Resultado.
4. Bloqueadores.
5. Warnings.
