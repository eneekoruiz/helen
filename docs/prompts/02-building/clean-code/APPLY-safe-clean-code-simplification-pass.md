---
action: APPLY
label: APPLY-
phase: 02-building
modifies_code: true
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md
verification:
  - inspect_relevant_files
  - run_available_checks
---

# [APPLY] - Safe Clean Code Simplification Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


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

- **Zero Código Muerto**: Asegura la eliminación estricta de variables, importaciones, funciones, clases, componentes o archivos no utilizados (código muerto). Es un criterio crítico y de alta prioridad.
- Revisa responsabilidades, nombres, duplicación, acoplamiento, errores silenciosos y abstracciones.
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
