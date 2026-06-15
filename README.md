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

Start with the index in [docs/prompts/README.md](docs/prompts/README.md). It explains what each prompt is for, when to use it, and the recommended order.

- [Final code quality audit](docs/prompts/final-code-quality-audit.md)
- [Final i18n audit](docs/prompts/final-i18n-audit.md)
- [Final documentation audit](docs/prompts/final-documentation-audit.md)
- [Final GitHub repository audit](docs/prompts/final-github-repository-audit.md)
- [Final public presentation pass](docs/prompts/final-public-presentation-pass.md)
- [Final release checklist](docs/prompts/final-release-checklist.md)

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
