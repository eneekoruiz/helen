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

# [AUDIT] - Stress, Scale, and Cost Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Find scale, performance, and cost problems before success makes them painful.

## Prompt

Act as an SRE, Staff Engineer, performance engineer, and cost-conscious founder.

Audit the project for growth pressure.

## Requisitos mínimos obligatorios

1. Identify likely scaling dimensions: users, records, files, requests, builds, integrations, tenants, locales, or contributors.
2. Find bottlenecks, unbounded loops, synchronous work, repeated parsing, large assets, expensive queries, and hidden N+1 patterns.
3. Review cacheability, batching, pagination, quotas, rate limits, and backpressure.
4. Estimate cost drivers if infrastructure or third-party services are involved.
5. Identify simple mitigations before premature architecture.

## Más allá de estos criterios

Look for success failure modes: the product works at 10 users but fails at 1,000; works with demo data but not real data; or becomes too expensive to operate.

## Formato de entrega

1. Scaling assumptions.
2. Bottlenecks and risks (classified by severity: Críticos, Importantes, Opcionales).
3. Cost drivers and cost risks.
4. Simple mitigations (short-term).
5. Do-not-overengineer notes.
