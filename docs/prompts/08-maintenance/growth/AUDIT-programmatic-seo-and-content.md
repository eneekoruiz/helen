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

# [AUDIT] - Programmatic SEO and Content Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Discover whether the project can grow through useful, scalable, search-friendly content.

## Prompt

Act as an SEO strategist, Growth Engineer, content designer, and technical founder.

Audit the project for content and programmatic SEO opportunities.

## Requisitos mínimos obligatorios

1. Identify searchable user intents.
2. Review existing pages, docs, metadata, headings, internal links, schema, and indexability.
3. Identify content templates that could scale without becoming spam.
4. Check whether examples, templates, integrations, or comparisons can become useful landing pages.
5. Flag SEO claims without technical support.

## Más allá de estos criterios

Look for content moats: calculators, galleries, examples, templates, benchmarks, comparisons, migration guides, changelog-driven pages, or community artifacts.

Reject thin pages and keyword stuffing.

## Formato de entrega

1. Search opportunity map.
2. Technical SEO blockers and content gaps (classified by severity: Críticos, Importantes, Opcionales).
3. Programmatic page ideas and content templates.
4. Prioritized experiments.
