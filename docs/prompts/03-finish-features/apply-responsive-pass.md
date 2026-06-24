# Responsive Pass

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Verificar y corregir de forma segura que las superficies de la UI funcionen correctamente en mobile, tablet y desktop.

## Cuándo Usarlo

- En la fase de pulido visual y UX.
- Antes de capturas públicas o release web.

## Cuándo NO Usarlo

- Si el proyecto no tiene interfaz de usuario responsive.

## Criterios Mínimos

- Revisa viewports pequeños (móvil), medianos (tablet) y grandes (desktop).
- Corrige overflow horizontal, solapes, menús rotos, botones inaccesibles, textos cortados y densidades incorrectas.
- Comprueba que el flujo principal se pueda completar en todos los dispositivos.

## Más allá de estos criterios

Evalúa si cada viewport parece diseñado de forma nativa e intenciónada, no simplemente encogido o forzado por CSS.

## Límites de Seguridad

Evita reestructurar layouts grandes sin necesidad. Corrige primero los problemas de visualización e interacción visibles y bloqueantes.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Ajustes de responsive aplicados. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las correcciones responsive aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
