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

This boilerplate also includes reusable final-pass prompts in [docs/prompts](docs/prompts) to help close projects cleanly, not just start them fast.

- [Public presentation pass](docs/prompts/final-public-presentation-pass.md) for README, screenshots, DeepWiki, social preview, and GitHub presentation.
- [Code quality audit](docs/prompts/final-code-quality-audit.md) for final technical review without unnecessary rewrites.
- [i18n audit](docs/prompts/final-i18n-audit.md) for multilingual consistency, formatting, accessibility, and fallbacks.
- [GitHub repository audit](docs/prompts/final-github-repository-audit.md) for repo trust, metadata, docs, and public-facing polish.
- [Release checklist](docs/prompts/final-release-checklist.md) for a short release-readiness pass before publishing or archiving.

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
