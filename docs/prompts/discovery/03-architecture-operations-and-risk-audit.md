# Architecture, Operations, and Risk Audit

Purpose: detect structural, operational, security, reliability, QA, and maintainability risks before they become expensive.

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
- Review module responsibilities, dependency direction, extension points, shared state, registries, plugin systems, and cross-cutting concerns.
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

## Output format

1. Start with risks that could break users, data, release confidence, or future development.
2. For each risk include: severity, evidence, scenario, recommended mitigation, and effort.
3. List architecture simplifications worth considering.
4. List operational checks or scripts that would add real confidence.
5. List security and QA follow-ups separately.
6. End with a verdict: `READY TO SCALE MODESTLY`, `STABLE BUT FRAGILE`, or `ARCHITECTURAL RISK`.
7. Include one paragraph on what would worry you most six months from now.
