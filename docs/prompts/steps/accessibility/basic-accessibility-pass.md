# Basic Accessibility Pass

## Objetivo

Detectar problemas básicos de accesibilidad antes de release o presentación.

## Cuándo Usarlo

- En `full-polish`.
- En `ux-visual-pass`.
- Antes de publicar UI web.

## Cuándo NO Usarlo

- Si el proyecto no tiene UI o contenido usuario-facing.

## Criterios Mínimos

- Revisa teclado, focus, contraste, labels, semantics, alt text, errores, formularios y reduced motion.
- Comprueba que el flujo principal no dependa solo de color o hover.

## Más allá de estos criterios

Busca accesibilidad como calidad de producto: claridad, previsibilidad, recuperación, lenguaje simple y soporte para usuarios reales.

## Límites de Seguridad

No añadas atributos ARIA incorrectos para aparentar accesibilidad.

## Checks Finales

- Flujo principal navegable.
- Problemas críticos documentados.
- Fixes aplicados o propuestos.

## Formato de Entrega

1. Bloqueadores.
2. Problemas importantes.
3. Fixes.
4. Warnings.
