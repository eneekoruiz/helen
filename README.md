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

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/helen

## License

MIT
