# Basic Performance Pass

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Detectar y corregir problemas de rendimiento evidentes y de alto impacto (perceptibles por el usuario) en el código y en la carga de recursos.

## Cuándo Usarlo

- En la fase de pulido visual y UX.
- Antes de release web o de la aplicación.

## Cuándo NO Usarlo

- Para realizar microoptimizaciones prematuras sin datos de perfilado o evidencia.

## Criterios Mínimos

- Revisa el tamaño de assets y bundles, llamadas de red innecesarias, re-renders redundantes, bucles ineficientes, operaciones síncronas bloqueantes en el hilo principal y tiempos de carga inicial.
- Identifica cuellos de botella visibles para el usuario o el mantenedor.

## Más allá de estos criterios

Busca el menor cambio que mejore la percepción de velocidad: menor tiempo de espera visual, placeholders de carga amigables, lazy loading de imágenes y datos paginados.

## Límites de Seguridad

No introduzcas mecanismos complejos de caché, debounce o memorización sin necesidad o sin entender su ciclo de vida. No comprometas la corrección lógica por ganar milisegúndos.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mejoras de rendimiento aplicadas. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las optimizaciones de rendimiento aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
