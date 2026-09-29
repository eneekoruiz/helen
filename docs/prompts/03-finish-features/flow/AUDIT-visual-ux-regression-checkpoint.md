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

# [AUDIT] - Visual and UX Regression Checkpoint

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Confirm user-facing changes are coherent, usable, and not visually broken.

## Command

If the app has a local dev server and browser tooling, open the relevant screen and capture screenshots.

## Manual Review

Check:
- primary flow;
- responsive layout;
- loading/error/empty states;
- keyboard focus;
- text overflow;
- obvious contrast problems;
- visual hierarchy;
- screenshots or public assets if relevant.

## Blocks Progress

- Broken layout in primary viewport.
- Text overlap or unreadable UI.
- Primary flow cannot be completed.
- Visual state contradicts product behavior.

## Warning Only

- Minor spacing or copy polish outside the primary flow.
- Visual improvement that requires design/product decision.

## Recovery

Fix the smallest visible issue, recheck the affected viewport, and record what remains.
