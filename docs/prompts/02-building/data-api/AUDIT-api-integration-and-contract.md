---
action: AUDIT
label: AUDIT-
phase: 02-building
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

# [AUDIT] - API, Integration, and Contract Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Ensure APIs, integrations, SDKs, webhooks, and external contracts are stable, documented, and safe to evolve.

## Prompt

Act as a Staff Platform Engineer, API designer, integration engineer, and developer-experience reviewer.

Review this repository for API and integration contract quality.

## Requisitos mínimos obligatorios

1. Identify public APIs, internal APIs, CLI contracts, config schemas, file formats, webhooks, SDK surfaces, plugin interfaces, and third-party integrations.
2. Check request/response shape, validation, errors, versioning, compatibility, retries, idempotency, rate limits, timeouts, and authentication.
3. Review docs, examples, fixtures, tests, mocks, and contract assumptions.
4. Identify breaking-change risk and undocumented behavior.
5. Check whether integrations fail safely and diagnose clearly.

## Más allá de estos criterios

Look for contract traps: hidden magic conventions, undocumented defaults, weak error taxonomy, impossible migrations, callback ambiguity, duplicate concepts, or APIs that are easy to use wrong.

Prefer smaller stable contracts over broad unstable surfaces.

## Formato de entrega

1. Contract inventory.
2. Breaking risks and integration failure risks (classified by severity: Críticos, Importantes, Opcionales).
3. Documentation and test gaps.
4. Recommended contract improvements.
5. Verdict: `CONTRACTS SOUND`, `CONTRACTS FRAGILE`, or `BREAKING RISK`.
