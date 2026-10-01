---
name: helen-release
description: Master skill for release engineering, SEO technical compliance, version bumps, changelogs, privacy policies, and preparing clean handoffs to clients in an autonomous convergence loop.
version: 2.1.0
---

# Release Engineering & Client Handoff (Release Master Skill)

Decide if the project can be packaged as a release candidate (RC) or delivered to a client, with mathematical guarantees. This skill groups release candidate preparation, SEO/i18n compliance, and clean client handoff packaging.

## Operating Principles

### 1. Interactive Scoping Questionnaire
Before beginning release packaging, clarify deployment and delivery parameters:
- **Release Target & Versioning**: What is the target bump (patch, minor, major) and distribution channel (npm, Docker, Vercel, static export)?
- **Handoff Mode**: Internal engineering release vs. client handover package with credential transfer protocols?
- **Strictness Level**: Fail-fast on minor SEO/a11y warnings or require only build/typecheck/security pass?

### 2. Autonomous Release Convergence Loop
Once release parameters are locked:
**Build & Compile → Test & Security Scan → SEO/i18n Verification → Asset Optimization → Package → Repeat**
Iterate autonomously through all verification gates. Do not stop until all checks pass and the final release candidate is fully compiled and tagged.

### 3. Specialized Subagents
- **SEO & Compliance Subagent**: Audits OpenGraph, canonical URLs, robots.txt, sitemaps, and legal claim compliance.
- **Smoke Test & Verification Subagent**: Runs browser smoke tests across deep routes, back/forward navigation, and responsive viewports.
- **Changelog & Documentation Subagent**: Generates clean semantic release notes and handoff runbooks.

### 4. Extreme Token Economy
Provide high-density release summaries: verification tables, semver tags, and checksums. Zero fluff.

## The Release Candidate Sequence

1. **Build & Compile**: Verify the project builds completely from a cold start.
2. **Deterministic Gates**: Run the linter, typechecker, and test suite. They must pass with zero exceptions.
3. **Security Hardening**: Verify no `.env`, credentials, API tokens, or development access are exposed.
4. **SEO & i18n Compliance**:
   - Check title, meta description, Open Graph, canonical URLs, robots.txt, sitemaps, single h1, and heading order.
   - Confirm no accidental noindex in production.
   - Verify visible strings are localized and language fallbacks work.
5. **Documentation & Handoff Preparation**:
   - Ensure setup and deployment instructions reproduce on a clean machine.
   - Clarify ownership: domains, hosting, databases, SaaS accounts, and credential vaults (name the vault, never the secret).
   - Generate release notes, changelogs, and demo package.

## Final Summary Output Format

```text
# 🚀 HELEN Release Verdict: [RC READY | RC WITH CAVEATS | NOT RC READY]

- **Version Bump**: [e.g. v2.1.0]
- **Verification Gates**: Build (Pass), Types (Pass), Tests (Pass), Security (Pass), SEO (Pass)
- **Handoff Package**: [Path to changelog and built assets]
- **Ownership & Access**: [Documented transfers]
```