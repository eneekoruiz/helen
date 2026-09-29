---
action: APPLY
label: APPLY-
phase: 04-before-production
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

# [APPLY] - Prefinal Hardening Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Endurecer la seguridad, robustez y calidad técnica del proyecto antes de empaquetar y marcar el código como release candidate.

## Fase Ideal

Al finalizar la construcción y pulido visual (Before Production).

## Prompts Incluidos

1. [fast-build-test-verification.md](../qa/AUDIT-fast-build-test-verification.md)
2. [safe-clean-code-simplification-pass.md](../../02-building/clean-code/APPLY-safe-clean-code-simplification-pass.md)
3. [security-hardening.md](../../02-building/security/APPLY-security-hardening-flow.md)
4. [basic-performance-pass.md](../../03-finish-features/performance/APPLY-basic-performance-pass.md)
5. [basic-accessibility-pass.md](../../03-finish-features/performance/APPLY-basic-accessibility-pass.md)
6. [empty-states-errors-and-microcopy.md](../../03-finish-features/ux/APPLY-empty-states-errors-and-microcopy.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](../../02-building/checkpoint/AUDIT-lint-and-typecheck-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](AUDIT-security-risk-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](../../02-building/checkpoint/AUDIT-test-suite-checkpoint.md).

## Condiciones para Avanzar

- La compilación e inicialización del entorno son exitosas.
- No quedan abiertos riesgos de seguridad críticos.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Prefinal hardening completado con éxito. / [o] ⚠️ Completado con advertencias.

Mejoras aplicadas:
- [Breve lista de 1-3 viñetas con los parches de seguridad/robustez aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
