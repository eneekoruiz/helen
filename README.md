# HELEN CLI

HELEN is a CLI for scaffolding and hardening React, Vite, and TypeScript projects.

It focuses on practical setup, optional modules, and simple project hygiene.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)

## Quick start

```bash
npx helen-cli init
npx helen-cli add security --security-level strict
npx helen-cli modules
```

## Commands

- `helen`
- `helen init [--dry-run] [--force] [--security-level <simple|strict>]`
- `helen add <modules...> [--dry-run] [--force] [--security-level <simple|strict>]`
- `helen modules`
- `helen explain <module>`
- `helen doctor`
- `helen scripts easter-egg`
- `helen docs`
- `helen prompts`
- `helen prompts list [--kind <master|flow|step|checkpoint|prompt>]`
- `helen prompts show <id>`
- `helen prompts path <id>`
- `helen prompts flow <id>`

## Project Quality Prompts

This boilerplate includes a reusable prompt orchestration library in [docs/prompts](docs/prompts). It is designed for agents that can inspect a full repository, route themselves through the right audits, and apply senior judgment beyond rigid checklists.

Start with:

- [MASTER](docs/prompts/MASTER.md) when you want an agent to execute a flow safely.
- [Executable flows](docs/prompts/flows/README.md) for `full-polish`, `release-candidate`, `client-delivery`, and more.
- [Prompt Router](docs/prompts/orchestration/00-prompt-router.md) when you want the agent to choose the right sequence.
- [Workflows](docs/prompts/workflows/README.md) when you want a reusable route for launch, SaaS, open source, handoff, recovery, or total audit.
- [Registry](docs/prompts/registry.json) for future automation around prompt families and phases.

Each prompt uses mandatory minimum checks plus a "Más allá de estos criterios" section that asks the agent to apply its own expert judgment across the whole repository.

CLI examples:

```bash
helen prompts list --kind flow
helen prompts show master
helen prompts flow full-polish
helen prompts path release-candidate
```

Prompt families:

- [Atomic Steps](docs/prompts/steps/)
- [Checkpoints](docs/prompts/checkpoints/README.md)
- [Executable Flows](docs/prompts/flows/README.md)
- [Orchestration](docs/prompts/orchestration/README.md)
- [Agent Quality](docs/prompts/agent-quality/README.md)
- [Discovery](docs/prompts/discovery/README.md)
- [Design and Awards-Level Visual Excellence](docs/prompts/design/README.md)
- [Strategy](docs/prompts/strategy/README.md)
- [Data and Domain Integrity](docs/prompts/data/README.md)
- [APIs and Integrations](docs/prompts/integrations/README.md)
- [Product](docs/prompts/product/README.md)
- [Growth](docs/prompts/growth/README.md)
- [Developer Experience](docs/prompts/dx/README.md)
- [Quality](docs/prompts/quality/README.md)
- [Operations](docs/prompts/operations/README.md)
- [Privacy and Compliance](docs/prompts/privacy/README.md)
- [Observability](docs/prompts/observability/README.md)
- [Delivery](docs/prompts/delivery/README.md)
- [Final Audits](docs/prompts/final/README.md)

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
