# Clean Code Pass

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
- Cambios explicados.

## Formato de Entrega

1. Deuda encontrada.
2. Cambios seguros aplicados.
3. Cambios propuestos.
4. Riesgos restantes.
