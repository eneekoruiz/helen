---
title: Autonomous Implementation (Implementa)
summary: Execute authorized improvements with measurable acceptance, specialist agents, verification and autonomous discovery.
action: APPLY
phase: 03-finish-features
repeatable: true
modifies_code: true
stage: apply
aliases:
  - implementa
  - implement-all
  - just-do-it
---

# Autonomous Implementation Flow

Follow [RULES.md](../../RULES.md) once per session.

## Goal

Deliver the authorized plan and independently discover further actionable improvements without repeated requests to continue.

## Use when

The user authorizes end-to-end implementation of features, audit findings or an improvement set.

## Requirements

- Define measurable acceptance, invariants and verification before editing.
- Preserve compatibility, original scope and exclusions.
- Use the cheapest available model cascade and focused specialist agents when supported.

## Steps

1. Inspect context and baseline behavior; order tasks by dependency. Clarify only essential unknowns.
2. Give independent specialists relevant files, acceptance criteria and exclusive ownership.
3. Implement authorized changes; verify outcomes, build, typecheck, lint, tests and locally reproducible CI commands. Check affected UI in Playwright Chromium.
4. Diagnose failures from evidence, fix and re-verify without an arbitrary retry cap. Do not repeat unchanged attempts.
5. After original acceptance passes, independently discover further improvements in workflows, failure paths, contracts, performance and documentation. Apply actionable findings within authorization, verify and repeat discovery.
6. Finish when criteria pass and a fresh discovery finds no further actionable improvement within scope, or disclose the concrete blocker. Respect cancellation and explicit resource limits.

## Limits

- Do not ask repeatedly whether to continue authorized work.
- Obtain authorization for irreversible external actions outside existing authorization.
- Do not weaken checks, silently expand scope or invent successful verification.
- Mark unavailable checks unverified; report residual risks rather than perfection.

## Output

Report implemented items, proactively discovered improvements, acceptance/check evidence, blocked or outside-scope work, convergence rounds and residual risks. Distinguish locally verified commands from unexecuted hosted checks.