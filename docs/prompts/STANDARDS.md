# Prompt Standards

This guide defines the expected quality bar for prompts in this library.

## Principle

Every prompt must combine:

1. Mandatory criteria.
2. Expert judgment.
3. Controlled freedom.
4. Safety boundaries.
5. Clear output.

The checklist is the floor, not the ceiling.

## Atomic Prompt Contract

Atomic prompts should include:

- Clear title.
- Purpose.
- When to use it.
- When not to use it, or clear limits inside safety boundaries.
- Prompt role.
- `Requisitos mínimos obligatorios`.
- `Más allá de estos criterios`.
- Safety limits.
- Final checks.
- Delivery format.

Accepted Spanish headings:

- `## Requisitos mínimos obligatorios`
- `## Más allá de estos criterios`
- `## Límites de seguridad`
- `## Checks finales`
- `## Formato de entrega`

Accepted English equivalents only when preserving older files:

- `## Required checks`
- `## Beyond these criteria`
- `## Safety limits`
- `## Final checks`
- `## Delivery format`

## Flow Contract

Flows should include:

- Objective.
- Ideal phase.
- Included prompts.
- Exact order.
- Checkpoints between steps.
- Conditions to advance.
- Stop conditions.
- What to do when something fails.
- Final summary format.

Flows are orchestration instructions. They are not simple checklists.

## Checkpoint Contract

Checkpoints should include:

- What to run.
- What to inspect manually.
- What blocks progress.
- What can remain as a warning.
- What evidence to report.

Checkpoints decide whether the agent may continue.

## Naming Rules

Names must explain the job without opening the file.

Good:

- `primary-user-experience-audit`
- `safe-clean-code-simplification-pass`
- `last-mile-client-site-delivery`

Weak:

- `general-audit`
- `design-pass`
- `final-review`

## Merge Rules

Do not create a new prompt if the intention already exists.

Merge prompts when they share:

- The same evidence.
- The same user journey.
- The same stop conditions.
- The same specialist role.
- The same output format.

Split prompts when they need:

- Different evidence.
- Different safety limits.
- Different timing.
- Different owner.
- Different execution mode.

## Quality Bar

A prompt is good only if an agent can:

1. Understand when to use it.
2. Inspect the repository, not just obey the checklist.
3. Apply safe improvements.
4. Stop on meaningful risk.
5. Report what changed, what failed, and what remains.

## Maintenance Rule

Before adding or editing prompt families, run:

```text
agent-quality/02-prompt-library-integrity-and-coverage-audit.md
```

For larger changes, run:

```text
flows/prompt-library-maintenance.md
```
