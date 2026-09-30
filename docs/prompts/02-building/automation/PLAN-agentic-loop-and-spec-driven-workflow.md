---
action: PLAN
phase: 02-building
summary: Decide when an agent may iterate on its own (loops, spec-driven flows) and with which success criteria, limits and human checkpoints.
modifies_code: false
---

# Agentic Loop and Spec-Driven Workflow

## Goal

Decide when and how to let an agent iterate autonomously (Ralph-style loops) or follow a structured spec-driven flow (GSD Core-style), with limits that prevent endless work, runaway cost or dangerous changes.

## Use when

- Large tasks with a verifiable success criterion (tests, build, lint, checklist).
- Planning a long build in this phase.

## Skip when

- The task is ambiguous and success cannot be checked.
- The work is destructive or touches security or production data without human supervision.

## Requirements

1. **Verifiable completion:** name the command or check that proves the task is done (e.g. `npm test` green). No criterion, no loop.
2. **Mandatory iteration limit** (e.g. `--max-iterations`). The limit is the real safety net; a completion phrase is an exact-string match and never replaces it.
3. **Fresh context per task** in long work: split into small plans, each with its own commit.
4. **Human checkpoints** before major dependency upgrades, migrations, auth changes and deploys.
5. **Log** in `.quality_audit_log.md` what ran autonomously, with which limits and result.
6. **Tools** (review before installing): `helen skills external ralph-loop`, `helen skills external gsd-core`. Roo Code is discontinued.

## Beyond the checklist

Start with a short loop (3-5 iterations) to confirm the success criterion is well defined before raising the limit.

## Limits

- Never run a loop without an iteration limit.
- Never give an autonomous loop production credentials.
- Stop if two consecutive iterations bring no material progress.

## Output

Numbered plan: for each step, the success criterion, the iteration and cost limit, and the human checkpoint.
