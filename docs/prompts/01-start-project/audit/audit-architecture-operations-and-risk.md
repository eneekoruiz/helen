# [AUDIT] - Architecture, Operations, and Risk Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Detect structural, operational, security, reliability, QA, and maintainability risks before they become expensive.

Use this prompt when a project is moving from prototype toward something reusable, public, maintained, deployed, or relied on by others.

Expected output:
- architectural risks;
- operational gaps;
- security and data concerns;
- QA strategy gaps;
- future-maintenance risks;
- prioritized mitigations.

## Prompt

Review this repository as a Principal Engineer, software architect, Security Engineer, SRE, DevOps Engineer, QA Lead, and technical founder.

Goal: determine whether the project can survive realistic growth, maintenance, operational use, user mistakes, dependency drift, and future feature work without becoming fragile.

Inspect the whole repository: source, tests, configs, scripts, CI, docs, templates, generated artifacts, examples, and release conventions.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Architecture and boundaries
- Review module responsibilities, dependency direction, extensión points, shared state, registries, plugin systems, and cross-cutting concerns.
- Flag coupling, circularity, hidden conventions, and abstractions that are either missing or premature.
- Check whether the architecture fits the current project size and likely next stage.

2. Operational readiness
- Review build, test, release, rollback, logging, error reporting, configuration, environment assumptions, and recovery paths.
- Flag workflows that only work on the original developer machine.
- Check whether failures are visible, actionable, and recoverable.

3. Security and abuse resistance
- Review input validation, path handling, secret handling, dependency risk, unsafe defaults, permissions, logs, output encoding, and trust boundaries.
- Consider misuse, malicious input, accidental disclosure, and supply-chain drift.
- Flag risks even if the project is small, but calibrate severity to reality.

4. Reliability and resilience
- Review retries, partial failures, idempotency, rollback behavior, destructive operations, race conditions, timeouts, and resource cleanup.
- Identify flows that can leave the system in an inconsistent state.

5. QA and verification strategy
- Check whether tests cover risky behavior rather than only happy paths.
- Review manual QA needs, regression risks, fixtures, mocks, and coverage around configuration, edge cases, and failure paths.
- Flag claims that lack automated or repeatable evidence.

6. Maintainability and future change
- Identify areas likely to become expensive as features grow.
- Flag unclear naming, duplicated rules, weak docs, brittle tests, and hidden knowledge.
- Recommend small design moves that preserve optionality.

## Más allá de estos criterios

Use expert judgment to identify risks not captured above.

Think about scaling of contributors, support burden, incident response, versioning, migration, deprecation, plugin compatibility, analytics, observability, privacy, legal expectations, enterprise readiness, and product-market consequences.

You may recommend not building something, deleting code, reducing surface area, or explicitly documenting a limitation if that improves the project's long-term health.

Do not over-engineer. Every mitigation must match the project's maturity and likely use.

## Formato de entrega

1. Start with risks that could break users, data, release confidence, or future development, classified by severity (Críticos, Importantes, Opcionales).
2. For each risk include: severity, evidence, scenario, recommended mitigation, and effort.
3. List architecture simplifications worth considering.
4. List operational checks or scripts that would add real confidence.
5. List security and QA follow-ups separately.
6. End with a verdict: `READY TO SCALE MODESTLY`, `STABLE BUT FRAGILE`, or `ARCHITECTURAL RISK`.
7. Include one paragraph on what would worry you most six months from now.
