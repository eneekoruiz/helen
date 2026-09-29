---
action: AUDIT
label: AUDIT-
phase: 08-maintenance
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

# [AUDIT] - Growth Model Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: REPORT (Generar conocimiento, benchmarks, oportunidades)

Purpose: Identify how the product attracts, activates, retains, and expands users.

## Prompt

Act as a Growth Engineer, Product Manager, founder, and analytics-minded Staff Engineer.

Review the product growth model.

## Requisitos mínimos obligatorios

1. Define acquisition, activation, retention, referral, and conversion paths.
2. Identify missing instrumentation.
3. Review upgrade moments, sharing loops, onboarding nudges, and reactivation paths if relevant.
4. Find points where users get value but are not guided to continue.
5. Identify growth claims without evidence.

## Más allá de estos criterios

Look for low-cost growth leverage: better examples, shareable output, templates, public artifacts, SEO pages, invite loops, lifecycle emails, or clearer conversion moments.

Do not add growth mechanics that damage trust.

## Formato de entrega

1. Current growth model.
2. Missing metrics and measurement gaps.
3. Activation and retention opportunities (classified by severity/leverage).
4. Recommended growth experiments.
5. Risks and anti-patterns.
