# Fast Build and Test Verification

**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Ejecutar la verificación rápida adecuada para saber si se puede seguir avanzando.

## Cuándo Usarlo

- Entre fases de desarrollo.
- Después de cambios de código significativos.
- Antes de release candidate.

## Cuándo NO Usarlo

- Como sustituto de QA manual o auditoría profunda cuando el riesgo es alto.

## Criterios Mínimos

- Detecta scripts disponibles en el proyecto.
- Ejecuta build, typecheck, lint, tests o smoke checks según aplique.
- Si un comando no existe, documenta la ausencia y propone un sustituto.

## Más allá de estos criterios

Busca el set mínimo de comandos que da la máxima confianza técnica en el menor tiempo posible.

## Límites de Seguridad

No cambies los tests de prueba para ocultar fallos de código. No ignores errores reportados por comandos principales.

## Checks Finales

- Comandos ejecutados.
- Resultado claro (PASA/FALLA).
- Siguiente acción definida.

## Formato de Entrega

1. Checks disponibles.
2. Checks ejecutados.
3. Resultado.
4. Bloqueadores y fallos (clasificados por severidad: Críticos, Importantes, Opcionales).
5. Warnings.
