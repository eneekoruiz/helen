---
action: AUDIT
phase: 01-start-project
summary: Find the risks that could break users, data or future work: quick scan first, deep architecture and operations audit when needed.
modifies_code: false
aliases:
  - audit-initial-project-risk-scan
  - audit-architecture-operations-and-risk
---

# Project Risk and Architecture Audit

## Goal

Decide how healthy the project is before spending effort on it: what could break users, data, release confidence or future development, and what to fix first.

## Use when

- Starting work on a repository whose state is uncertain (new, inherited or neglected).
- A project moves from prototype to something public, maintained or relied on.
- Before a polish or hardening flow, to choose where effort goes.

## Skip when

- A recent, trustworthy audit exists and nothing structural changed since.

## Requirements

Choose the depth first: **quick scan** (structure, scripts, README, tests, main surfaces; 15 minutes) or **deep audit** (all areas below). Say which one you ran.

1. **Architecture and boundaries:** module responsibilities, dependency direction, extension points, shared state, coupling, circular dependencies, hidden conventions, missing or premature abstractions. Does the design fit the current size and the next likely stage?
2. **Operational readiness:** build, test, release, rollback, logging, error reporting, configuration and environment assumptions. Flag anything that only works on the original developer's machine.
3. **Security and abuse:** input validation, path handling, secrets, dependency risk, unsafe defaults, permissions, trust boundaries. Calibrate severity to reality.
4. **Reliability:** retries, partial failures, idempotency, destructive operations, race conditions, timeouts, cleanup. Which flows can leave inconsistent state?
5. **Verification:** do tests cover risky behavior or only happy paths? Which quality claims lack repeatable evidence?
6. **Maintainability:** areas that get expensive as features grow; unclear naming, duplicated rules, brittle tests, hidden knowledge.
7. Separate **blockers** from **opportunities**, and inflated claims or misleading scripts from real capability.

## Beyond the checklist

Think about contributor growth, support load, versioning, migrations, observability and privacy. You may recommend deleting code, shrinking scope or documenting a limitation instead of building more. Never over-engineer: each mitigation must match the project's maturity.

## Limits

- Audit only: do not modify files.
- Every finding needs evidence from the repository; mark assumptions as assumptions.

## Output

1. Depth run (quick or deep) and overall state in two sentences.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Quick wins.
4. Verdict: `READY TO SCALE MODESTLY`, `STABLE BUT FRAGILE` or `ARCHITECTURAL RISK`.
5. Recommended next prompt or `helen apply` goal, and what would worry you most six months from now.
