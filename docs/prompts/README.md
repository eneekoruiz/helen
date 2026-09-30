# HELEN Prompt Library

Prompts for every moment of a project, written in English (fewer tokens), organized by phase, and connected through playbooks.

- **Start here:** `helen apply` detects the project phase and proposes goals. `helen apply <goal>` gives the ordered steps.
- **Rules every prompt follows:** [RULES.md](RULES.md). **How prompts are written:** [CONTRACT.md](CONTRACT.md).
- **Paste-into-any-AI entry point:** [MASTER.md](MASTER.md).
- **Goals and their steps:** [playbooks.json](playbooks.json).

## Phases

| Phase | What it covers |
|---|---|
| [01-start-project](01-start-project/README.md) | Business core, creative direction, scaffold, risks, competitors, roadmap |
| [02-building](02-building/README.md) | Quality gates, clean code, CMS and i18n, data and API contracts, security, agent loops |
| [03-finish-features](03-finish-features/README.md) | UX, visual design, copy and conversion, motion, 3D, accessibility, performance |
| [04-before-production](04-before-production/README.md) | Adversarial QA, scale and cost, privacy and legal, SEO, observability |
| [05-final-audit](05-final-audit/README.md) | Code quality, i18n, documentation, public presentation |
| [06-release](06-release/README.md) | Release candidate, notes and changelog, automated releases, deploy |
| [07-client-handoff](07-client-handoff/README.md) | Last-mile checks and the handoff package |
| [08-maintenance](08-maintenance/README.md) | Dependencies, data, governance, growth, third-party tools, library upkeep |
| [09-future-knowledge](09-future-knowledge/README.md) | Onboarding, ownership, ADRs, runbooks, AI context, resilience |

Each phase README has quick decisions, an exit checklist and a generated prompt index.

## CLI

```bash
helen prompts list [--kind flow|checkpoint|prompt]
helen prompts search <words>
helen prompts show <id>        # old ids still work through aliases
helen prompts index            # regenerate phase indexes
helen prompts lint             # enforce the contract
```
