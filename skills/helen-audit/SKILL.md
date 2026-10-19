---
name: helen-audit
description: Audit correctness, workflows, security, performance and verification with evidence, cost-aware routing and optional specialists; discover further improvements and remediate when authorized.
metadata:
  version: 2.1.0
---

# HELEN Audit

Inspect with fresh eyes. Prior praise and passing tests do not establish correctness. Audit-only requests are read-only; implement fixes when the user has authorized remediation. Reuse existing scope and ask only for essential missing information.

## Acceptance before inspection

Define audit dimensions, observable success criteria, compatibility boundaries and verification commands from repository evidence. Record baseline behavior and missing context. Distinguish facts, inferences and unknowns. Never fabricate files, line references, failure reproductions, successful checks or quality scores.

For each defect, identify the violated requirement or demonstrated failure path. A category list, an unused helper or an optional best practice does not establish a defect; keep optional improvements separate. Combine findings that have the same root cause and consequence instead of counting the same failure twice. Match severity to observed impact: speculative load or deployment consequences alone do not justify a high severity. Check quoted locations against the exact supplied source before returning them.

Before returning findings, compare their failure paths and proposed fixes. If one correction removes several reported symptoms, describe those symptoms together under the underlying defect unless an independent failure remains. Check each retained finding against the requested scope and severity; do not fill a category merely because it was offered.

## Six dimensions

1. **Functionality and workflow:** incomplete journeys, manual bottlenecks, empty/loading/error states, batch operations and recovery.
2. **Verification depth:** tests that assert outcomes instead of merely execution; malformed and huge inputs, duplicate submissions, retries, timeouts, permission failures and concurrency.
3. **Failure and rollback:** partial state, locks, temporary files, atomicity, interruption recovery and actionable errors.
4. **Contracts and craft:** boundary validation, type integrity, domain invariants, dead code and responsibility boundaries. Preserve public contracts.
5. **Performance and observability:** scale, N+1 patterns, bounded concurrency, cost, caching, log context, secret leakage and supported OS behavior.
6. **Developer experience and claims:** setup friction, CLI streams, diagnostics, documentation parity, accessibility and visual interaction where applicable.

## Autonomous discovery and remediation

Inspect → report or remediate according to authorization → verify → run one focused discovery pass.

After initial checks pass, conduct one targeted discovery pass: "What critical evidence-backed improvement would materially improve the requested repository or workflow?" Inspect adjacent consumers and failure paths. Apply actionable findings when remediation is authorized, then verify. Keep audit-only passes read-only and report proposed changes.

Once criteria are satisfied and the single discovery pass completes, synthesize results and report optional further recommendations rather than looping indefinitely without feedback. Disclose any concrete blocker requiring input, authorization or external access. Never repeat an unchanged failed attempt. Respect cancellation and explicit resource limits; record outside-scope proposals rather than silently expanding authority.

## Verification

Inspect CI and run locally reproducible build, typecheck, lint, tests and workflow commands. For affected UI, run Playwright Chromium at 375, 768 and 1440 px with interactions, reduced motion, overflow and browser-error checks. Report command, outcome and limitations; missing browser or hosted OS access remains unverified. Do not scaffold or modify files in an audit-only task. Never weaken tests to obtain green results.

## Cheapest model cascade and specialists

Choose the cheapest available capable model when selection is supported; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff would cost more. Passing existing tests does not replace acceptance; do not pretend unavailable model controls exist.

Decide whether specialist contracts/backend, security, QA/recovery, visual/accessibility or claims sweeps improve acceptance enough to justify delegation overhead; otherwise perform focused passes in the primary agent. Provide relevant files, acceptance criteria and read-only or exclusive-write boundaries. Reuse compact evidence and integrate findings; run sequentially if agents are unavailable. Use concise English technical instructions and answer in the user's language. Measure tokens and cost before claiming savings.

## Output

Report scope and criteria; prioritized findings with files, evidence, impact, fix and effort; changes applied when authorized; check results marked passed, failed, unavailable or not applicable; additional opportunities discovered; residual risks and blockers. No perfection score or guaranteed zero defects.

## Native clarification

Before implementation or evaluation, check whether a missing preference, constraint or acceptance decision materially affects the result. If it does, invoke the application's available native structured question tool (such as `request_user_input_async`, an available `request_user_input`, or `AskUserQuestion`), with concise task-specific choices and free text. Reuse existing answers and continue independent work while waiting. If the tool is unavailable in the current mode, ask conversationally; do not create a separate visual artifact or invent answers. If context suffices, proceed without a questionnaire.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected specialist expertise or context savings outweigh transfer, coordination, integration, verification and retries. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.

## Project records

When HELEN is available, inspect `helen work list` and reuse the relevant `helen work brief <id>` before acting or handing off. Preserve its exclusions, acceptance and decisions. Record material questions and the actual human answer in that dossier; use native forms when available without claiming UI verification from metadata. Relevant learning matches remain advisory; for visual or written deliverables read `helen creative show` and respect explicit user/template choices. If these tools are unavailable, use supplied scope and report the continuity limitation.
