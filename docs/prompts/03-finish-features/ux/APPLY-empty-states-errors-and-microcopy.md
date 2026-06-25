# [APPLY] - Empty States, Errors, and Microcopy Pass

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Revisar e implementar estados loading, error, empty, success, disabled y destructive, asegurando que los mensajes expliquen qué pasó y qué hacer a continuación de forma clara y accesible.

## Cuándo Usarlo

- Durante la fase de pulido de UX/UI.
- Cuando el producto parece correcto sólo en el "happy path" y carece de feedback en casos de error o vacíos.

## Criterios Mínimos

1. **Identificación de Estados**:
   - Encontrar o añadir vistas/mensajes para cargas largas, datos vacíos, fallos de red, denegaciones de permisos, deshabilitados y confirmaciones destructivas.
2. **Copy y Tono**:
   - Redactar mensajes precisos, amigables y enfocados en la solución. Evitar términos técnicos oscuros, culpabilización del usuario o copy vago como "Ocurrió un error".
3. **Seguridad e Invariantes**:
   - Asegurar que los mensajes de error no expongan secretos, credenciales o trazas de código internas del servidor/cliente.

## Checks Finales

- Estados de UI críticos cubiertos.
- Mensajes de error seguros (no filtran datos).
- Botones de acción o enlaces de recuperación presentes en cada estado.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Estados de usuario y microcopy actualizados. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con estados agregados o textos corregidos]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
