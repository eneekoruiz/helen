# Final Code Quality Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Deep audit only. Use this prompt when the project is mostly implemented and you need a hard technical judgment before stabilizing, shipping, archiving, or showing it.

Purpose: Decide whether the codebase is technically safe enough to leave alone.

Expected output:
- severity-ordered findings;
- smallest credible fixes;
- additional senior-engineering opportunities;
- a hard `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this codebase as a strict senior engineer performing a final code quality audit.

Goal: identify the smallest set of changes required to prevent avoidable bugs, maintenance debt, operational confusion, false confidence, and future fragility without changing intended behavior unnecessarily.

Audit posture:
- Be skeptical by default.
- Inspect the whole repository, not only the obvious source files.
- Treat checklists as minimum coverage, not as the limit of your review.
- Prefer evidence from code paths, tests, config, scripts, docs, and generated outputs.
- Do not recommend refactors for taste.
- Do not let the project pass because it feels "good enough".

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Bugs and correctness
- Look for runtime breakage, inconsistent state transitions, missing null handling, stale assumptions, race conditions, unhandled promise rejections, boundary-condition errors, and partial-success states.
- Review error paths as aggressively as success paths.
- Check destructive flows, rollback behavior, retries, file writes, async orchestration, CLI/API behavior, and any logic that can partially succeed.

2. Structure and maintainability
- Review whether files and modules have clear responsibilities.
- Identify dead code, misleading abstractions, hidden coupling, duplicated business rules, and naming that obscures intent.
- Penalize unnecessary indirection, excessive helper layers, and premature abstraction.

3. Architecture fitness
- Check whether the architecture matches the real size and complexity of the project.
- Identify global mutable state, circular dependencies, brittle registries, magic conventions, and extension points that are harder to reason about than the project needs.
- Flag places where one small change is likely to create distant regressions.

4. Configuration and environment safety
- Review startup config, required environment variables, defaults, parsing, validation, and failure messaging.
- Check whether `.env.example`, sample configs, docs, and code agree.
- Flag any setting that is optional in docs but mandatory in code.

5. Dependency and script hygiene
- Review whether dependencies still serve a clear purpose.
- Identify stale, duplicated, abandoned, overlapping, or overpowered packages.
- Check scripts for accuracy, naming clarity, and real usefulness.

6. Basic security and data safety
- Review input validation, secret handling, path safety, environment leakage, logging, permissions, and output encoding.
- Check for accidental exposure of tokens, internal URLs, stack traces, private data, or local machine assumptions.

7. Errors, logs, and diagnosability
- Review whether failures are visible, actionable, and bounded.
- Flag swallowed errors, vague messages, noisy logs, generic catch blocks, and success messages after partial failure.

8. Validation and tests
- Review whether tests cover risky paths, not just happy paths.
- Identify missing tests around rollback, malformed input, config failure, persistence, edge cases, and CLI/API failure modes.
- Flag brittle, low-signal, or outdated tests.

9. Practical performance
- Look for repeated work, unnecessary rendering, oversized assets, synchronous bottlenecks, repeated parsing, unbounded loops, and avoidable startup cost.
- Ignore trivia; flag only issues with practical impact.

10. Production honesty
- Compare code reality against documentation, scripts, metadata, badges, and claims.
- Flag any place where the repo implies more stability, safety, completeness, or maturity than the code supports.

## Más allá de estos criterios

Act like a Staff Engineer with full project context.

Look for improvements the checklist did not name: simplification opportunities, redundant components, architectural friction, future maintenance traps, weak boundaries, inconsistent conventions, surprising user-facing behavior, rough developer experience, and anything that makes the project feel less professional than it could.

You may propose or apply additional improvements if they increase quality, reduce complexity, improve maintainability, improve UX, strengthen coherence, or reduce future risk.

Do not make arbitrary changes. Do not introduce dependencies, rewrite large areas, change stack, or refactor broadly unless the current design is itself a meaningful risk.

## Automatic fail conditions

- A likely runtime bug exists in a core path.
- A documented setup path is broken or misleading.
- Required config is not validated clearly.
- A destructive or stateful operation can leave the project partially broken without recovery.
- Critical flows rely on hidden assumptions with no tests or guards.
- Logs or error handling hide the real cause of failure.
- The codebase appears more stable in docs or scripts than it is in practice.

## Formato de entrega

1. List findings first, ordered by severity (Críticos, Importantes, Opcionales).
2. For each finding include: severity, file, what is wrong, why it matters, and the smallest credible fix.
3. Then list "Más allá de estos criterios" opportunities worth considering.
4. Separate must-fix items from optional improvements.
5. State `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. End with one short paragraph explaining what would still worry you if this project shipped unchanged.
