# 🌌 HELEN CLI — Project scaffolding, done right

HELEN is a modular CLI to scaffold and maintain React + Vite + TypeScript projects with production-ready defaults.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Type: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)
![CI](https://github.com/eneekoruiz/helen/actions/workflows/ci.yml/badge.svg)
![Smoke Test](https://github.com/eneekoruiz/helen/actions/workflows/smoke-test.yml/badge.svg)

---

## What is HELEN?

HELEN automates repetitive setup tasks (tooling, infra, and opinionated patterns) so teams can focus on product logic. It is safe-by-default, supports dry-runs, and keeps a lightweight project record in `.helenrc`.

## Key highlights

- Modular: a curated set of modules that can be added to projects.
- Safe: supports `--dry-run`, backups, and template guards.
- Extensible: generate components, pages, docs and more via commands.

---

## Install & build (local development)

```bash
# clone
git clone https://github.com/eneekoruiz/helen.git
cd helen

# install (reproducible)
npm ci

# build TypeScript output
npm run build

# optional: link globally for testing the CLI locally
npm link
```

---

## Quick start — common commands

- `npm run build` — compile TypeScript to `dist/`
- `npm run test` — run unit tests (Vitest)
- `npm run lint` — run ESLint (requires a config; see CONTRIBUTING)
- `npm run format` — format code with Prettier

When linked globally, the CLI exposes the `helen` command:

- `helen create <name>` — scaffold a new Vite-based project (`--next` for Next.js)
- `helen init` — apply recommended modules to an existing project
- `helen add <module>` — add a specific module (e.g., `docker`, `ci`)
- `helen generate <type> <name>` (alias `helen g`) — generate components, hooks, pages
- `helen doctor` — run a project health check

---

## Current modules (stable)

The repository includes a curated set of 12 stable modules that you can add to projects:

- `quality` — ESLint, Prettier, TypeScript strict settings
- `testing` — Vitest + Testing Library
- `docker` — Dockerfile and docker-compose templates
- `ci` — CI pipeline templates
- `seo` — SEO helpers and sample meta
- `security` — environment validation and sanitizers
- `dx` — developer experience utilities and scripts
- `theme` — theme provider and tokens
- `gdpr` — cookie consent and privacy helpers
- `pwa` — basic PWA setup and manifest
- `i18n` — internationalization scaffolding
- `sentry` — Sentry integration templates

Note: UI-related modules such as `tailwind` or `shadcn` exist as templates but are not registered by default.

---

## Contributing

Contributions are welcome. Quick checklist:

1. Fork the repository and create a feature branch.
2. Run `npm ci` and `npm run build` locally.
3. Add tests for new behavior and run `npm run test`.
4. Follow the existing code style and run `npm run format`.
5. Open a PR with a clear description and link to related issues.

If you want to enforce linting locally, initialize ESLint in the project root:

```bash
npm init @eslint/config
```

---

## Releases

Tags are used for releases (e.g., `v1.0.0`). We tag from the repository root and push tags to GitHub.

---

## Tests & CI

Run the test suite locally with:

```bash
npm run test
```

CI should run `npm ci`, `npm run build` and `npm run test` on each PR.

---

## License

MIT © [eneekoruiz](https://github.com/eneekoruiz)

---

If you want this README translated to Spanish or adapted for a package registry page, tell me and I’ll prepare it.
