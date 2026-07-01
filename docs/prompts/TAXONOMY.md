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
3. **Prompts** (any other `.md` filename in the phase directories)
   A reusable expert audit or action for a specific moment.

## Project Phases (The 9 Moments)

Every prompt file must reside in one of the 9 moments, reflecting its target project stage:

1. `01-start-project` (Start/Discovery)
2. `02-building` (Development/Hardening)
3. `03-finish-features` (UX/Visual Polish)
4. `04-before-production` (Compliance/Analytics/QA)
5. `05-final-audit` (Final closeout/Docs/Localization if present)
6. `06-release` (Changelog/RC readiness)
7. `07-client-handoff` (Client checks/Smoke testing)
8. `08-maintenance` (Ops/Backups/Updates)
9. `09-future-knowledge` (Long-Term Survival/Preservation)

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

## Naming Conventions & Intent Prefixes

Every prompt file must expose its primary intent in its filename. Names must follow this pattern: `[intent]-[name-kebab]-[optional-suffix].md`.

### Canonical Action Prefixes (Lowercase)
- **`init-`**: Initializes a blank or near-blank project with business DNA, scaffold rules, positioning, and first architecture.
- **`generate-`**: Creates new assets, components, CMS models, scaffolds, documentation, or implementation from an existing brief.
- **`enhance-`**: Improves existing code, UI, scenes, copy, or flows under strict non-breaking constraints.
- **`audit-`**: Evalúates code, UX, market position, visual quality, risk, or implementation without modifying files.

### Legacy Compatible Prefixes
- **`apply-`**: Existing implementation prompt. Treat as equivalent to `enhance-` when editing existing surfaces, or `generate-` when creating new project assets.
- **`plan-`**: Existing strategy/checklist prompt. Keep until merged into `init-`, `audit-`, or a flow.
- **`research-`**: Existing market/benchmark prompt. Prefer `audit-` for new competitor analysis files unless fresh external research and source comparison are the primary deliverable.

Legacy prefixes may remain for compatibility, but new files should prefer the canonical action prefixes above unless a migration would break CLI resolution.

## Agentic Quality Gate

Before merging a prompt-library change, verify that the changed prompt or flow defines:

- Evidence requirements and success criteria.
- Stop conditions and exception handling.
- A bounded reflection loop when the task is iterative or high impact.
- A memory target for decisions that future agents must inherit.
- Output format aligned with its action prefix.

## Flow Naming Rules

Flows should name the journey and end in `-flow.md`:
- `apply-full-polish-flow.md`
- `apply-release-candidate-flow.md`
- `apply-client-delivery-flow.md`
- `audit-clean-code-architecture-flow.md`
- `audit-awwwards-soty-design-review-flow.md`

## Checkpoint Naming Rules

Checkpoints must end in `-checkpoint.md`:
- `audit-visual-ux-regression-checkpoint.md`
- `audit-build-and-compile-checkpoint.md`
- `audit-release-readiness-checkpoint.md`

## Prompt Naming Rules

Prompts must use kebab-case describing the specific audit or pass:
- `audit-product-design-and-awards-visual-excellence.md`
- `apply-safe-clean-code-simplification-pass.md`
- `audit-api-integration-and-contract.md`

## Review Ritual

Before adding a prompt, ask:
1. Is this a new domain or just a stricter version of an existing prompt?
2. Could this be a mode inside an existing prompt?
3. Is it a prompt, checkpoint, or flow?
4. Would a user understand the name in a CLI list?
5. Does it reduce confusion or add library sprawl?