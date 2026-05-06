# 🌌 HELEN CLI — The Ultimate Project Architect

**HELEN** (High-End Logical Ecosystem for Node) is a production-grade CLI designed to evolve your standard React + Vite + TypeScript projects into enterprise-ready applications. Stop wasting time on repetitive setups and start building with a "Gold Master" foundation.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Build: Passing](https://img.shields.io/badge/Build-Passing-brightgreen.svg)
![Type: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)

---

## 🚀 Key Features

- **Project Scaffolding**: Create fresh Vite or Next.js projects with one command.
- **Modular Architecture**: 14 high-value modules (Docker, CI/CD, Testing, SEO, Security, GDPR, PWA, i18n, Sentry, Tailwind, Shadcn).
- **Generative Engine**: Instant boilerplate for Components, Hooks, Pages, and Domain Entities.
- **Fail-Safe Shield**: Hardened against path traversal, prototype pollution, and malformed configurations.
- **Project Memory**: Persistent `.helenrc` tracks your project state and installed modules.

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/eneekoruiz/helen.git
cd helen

# Install dependencies and build
npm install
npm run build

# Link globally (optional)
npm link
```

---

## 🎮 Commands

### 1. Project Lifecycle
- **`helen create <name>`**: Scaffold a new project (Vite by default). Use `--next` for Next.js.
- **`helen init`**: Quick setup of all recommended modules in an existing project.
- **`helen update`**: Re-sync all installed modules with the latest HELEN templates.
- **`helen eject <module>`**: Remove a module and its generated files safely.

### 2. Daily Workflow
- **`helen generate <type> <name>`**: (Alias: `helen g`) Scaffold components, hooks, etc.
- **`helen add <module>`**: Add specific infrastructure modules (e.g., `docker`, `tailwind`).
- **`helen doctor`**: Audit your project's health and compatibility.

### 3. Documentation & Exploration
- **`helen modules`**: List all 14 available modules with status.
- **`helen explain <module>`**: Deep dive into any module's purpose and impact.
- **`helen generate-docs`**: Auto-generate a Markdown library for your project's docs.

---

## 🛡️ Architecture & Safety

HELEN is built to be **"Fail-Safe"**:
- **Dry-Run Mode**: Every destructive command supports `--dry-run` to preview changes.
- **Path Isolation**: The CLI cannot write files outside the current project directory.
- **Config Recovery**: Automatic detection and backup of corrupted `.helenrc` files.
- **Template Guard**: Syntax errors in templates are captured gracefully without crashing the CLI.

---

## 📦 Available Modules

| Module | Purpose |
|--------|---------|
| **Quality** | ESLint + Prettier + TS Strict Mode |
| **Testing** | Vitest + Testing Library + jsdom |
| **Infrastructure** | Docker + CI/CD + PWA + Sentry |
| **UI** | Tailwind CSS + Shadcn UI + Theme System |
| **Legal/SEO** | GDPR (Cookie Consent) + SEO Basics |
| **Security** | Env Validation (Zod) + Sanitization Utils |

---

## 📄 License

MIT © [eneekoruiz](https://github.com/eneekoruiz)
