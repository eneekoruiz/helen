# Staff-Level Architecture Audit

## Objetivo

Evaluar arquitectura, límites, acoplamiento y evolución futura con un estándar de Staff/Principal Engineer.

## Cuándo Usarlo

- En auditorías exigentes de clean code y arquitectura.
- Antes de refactors importantes.
- Antes de release si el proyecto creció rápido.

## Cuándo NO Usarlo

- Para justificar una reescritura grande sin evidencia.
- Cuando el proyecto es trivial y no tiene superficie arquitectónica real.

## Criterios Mínimos

- Revisa módulos, responsabilidades, dependencia entre capas, estado compartido, contratos, configuración, extensibilidad, nombres, duplicación y puntos de cambio.
- Identifica acoplamiento oculto, convenciones mágicas, abstracciones prematuras y ausencia de límites.
- Distingue deuda real de preferencias personales.

## Más allá de estos criterios

Piensa como auditor exigente de una empresa top-tier. Pregunta qué cambio futuro rompería el sistema, qué parte nadie querrá tocar, qué límite conceptual está borroso y qué simplificación eliminaría riesgo.

## Límites de Seguridad

No reestructures el proyecto completo sin confirmación. Propón refactors amplios antes de aplicarlos.

## Checks Finales

- Riesgos arquitectónicos priorizados.
- Simplificaciones seguras identificadas.
- Refactors grandes separados de fixes pequeños.

## Formato de Entrega

1. Riesgos de arquitectura.
2. Límites débiles.
3. Simplificaciones.
4. Refactors propuestos.
5. Veredicto.
