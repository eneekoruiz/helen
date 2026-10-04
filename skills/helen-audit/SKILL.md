---
name: helen-audit
description: Audit correctness, user workflows, security, performance and verification depth with specialist agents, evidence-backed findings and autonomous discovery; remediate when authorized.
version: 2.1.0
---

# HELEN Audit

Inspect with fresh eyes. Prior praise and passing tests do not establish correctness. Audit-only requests are read-only; implement fixes when the user has authorized remediation. Reuse existing scope and ask only for essential missing information.

## Acceptance before inspection

Define audit dimensions, observable success criteria, compatibility boundaries and verification commands from repository evidence. Record baseline behavior and missing context. Distinguish facts, inferences and unknowns. Never fabricate files, line references, failure reproductions, successful checks or quality scores.

## Six dimensions

1. **Functionality and workflow:** incomplete journeys, manual bottlenecks, empty/loading/error states, batch operations and recovery.
2. **Verification depth:** tests that assert outcomes instead of merely execution; malformed and huge inputs, duplicate submissions, retries, timeouts, permission failures and concurrency.
3. **Failure and rollback:** partial state, locks, temporary files, atomicity, interruption recovery and actionable errors.
4. **Contracts and craft:** boundary validation, type integrity, domain invariants, dead code and responsibility boundaries. Preserve public contracts.
5. **Performance and observability:** scale, N+1 patterns, bounded concurrency, cost, caching, log context, secret leakage and supported OS behavior.
6. **Developer experience and claims:** setup friction, CLI streams, diagnostics, documentation parity, accessibility and visual interaction where applicable.

## Autonomous discovery and remediation

Inspect → report or remediate according to authorization → verify → independently re-audit → discover further opportunities → repeat.

After initial checks pass, explicitly ask: "What further evidence-backed improvement would materially improve the requested repository or workflow?" Inspect adjacent consumers and failure paths. Do not wait for the user to request more ideas. Apply actionable findings when remediation is authorized, then verify and repeat discovery. Keep audit-only passes read-only and report proposed changes.

There is no arbitrary retry or iteration cap. Finish when criteria are satisfied and a fresh discovery pass finds no more actionable findings within scope, or disclose the concrete blocker requiring input, authorization or external access. Never repeat an unchanged failed attempt. Respect cancellation and explicit resource limits; record outside-scope proposals rather than silently expanding authority.

## Verification

Inspect CI and run locally reproducible build, typecheck, lint, tests and workflow commands. For affected UI, run Playwright Chromium at 375, 768 and 1440 px with interactions, reduced motion, overflow and browser-error checks. Report command, outcome and limitations; missing browser or hosted OS access remains unverified. Do not scaffold or modify files in an audit-only task. Never weaken tests to obtain green results.

## Cheapest model cascade and specialists

Start with the cheapest available model when selection is supported; escalate only for verified failure or unresolved reasoning. Passing existing tests does not replace acceptance. State when selection is unavailable.

Delegate independent domain sweeps to specialist contracts/backend, security, QA/recovery, visual/accessibility and claims/documentation agents. Provide relevant files, acceptance criteria and read-only or exclusive-write boundaries. Reuse compact evidence and integrate findings; run sequentially if agents are unavailable. Use concise English technical instructions and answer in the user's language. Measure tokens and cost before claiming savings.

## Output

Report scope and criteria; prioritized findings with files, evidence, impact, fix and effort; changes applied when authorized; check results marked passed, failed, unavailable or not applicable; additional opportunities discovered; residual risks and blockers. No perfection score or guaranteed zero defects.