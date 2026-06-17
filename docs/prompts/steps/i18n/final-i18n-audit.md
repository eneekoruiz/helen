# Final i18n Atomic Audit

## Objetivo

Verificar que el soporte multilingüe sea real, coherente y honesto.

## Cuándo Usarlo

- En `release-candidate`.
- Cuando el proyecto afirma soportar más de un idioma.

## Cuándo NO Usarlo

- Si el proyecto es monolingüe y no afirma lo contrario.

## Criterios Mínimos

- Revisa hardcoded strings, claves faltantes, formato locale, rutas, fallback, selector de idioma, metadata y consistencia terminológica.

## Más allá de estos criterios

Busca si el producto se siente nativo en cada idioma o solo traducido parcialmente.

## Límites de Seguridad

No añadas idiomas nuevos sin razón. No maquilles soporte incompleto.

## Checks Finales

- No hay leaks críticos de idioma.
- Claims multilingües son honestos.
- Riesgos documentados.

## Formato de Entrega

1. Bloqueadores.
2. Inconsistencias.
3. Fixes.
4. Veredicto.
