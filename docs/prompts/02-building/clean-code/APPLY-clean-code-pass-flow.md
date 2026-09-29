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

# [APPLY] - Clean Code Pass Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Simplificar y mejorar el código de forma segura sin alterar el comportamiento funcional del proyecto.

## Fase Ideal

Durante el desarrollo de funcionalidades (Building).

## Prompts Incluidos

1. [initial-project-risk-scan.md](../../01-start-project/audit/AUDIT-initial-project-risk-scan.md)
2. [safe-clean-code-simplification-pass.md](APPLY-safe-clean-code-simplification-pass.md)
3. [fast-build-test-verification.md](../../04-before-production/qa/AUDIT-fast-build-test-verification.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](../checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](../checkpoint/AUDIT-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](../checkpoint/AUDIT-test-suite-checkpoint.md).

## Condiciones para Avanzar

- No se realizan refactorizaciones masivas.
- Se conserva todo el comportamiento existente.
- Todos los checkpoints pasan sin fallos de compilación.

## Cuándo Detenerse

- Si los cambios de simplificación requieren rediseño arquitectónico.
- Si los tests o los typechecks fallan.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Clean code pass completado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con simplificaciones de código aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones como correr tests manualmente]
```
*No generes informes extensos ni explicaciones teóricas.*
