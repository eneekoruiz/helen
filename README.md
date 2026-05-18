# 🌌 HELEN CLI — Premium Modular Scaffolding Engine

HELEN is an enterprise-grade, modular developer CLI designed to scaffold, harden, and maintain React + Vite + TypeScript projects with production-ready patterns. It delivers top-tier developer experience (DX), robust cybersecurity presets, and automated workspace configs.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)
[![Cybersecurity: Strict](https://img.shields.io/badge/Cybersecurity-Strict-crimson.svg?style=flat-square)](#-security-utilities-security)

---

## ✨ Features & Architecture

HELEN is engineered to be **safe-by-default**, **idempotent**, and **fully interactive**. It helps teams avoid repetitive configuration cycles:

*   **⚡ Zero-Clone Execution**: Run HELEN directly on any project using standard package runners (`npx`). No cloning or local compiling required.
*   **🛡️ Dual-Tier Cybersecurity**: Choose between `simple` and `strict` modes. Includes environment validation powered by Zod, secure URL/HTML sanitization, cryptographically secure tokens, AES-256-GCM encryption, and automated Content Security Policy (CSP) configurations.
*   **🌌 Dynamic Truecolor Animations**: Contains a premium 24-bit Truecolor terminal loader and interactive diagnostic system with a HSL diagonal spectrum cycle, pluggable into any TypeScript project.
*   **🧩 Modular Hardening**: Add features on-demand (`init`, `add`). HELEN reads your workspace configuration, detects package managers, merges `package.json` scripts, and prevents module duplication or file overwrites.

---

## 🚀 Running Without Cloning (Quick Execution)

You can launch and utilize HELEN instantly inside any new or existing project directory **without cloning the repository**!

```bash
# 1. Initialize recommended modules in any active directory
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

## 🛠️ Local Development & CLI Setup

If you are developing or contributing to the HELEN codebase locally, set up your workspace as follows:

### 1. Clone & Build
```bash
# Clone the repository
git clone https://github.com/eneekoruiz/helen.git
cd helen

# Install developer dependencies cleanly
npm ci

# Compile TypeScript codebase to JavaScript (dist/)
npm run build
```

### 2. Local CLI Testing
To test the CLI locally, link it to your global node package list:
```bash
# Link the local build globally
npm link

# Use the globally linked executable in any workspace directory
helen doctor
helen scripts easter-egg
```

### 3. Verification & QA Scripts
```bash
npm run build       # Compile TypeScript outputs to dist/
npm run test        # Execute the Vitest unit test suite (40+ assertions)
npm run format      # Auto-format codebase with Prettier
npm run lint        # Check code quality and style constraints
```

---

## 📦 Current Active Modules Registry

HELEN offers a catalog of **10 highly cohesive modules** that can be injected on-demand into your codebase:

| Module | Identifier | Scaffolds & Enhances |
| :--- | :--- | :--- |
| **Security Utilities** | `security` | Enforces environment validation via Zod, URL filters, HTML sanitizers. **Strict mode** appends AES-256-GCM encryption wrappers, SHA-256 secure digests, and CSP configurations. |
| **Developer Experience** | `dx` | Configures `.vscode/settings.json`, recommended extensions, and outputs `scripts/easter-egg.ts` to run truecolor animations in your own projects. |
| **Theme System** | `theme` | Injectable React `<ThemeProvider>`, custom `useTheme` hook, and dark-mode toggle components. |
| **Sentry Error Tracking** | `sentry` | `@sentry/react` setup with session replay, user feedback, and security-hardened data redaction configurations. |
| **Docker Environment** | `docker` | Optimized multi-stage `Dockerfile` (development & production) and `docker-compose.yml` setups. |
| **GDPR Compliance** | `gdpr` | Fully interactive React cookie consent banners, policies, and context hooks. |
| **CI/CD Pipeline** | `ci` | Preconfigured GitHub Actions workflows for automated typechecking, linting, testing, and production packaging. |
| **SEO Basics** | `seo` | Dynamic React SEO metadata header component, robots.txt, and site manifest configurations. |
| **Internationalization** | `i18n` | High-quality `react-i18next` engine with modular English and Spanish translation structures. |
| **Progressive Web App** | `pwa` | Progressive offline-first asset configurations via `vite-plugin-pwa`. |

---

## 🤝 Contributing

Contributions are highly valued. To maintain pristine code quality, follow these steps:

1. Fork the repository and create a feature branch (`git checkout -b feature/cool-addition`).
2. Run `npm ci` and compile cleanly with `npm run build`.
3. Add Vitest coverage for your behavior under the `tests/` folder.
4. Run `npm run test` to verify all tests pass seamlessly.
5. Format code by running `npm run format`.
6. Open a clean Pull Request detailing your changes.

To initialize local ESLint checks in your editor, configure it by running:
```bash
npm init @eslint/config
```

---

## 📄 License

MIT © [eneekoruiz](https://github.com/eneekoruiz)
