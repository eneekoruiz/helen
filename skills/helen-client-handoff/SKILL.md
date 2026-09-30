---
name: helen-client-handoff
description: Use when preparing to hand off or deliver a project to a client or new maintainer, assembling delivery packages, conducting pre-demo browser smoke tests (checking console errors, broken assets, forms, mobile viewports), planning repository or file transfers (warning against sending .env or node_modules in zip archives), verifying credentials management, and writing handoff documentation and sign-offs.
---

# Client Handoff

## Checklist

1. Setup and deployment reproduce on a clean machine.
2. No credentials, tokens, or development access exposed in the repo or docs.
3. Ownership is clear: domains, hosting, repositories, databases, SaaS accounts, and where credentials live (name the vault, never the secret).
4. Links, forms, and CTAs work; media has alt text and sensible weight.
5. A browser smoke test passes on every main route, including reload (deep links) and back/forward navigation, on mobile and desktop (a headless browser tool such as `playwright-cli` helps).
6. Release notes, changelog, and a demo package exist.
7. The receiver has a clear roadmap to keep operating.

## Final summary

1. Handoff package structure and links.
2. Quality verification status.
3. Documented technical and support risks.
4. Access and IP transfer instructions.
5. Sign-off recommendation.

Run the verification checkpoints first (build, tests, security, release readiness). Flow: `helen prompts flow client-delivery`.
