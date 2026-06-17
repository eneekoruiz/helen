# Loading, Error, and Empty States Audit

## Objetivo

Revisar estados loading, error, empty, success, disabled y destructive.

## Cuándo Usarlo

- Antes de un release.
- En `full-polish`.
- Cuando el producto parece correcto solo en el happy path.

## Cuándo NO Usarlo

- Si no hay interfaz, CLI ni mensajes de usuario.

## Criterios Mínimos

- Encuentra estados ausentes o débiles.
- Comprueba copy, accesibilidad, acción siguiente y recuperación.
- Revisa errores de red, datos vacíos, permisos, loading largo y fallos parciales.

## Más allá de estos criterios

Busca micro-momentos donde el producto puede ganar confianza: mensajes calmados, acciones claras, ejemplos útiles, prevención de errores y feedback específico.

## Límites de Seguridad

No ocultes errores reales con copy bonito. No reduzcas información necesaria para soporte.

## Checks Finales

- Estados críticos cubiertos.
- Copy accionable.
- Errores no exponen secretos.

## Formato de Entrega

1. Estados faltantes.
2. Estados débiles.
3. Copy recomendado.
4. Fixes aplicados o propuestos.
