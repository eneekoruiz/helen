# Legacy HELEN Bash Script

This directory contains the original HELEN bash prototype (`helen.sh`).

## What was it?

`helen.sh` was the original 5000+ line bash script that automated project setup for React + Vite + TypeScript projects. It covered:

- Security headers and utilities
- SEO + Open Graph + PWA
- Docker + CI/CD
- GDPR/RGPD compliance
- Testing setup
- Code quality (ESLint, Prettier, TypeScript strict)
- Developer experience (VS Code settings, .env templates)
- i18n
- Analytics
- UI components and hooks
- Clean architecture scaffolding

## Why was it replaced?

While functional, the bash script had limitations:
- Not cross-platform (Windows compatibility issues)
- Hard to test individual modules
- No interactive module selection
- No dry-run capability
- All-or-nothing execution
- Difficult to maintain at 5000+ lines

## What replaced it?

The new HELEN CLI is built with Node.js + TypeScript and provides:
- Interactive menu with module selection
- Individual module execution
- Dry-run mode
- Project health checks (doctor)
- Integrated documentation per module
- Cross-platform support
- Testable, modular architecture

## Usage

The bash script is archived here for reference. Use the new CLI instead:

```bash
npm install
npm run build
node dist/cli.js
```
