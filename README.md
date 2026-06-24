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
- `helen prompts list [--kind <master|guide|flow|step|checkpoint|prompt>]`
- `helen prompts show <id>`
- `helen prompts path <id>`
- `helen prompts flow <id>`

## Project Quality Prompts

This boilerplate includes a reusable prompt orchestration library in [docs/prompts](docs/prompts). It is designed for agents that can inspect a full repository, route themselves through the right audits, and apply senior judgment beyond rigid checklists.

Start with:

- [MASTER](docs/prompts/MASTER.md) when you want an agent to execute a flow safely.
- [Executable flows](docs/prompts/USE_CASE_INDEX.md) to choose the right sequence for `full-polish`, `release-candidate`, `client-delivery`, and more.
- [Prompt Routers](docs/prompts/01-start-project/ROUTER.md) inside each phase directory to choose the right audit/apply step.
- [Registry](docs/prompts/registry.json) for future automation around prompt families and phases.

Each prompt uses mandatory minimum checks plus a "Más allá de estos criterios" section that asks the agent to apply its own expert judgment across the whole repository.

CLI examples:

```bash
helen prompts list --kind flow
helen prompts show master
helen prompts flow full-polish
helen prompts path release-candidate
```

Prompt families organized by moment:

- [01-start-project](docs/prompts/01-start-project/README.md) (Inicio de proyecto, roadmap y riesgos)
- [02-building](docs/prompts/02-building/README.md) (Desarrollo, Clean Code y CMS)
- [03-finish-features](docs/prompts/03-finish-features/README.md) (UX, Dirección de Arte y Visuales Premium)
- [04-before-production](docs/prompts/04-before-production/README.md) (QA Adversarial, Escala y Observabilidad)
- [05-final-audit](docs/prompts/05-final-audit/README.md) (Internacionalización, Documentación y Repositorio)
- [06-release](docs/prompts/06-release/README.md) (Candidatos a Release, Changlog y Empaquetado)
- [07-client-handoff](docs/prompts/07-client-handoff/README.md) (Última milla y Entrega a Cliente)
- [08-maintenance](docs/prompts/08-maintenance/README.md) (Backups, Showcase y Mantenimiento de Librería)
- [09-future-knowledge](docs/prompts/09-future-knowledge/README.md) (Preservación del Conocimiento y ADRs)

## Architecture

The command layer parses the requested modules and options, the registry resolves their implementations, and the module runner writes templates and configuration into the target project. Validation and dry-run support happen before files are changed, while backups and the `.helenrc` manifest support repeatable runs and rollback.

Docker files, workflows, testing, SEO and security configuration are optional modules rather than requirements of the base scaffold. This keeps the core CLI small while allowing several modules to be composed in one run.

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
