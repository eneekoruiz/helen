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

## Intentions Classification

Prompts are classified by their primary intention:

- **APPLY**: Modifies project files or workspace state. Deliverables MUST have minimal output (e.g., `✅ Todo correcto. Cambios aplicados. Acciones manuales: ninguna`). Avoid verbose explanations.
- **AUDIT**: Evaluates the codebase or design to identify issues/risks, without making changes.
- **REPORT**: Provides status summaries or strategic findings.
- **GENERATE**: Creates assets, scaffolding, or drafts.
- **PLAN**: Produces roadmaps, tasks, checklists, or steps.

## Atomic Prompt Contract

Atomic prompts should include:

- Clear title.
- Purpose and Intention.
- When to use it.
- When not to use it, or clear limits inside safety boundaries.
- Prompt role.
- `Requisitos mínimos obligatorios`.
- `Más allá de estos criterios`.
- Safety limits.
- Final checks.
- Delivery format (for **APPLY**, enforce minimal output format).

Accepted Spanish headings:

- `## Requisitos mínimos obligatorios`
- `## Más allá de estos criterios`
- `## Límites de seguridad`
- `## Checks finales`
- `## Formato de entrega`

## Flow Contract

Flows are orchestration instructions (not simple checklists) and should include:

- Objective.
- Ideal phase (out of the 8 moments).
- Included prompts.
- Exact order.
- Checkpoints between steps.
- Conditions to advance.
- Stop conditions.
- What to do when something fails.
- Final summary format.

## Checkpoint Contract

Checkpoints decide whether the agent may continue and should include:

- What to run.
- What to inspect manually.
- What blocks progress.
- What can remain as a warning.
- What evidence to report.

## Project Phases (The 8 Moments)

Prompts are organized into 8 sequence-based moment folders:

1. `01-start-project`: Initial research, scanning, and alignment.
2. `02-building`: Active coding, model audits, and core functionality implementation.
3. `03-finish-features`: Visual polish, UX audits, premium feel, and minor tweaks.
4. `04-before-production`: Adversarial QA, security/privacy compliance, and observability.
5. `05-final-audit`: Code quality, i18n, documentation, and final repository audits.
6. `06-release`: Release notes, candidate validation, and change checks.
7. `07-client-handoff`: Client delivery, browser smoke tests, copy audits, and support readiness.
8. `08-maintenance`: Long-term maintenance, growth audits, data backups, and prompt library health.

## Naming & Suffix Conventions

Files must follow strict suffix conventions to help the CLI auto-detect their kind:

- **Flows**: Filename must end with `-flow.md` (e.g., `clean-code-pass-flow.md`). Kind: `flow`.
- **Checkpoints**: Filename must end with `-checkpoint.md` (e.g., `test-suite-checkpoint.md`). Kind: `checkpoint`.
- **Prompts**: Any other filename (e.g., `data-model-and-domain-integrity-audit.md`). Kind: `prompt`.

Names must explain the job without opening the file.

Good:
- `primary-user-experience-audit.md`
- `safe-clean-code-simplification-pass.md`
- `last-mile-client-site-delivery-flow.md`

Weak:
- `general-audit.md`
- `design-pass.md`
- `final-review.md`

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

Before making major changes to prompt families, run the maintenance flow:

```text
08-maintenance/prompt-library-maintenance-flow.md
```

