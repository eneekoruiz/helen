# 🌌 HELEN CLI — Premium Scaffolding & Hardening Engine

HELEN is a modular developer CLI designed to scaffold, harden, and maintain **React + Vite + TypeScript** projects with production-ready patterns. It delivers top-tier developer experience (DX), automated environment safety configurations, and modular code injection presets.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)

---

## ✨ Features & Architecture

HELEN is engineered to be **safe-by-default**, **idempotent**, and **interactive**.

*   **⚡ Zero-Clone Execution**: Run HELEN directly on any project using standard package runners (`npx`). No cloning or local compiling required.
*   **🛡️ Dual-Tier Cybersecurity**: Choose between `simple` and `strict` modes for environment validation (Zod), input sanitizers, and Web Crypto APIs (AES-256-GCM symmetric encryption/decryption, SHA-256 secure digests, and Content Security Policy).
*   **🌌 Dynamic Truecolor Animations**: Contains a premium 24-bit Truecolor terminal loader and interactive diagnostic system with a HSL diagonal spectrum cycle, pluggable into any TypeScript project.
*   **🧩 Modular Hardening**: Add features on-demand (`init`, `add`). HELEN reads your workspace configuration, detects package managers, merges `package.json` dependencies/scripts, and prevents file duplication.

---

## 🚀 Running Without Cloning (Quick Execution)

You can launch and utilize HELEN instantly inside any Vite React TS directory **without cloning the repository**!

```bash
# 1. Initialize recommended stable modules in any project directory
npx helen-cli init

# 2. Add specific modules interactively or directly
npx helen-cli add security --security-level strict
npx helen-cli add docker dx

# 3. Play the high-fidelity Truecolor Eneko Ruiz system diagnostics animation
npx helen-cli scripts easter-egg
```

*Tip: You can also install HELEN globally to make the command permanently available:*
```bash
npm install -g helen-cli
helen init
```

---

## 🛠️ CLI Reference

### Stable Commands (Fully Implemented & Verified)
*   `helen` (Default interactive menu)
*   `helen init [--dry-run] [--force] [--security-level <simple|strict>]` — Initializes all modules in the project.
*   `helen add <modules...> [--dry-run] [--force] [--security-level <simple|strict>]` — Adds one or more specific modules.
*   `helen modules` — Lists all registered modules.
*   `helen explain <module>` — Explains what a specific module does and outputs its technical metadata.
*   `helen doctor` — Evaluates project setup health, directories, configs, and lock files.
*   `helen scripts easter-egg` — Runs the diagonal Truecolor console brand animation.
*   `helen docs` — Outputs full registry explanations for all modules.

### Experimental / In Development Commands
*   `helen create <name> [--next]` — Scaffolds a new project folder (Vite-React-TS or Next-TS).
*   `helen generate <type> <name>` (alias: `g`) — Generates component, hook, page, or entity templates.
*   `helen update [--dry-run]` — Updates installed modules to the latest presets.
*   `helen eject <module> [--dry-run]` — Removes files created by a module.

---

## 📦 Modules Registry

HELEN structures features into three distinct lifecycle tiers:

### 🟢 Stable Modules (Production-Ready & Fully Tested)

These modules are covered by integration tests, compile cleanly, and support auto-dependency injection into `package.json`.

| Module | Identifier | Scaffolds & Enhances |
| :--- | :--- | :--- |
| **Code Quality** | `quality` | ESLint + Prettier + strict TypeScript config. Adds `lint`, `format`, and `typecheck` scripts. |
| **Testing Setup** | `testing` | Vitest + Testing Library + jsdom environment, helper mock utilities, and example test files. |
| **Security Utilities** | `security` | Enforces environment validation via Zod, URL filters, HTML sanitizers. **Strict mode** appends AES-256-GCM encryption wrappers, SHA-256 secure digests, and strict CSP configuration headers. |
| **Docker Setup** | `docker` | Optimized multi-stage `Dockerfile` (development & production) and `docker-compose.yml` setups. |
| **CI/CD Pipeline** | `ci` | Preconfigured GitHub Actions workflows for automated typechecking, linting, testing, and production packaging. |
| **SEO Basics** | `seo` | Reusable React SEO metadata header component (Helmet), robots.txt, and site manifest.json. |
| **Developer Experience** | `dx` | Configures `.vscode/settings.json`, recommended extensions, and outputs `scripts/easter-egg.ts` to run truecolor animations in your own projects. |
| **Theme System** | `theme` | Injectable React `<ThemeProvider>`, custom `useTheme` hook, and dark-mode toggle components. |

### 🟡 Experimental Modules (Functional but In-Development)

These modules are registered but undergo rapid iteration and require manual configuration checks.

*   **GDPR Compliance (`gdpr`)** — React cookie consent banners, legal terms, and cookie policies.
*   **Progressive Web App (`pwa`)** — Progressive offline-first asset configurations via `vite-plugin-pwa`.
*   **Internationalization (`i18n`)** — Multi-language `react-i18next` configuration and base translation structures.
*   **Sentry Error Tracking (`sentry`)** — Error logging setup with Session Replay and PII data sanitizers.

### 🔴 Planned Modules (Future Roadmap)

*   **Tailwind CSS (`tailwind`)** — Utility-first CSS presets.
*   **Shadcn UI (`shadcn`)** — Fully accessible component primitives setup.

---

## 🧪 Testing & Validation

### 1. Unit & Integration Tests (Vitest)
Unit tests cover file safety, project detection, package manager discovery, registry unique mapping, and planned execution locks.
```bash
npm ci
npm run test
```

### 2. Sandbox Integration Tests (QA Labs)
The sandbox suite performs end-to-end dry-runs, full module applications, package.json parsing validations, and build verification against React + Vite sandboxes.
```bash
# Execute local sandbox QA checks
node sandbox-qa.js
```

---

## 📄 License

MIT © [eneekoruiz](https://github.com/eneekoruiz)
