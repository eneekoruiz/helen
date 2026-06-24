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

## Intentions Classification & Output Standards

Prompts are classified by their primary intention, which defines their name prefix and output expectations:

- **INIT** (`init-`): Initializes business DNA, project architecture, scaffold rules, and first execution constraints from a blank or near-blank state.
  - **Deliverable Standard**: MUST produce an operational brief or scaffold plan with explicit variables, assumptions, conversion priorities, and premium quality rules.
- **GENERATE** (`generate-`): Creates assets, config templates, code boilerplate, components, CMS models, or production-ready implementation from an existing brief.
  - **Deliverable Standard**: MUST produce ready-to-use files or implementation with no vague placeholders unless the input is genuinely missing.
- **ENHANCE** (`enhance-`): Modifies existing code, UX, UI, copy, scenes, or workflows under non-breaking constraints.
  - **Deliverable Standard**: MUST keep output minimal, preserve public contracts, and report only material changes, manual actions, and verification.
- **APPLY** (`apply-`): Legacy implementation prefix. New prompts should prefer `generate-` for creation and `enhance-` for constrained modification.
  - **Deliverable Standard**: MUST have strictly minimal output (e.g., `✅ Todo correcto. Cambios aplicados. Acciones manuales: ninguna`). Avoid verbose explanations or reporting details of successful edits; let git show the changes.
- **AUDIT** (`audit-`): Evalúates the codebase or design to identify issues/risks, without making changes.
  - **Deliverable Standard**: MUST provide structured findings classified by severity: **Críticos** (blocking issues), **Importantes** (high technical debt/usability gaps), and **Opcionales** (dx or minor polish).
- **PLAN** (`plan-`): Produces roadmaps, tasks, checklists, or step-by-step orchestrations.
  - **Deliverable Standard**: MUST provide actionable checklists with `[ ]` syntax ready to be executed.
- **RESEARCH** (`research-`): Compares, benchmarks, or investigates technology choices or competitor solutions.
  - **Deliverable Standard**: MUST provide structural reports, markdown tables, and benchmarking data.
- **GENERATE** (`generate-`): Creates assets, config templates, code boilerplate, or release/handoff documentation.
  - **Deliverable Standard**: MUST produce ready-to-use copy-pasteable files without generic placeholders.

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
- Delivery format (matching the intent output standards above).

Accepted Spanish headings:

- `## Requisitos mínimos obligatorios`
- `## Más allá de estos criterios`
- `## Límites de seguridad`
- `## Checks finales`
- `## Formato de entrega`

## Flow Contract

Flows are orchestration instructions (not simple checklists) and should include:

- Objective.
- Ideal phase (out of the 9 moments).
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

## Project Phases (The 9 Moments)

Prompts are organized into 9 sequence-based moment folders:

1. `01-start-project`: Initial research, scanning, strategy, and lifecycle planning.
2. `02-building`: Active coding, data models, CMS editable layers, and compile/linter checkpoints.
3. `03-finish-features`: Visual polish, UX audits, premium feel, and visual regression checkpoints.
4. `04-before-production`: Adversarial QA, scaling, privacy (GDPR), and observability.
5. `05-final-audit`: Code quality closeout, documentation, i18n, and repository health audits.
6. `06-release`: Release notes, candidate validation, and change checks.
7. `07-client-handoff`: Client delivery, browser smoke tests, copy audits, and support readiness.
8. `08-maintenance`: Long-term maintenance, governance, data backups, and portfolio showcases.
9. `09-future-knowledge`: Long-term survival audits, developer onboarding, self-recovery, and knowledge preservation.

## Naming & Suffix Conventions

Files must follow strict suffix conventions to help the CLI auto-detect their kind:

- **Flows**: Filename must end with `-flow.md` (e.g., `apply-clean-code-pass-flow.md`). Kind: `flow`.
- **Checkpoints**: Filename must end with `-checkpoint.md` (e.g., `audit-test-suite-checkpoint.md`). Kind: `checkpoint`.
- **Prompts**: Any other filename (e.g., `audit-api-integration-and-contract.md`). Kind: `prompt`.

Names must explain the job without opening the file.

Good:
- `audit-primary-user-experience.md`
- `apply-safe-clean-code-simplification-pass.md`
- `apply-last-mile-client-site-delivery-flow.md`

Weak:
- `audit-general-audit.md`
- `apply-design-pass.md`
- `audit-final-review.md`

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
08-maintenance/meta/apply-prompt-library-maintenance-flow.md
```

