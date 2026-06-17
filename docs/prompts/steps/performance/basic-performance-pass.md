# Basic Performance Pass

## Objetivo

Detectar problemas de rendimiento evidentes y de alto impacto.

## Cuándo Usarlo

- En `full-polish`.
- Antes de release web o CLI.
- Después de cambios visuales o arquitectónicos.

## Cuándo NO Usarlo

- Para microoptimizar sin evidencia.

## Criterios Mínimos

- Revisa bundle/assets, render innecesario, loops, parsing repetido, operaciones síncronas, llamadas duplicadas y carga inicial.
- Identifica cuellos de botella visibles para usuario o mantenedor.

## Más allá de estos criterios

Busca el menor cambio que mejore percepción: menos espera, mejor feedback, lazy loading razonable, datos paginados, trabajo evitado.

## Límites de Seguridad

No introduzcas caching complejo sin necesidad. No rompas corrección por velocidad.

## Checks Finales

- Problemas reales separados de trivia.
- Mejoras aplicadas o propuestas.
- Riesgos de rendimiento documentados.

## Formato de Entrega

1. Hallazgos.
2. Impacto.
3. Fixes.
4. No hacer todavía.
