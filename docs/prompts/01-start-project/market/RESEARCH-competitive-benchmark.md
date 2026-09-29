---
action: RESEARCH
label: RESEARCH-
phase: 01-start-project
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

# [RESEARCH] - Competitive Benchmark Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: REPORT (Generar conocimiento, benchmarks, oportunidades)

Purpose: Compare the project against relevant alternatives/competitors and discover missing premium opportunities.

## Prompt

Act as a Product Strategist, Staff Product Engineer, UX Researcher, and founder.

Compare this project with the best relevant competitors, adjacent products, open-source alternatives, and user expectations.

## Requisitos mínimos obligatorios

1. Identify competitors and substitutes.
2. Compare feature parity, UX quality, onboarding, pricing or packaging if relevant, integrations, trust signals, docs, performance, and polish.
3. Identify gaps that matter to users, not just feature count.
4. Identify differentiators the project already has.
5. Identify premium features or details users would expect from a top-tier product.

## Más allá de estos criterios

Look for second-order opportunities: fewer features with better flow, better defaults, stronger trust, faster time-to-value, better examples, better migration story, stronger ecosystem fit, or a sharper niche.

Do not recommend copying competitors blindly. If requiring live internet data, ensure references are valid (do not invent facts about competitors).

## Formato de entrega

1. Competitive landscape (competidores y alternativas comparable).
2. Feature and UX parity table.
3. Gaps and weaknesses identified (classified by severity/importance).
4. Differentiation opportunities & differentiators we have.
5. Missing premium details we should adopt.
6. Recommended action plan / Quick wins.
