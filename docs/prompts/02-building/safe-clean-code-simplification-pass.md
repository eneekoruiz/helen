# Safe Clean Code Simplification Pass

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Reducir complejidad, duplicación y riesgo técnico sin cambiar comportamiento.

## Cuándo Usarlo

- Después de una auditoría rápida.
- Antes de hardening o release candidate.
- Cuando el código funciona pero se siente frágil.

## Cuándo NO Usarlo

- Si el proyecto no compila.
- Para hacer refactors estéticos grandes sin valor claro.

## Criterios Mínimos

- Revisa responsabilidades, nombres, duplicación, acoplamiento, dead code, errores silenciosos y abstracciones.
- Prioriza cambios pequeños y seguros.
- Conserva comportamiento existente.

## Más allá de estos criterios

Busca simplificaciones que reduzcan carga mental: borrar código, fusionar helpers, aclarar límites, eliminar convenciones mágicas y hacer más obvio el camino correcto.

## Límites de Seguridad

No cambies APIs públicas ni contratos sin justificación. No hagas refactors masivos.

## Checks Finales

- Build/typecheck si aplica.
- Tests relevantes si existen.

## Formato de Entrega

El entregable debe ser minimalista e directo al grano. Produce únicamente:

```text
✅ Todo correcto. / [o] ⚠️ Se aplicaron cambios con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con los cambios exactos aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones como: ejecutar npm run build, configurar variable X, etc.]
```
*No generes informes extensos ni explicaciones teóricas.*
