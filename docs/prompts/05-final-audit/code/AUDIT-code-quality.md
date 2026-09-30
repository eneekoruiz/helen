---
action: AUDIT
phase: 05-final-audit
summary: Strict final code audit: bugs, structure, architecture fit, config, dependencies, errors, tests and honesty of claims. PASS, PASS WITH CAVEATS or FAIL.
modifies_code: false
aliases:
  - audit-clean-code-architecture-flow
---

# Code Quality and Architecture Audit

## Goal

Decide whether the codebase is technically safe to ship, hand over or leave alone, and name the smallest set of changes that prevents avoidable bugs, debt and false confidence.

## Use when

- The project is mostly implemented and needs a hard technical judgment before stabilizing, shipping, archiving or showing it.
- During building, as an architecture review before large changes.

## Requirements

Be skeptical, inspect the whole repository (code, tests, config, scripts, docs, generated output) and treat this list as the minimum.

1. **Correctness:** runtime breakage, inconsistent state transitions, missing null handling, race conditions, unhandled rejections, boundary errors, partial-success states. Review error paths as hard as success paths, including destructive flows, rollback, retries, file writes and async orchestration.
2. **Structure:** clear responsibilities, dead code, misleading abstractions, hidden coupling, duplicated business rules, names that hide intent, needless indirection.
3. **Architecture fit:** layers and dependency direction, global mutable state, circular dependencies, brittle registries, magic conventions; where one change causes distant regressions.
4. **Configuration:** required environment variables, defaults, parsing, validation and error messages; `.env.example`, docs and code agree.
5. **Dependencies and scripts:** stale, duplicated, abandoned or overpowered packages; scripts that are inaccurate or useless.
6. **Security and data safety:** input validation, secrets, path safety, logging, permissions, output encoding, leaked internals.
7. **Diagnosability:** swallowed errors, vague messages, noisy logs, success reported after partial failure.
8. **Tests:** risky paths covered (rollback, malformed input, config failure, persistence, edge cases); brittle or low-signal tests.
9. **Practical performance:** repeated work, needless rendering, oversized assets, synchronous bottlenecks, unbounded loops. Ignore trivia.
10. **Honesty:** docs, scripts, badges and claims versus the real code.

**Automatic FAIL:** a likely runtime bug in a core path; a broken or misleading documented setup; required config not validated; a destructive operation that can leave the project broken without recovery; critical flows relying on untested hidden assumptions; errors hiding the real cause; docs claiming more stability than exists.

## Beyond the checklist

Look for simplifications, redundant components, weak boundaries, inconsistent conventions and rough developer experience. Recommend refactors only when the current design is itself a risk, never for taste.

## Limits

- Audit only: do not modify files. For fixes, use `apply-clean-code-pass-flow` or a targeted change the user approves.
- No new dependencies, stack changes or broad rewrites in recommendations unless the design is the risk.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. Include the file for each.
2. Must-fix items separated from optional improvements.
3. Architecture map and larger refactor proposals, if any.
4. Verdict: `PASS`, `PASS WITH CAVEATS` or `FAIL`, and what would still worry you if it shipped unchanged.
