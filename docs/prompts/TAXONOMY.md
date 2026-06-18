# Prompt Taxonomy and Anti-Duplication Rules

This library should feel precise, not inflated.

## Core Rule

One user intention gets one canonical prompt.

If two prompts answer the same question with slightly different intensity, merge them into one prompt with modes, levels, or sections.

## Layers by Suffix

To keep the library structured and allow the CLI to dynamically resolve kind:

1. **Flows** (`*-flow.md`)
   An ordered orchestration of prompts and checkpoints to guide the user through a project moment or a complex cross-cutting workflow.
2. **Checkpoints** (`*-checkpoint.md`)
   A gate or test suite run that decides whether an agent or user may proceed to the next moment.
3. **Prompts** (any other `.md` filename in the 8 phase directories)
   A reusable expert audit or action for a specific moment.

## Project Phases (The 8 Moments)

Every prompt file must reside in one of the 8 moments, reflecting its target project stage:

1. `01-start-project` (Start/Discovery)
2. `02-building` (Development/Hardening)
3. `03-finish-features` (UX/Visual Polish)
4. `04-before-production` (Compliance/Analytics/QA)
5. `05-final-audit` (Final closeout/i18n/Docs)
6. `06-release` (Changelog/RC readiness)
7. `07-client-handoff` (Client checks/Smoke testing)
8. `08-maintenance` (Ops/Backups/Updates)

## When to Add a New Prompt

Add a prompt only when at least one is true:
- It covers a materially different professional domain.
- It has different evidence requirements.
- It has different stop conditions.
- It requires a different expert persona.
- It would prevent a class of late-discovered problems.
- It changes the decision a user or agent would make.

## When to Merge Instead

Merge prompts when:
- They inspect the same surface.
- They differ mostly by intensity.
- One is just a more glamorous version of the other.
- Their output formats are nearly identical.
- A flow could choose the ambition level instead.

## Naming Conventions

Names must explain the job without opening the file, and end with the correct suffix.

### Flow Naming Rules
Flows should name the journey and end in `-flow.md`:
- `full-polish-flow.md`
- `release-candidate-flow.md`
- `client-delivery-flow.md`
- `clean-code-architecture-audit-flow.md`
- `awwwards-soty-design-review-flow.md`

### Checkpoint Naming Rules
Checkpoints must end in `-checkpoint.md`:
- `visual-ux-regression-checkpoint.md`
- `build-and-compile-checkpoint.md`
- `release-readiness-checkpoint.md`

### Prompt Naming Rules
Prompts must use kebab-case describing the specific audit or pass:
- `product-design-and-awards-visual-excellence-audit.md`
- `safe-clean-code-simplification-pass.md`
- `api-integration-and-contract-audit.md`

## Review Ritual

Before adding a prompt, ask:
1. Is this a new domain or just a stricter version of an existing prompt?
2. Could this be a mode inside an existing prompt?
3. Is it a prompt, checkpoint, or flow?
4. Would a user understand the name in a CLI list?
5. Does it reduce confusion or add library sprawl?
