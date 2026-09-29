---
action: AUDIT
label: AUDIT-
phase: 03-finish-features
modifies_code: false
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

# [AUDIT] - Primary User Experience Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Evalúar si los flujos principales son claros, útiles, recuperables y coherentes.

## Cuándo Usarlo

- En `full-polish-flow`.
- Antes de un visual pass.
- Antes de publicar una app, CLI o experiencia de producto.

## Cuándo NO Usarlo

- Si el proyecto no tiene superficie de usuario ni interacción relevante.
- Si el flujo principal todavía no existe.

## Criterios Mínimos

- Revisa flujo principal, onboarding, navegación, labels, estados, errores y recuperación.
- Detecta fricción, pasos innecesarios, ambigüedad y feedback insuficiente.
- Evalúa experiencia en primer uso y repetición.

## Más allá de estos criterios

Piensa como UX Researcher y Staff Product Engineer. Busca dónde el usuario dudaría, abandonaría, malinterpretaría el producto o sentiría que algo no está terminado.

## Límites de Seguridad

No rediseñes el producto entero sin evidencia. Propón cambios grandes antes de aplicarlos.

## Checks Finales

- Flujo principal revisado.
- Fricciones priorizadas.
- Mejoras separadas entre quick wins y decisiones de producto.

## Formato de Entrega

1. Bloqueadores y fricciones UX (clasificados por severidad: Críticos, Importantes, Opcionales).
2. Quick wins (bajo esfuerzo).
3. Decisiones de producto pendientes.
4. Recomendación para el siguiente paso.
