---
action: AUDIT
label: AUDIT-
phase: 04-before-production
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

# [AUDIT] - Fast Build and Test Verification

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Ejecutar la verificación rápida adecuada para saber si se puede seguir avanzando.

## Cuándo Usarlo

- Entre fases de desarrollo.
- Después de cambios de código significativos.
- Antes de release candidate.

## Cuándo NO Usarlo

- Como sustituto de QA manual o auditoría profunda cuando el riesgo es alto.

## Criterios Mínimos

- Detecta scripts disponibles en el proyecto.
- Ejecuta build, typecheck, lint, tests o smoke checks según aplique.
- Si un comando no existe, documenta la ausencia y propone un sustituto.

## Más allá de estos criterios

Busca el set mínimo de comandos que da la máxima confianza técnica en el menor tiempo posible.

## Límites de Seguridad

No cambies los tests de prueba para ocultar fallos de código. No ignores errores reportados por comandos principales.

## Checks Finales

- Comandos ejecutados.
- Resultado claro (PASA/FALLA).
- Siguiente acción definida.

## Formato de Entrega

1. Checks disponibles.
2. Checks ejecutados.
3. Resultado.
4. Bloqueadores y fallos (clasificados por severidad: Críticos, Importantes, Opcionales).
5. Warnings.
