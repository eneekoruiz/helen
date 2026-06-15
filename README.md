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

## Project Quality Prompts

This boilerplate also includes reusable end-of-project prompts in [docs/prompts](docs/prompts) to help close projects cleanly, not just start them fast.

Start with [docs/prompts/README.md](docs/prompts/README.md), then go to [docs/prompts/final/README.md](docs/prompts/final/README.md). Those two files explain the purpose, moment of use, sequence, and closeout flow.

Active final-stage prompt set:

- [01 Code Quality Audit](docs/prompts/final/01-code-quality-audit.md)
- [02 i18n Audit](docs/prompts/final/02-i18n-audit.md)
- [03 Documentation Audit](docs/prompts/final/03-documentation-audit.md)
- [04 GitHub Repository Audit](docs/prompts/final/04-github-repository-audit.md)
- [05 Public Presentation Pass](docs/prompts/final/05-public-presentation-pass.md)
- [06 Release Checklist](docs/prompts/final/06-release-checklist.md)

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
