# [AUDIT] - API, Integration, and Contract Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


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
