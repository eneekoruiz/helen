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

# [AUDIT] - Adversarial QA and Edge Cases Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Find bugs that normal happy-path testing misses.

## Prompt

Act as a QA Lead, Security Engineer, Staff Engineer, and impatient real user.

Attack the project with edge cases.

## Requisitos mínimos obligatorios

1. Identify critical flows and risky inputs.
2. Test or reason through malformed data, empty data, huge data, duplicate actions, slow network, cancelled actions, permission failures, partial failures, and repeated retries.
3. Review destructive flows and rollback behavior.
4. Check race conditions, concurrency, idempotency, and state recovery.
5. Identify missing regression tests.

## Más allá de estos criterios

Think of weird but plausible user behavior, integration failures, time-based bugs, browser differences, file-system oddities, and state combinations nobody designed for.

## Formato de entrega

1. Edge-case matrix.
2. Bugs found or potential risks (classified by severity: Críticos, Importantes, Opcionales).
3. Missing tests.
4. Manual QA script.
5. Must-fix before release.
