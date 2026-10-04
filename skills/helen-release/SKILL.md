---
name: helen-release
description: Master skill for release engineering, SEO technical compliance, version bumps, changelogs, privacy policies, and preparing clean handoffs to clients in an autonomous convergence loop.
version: 2.1.0
---

# Release Engineering & Client Handoff (Release Master Skill)

Decide if the project can be packaged as a release candidate (RC) or delivered to a client, with reproducible verification evidence. This skill groups release candidate preparation, SEO/i18n compliance, and clean client handoff packaging.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
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
- **Verification Gates**: [Command, actual result and unavailable checks]
- **Handoff Package**: [Path to changelog and built assets]
- **Ownership & Access**: [Documented transfers]
```
Prepare release artifacts within authorization; tags, publication and account transfers require existing explicit authorization.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected expertise or context savings outweigh transfer, coordination, integration, verification and retries. Flash is optional when available and suitable. Keep shared instructions as a stable prefix and task facts after it; provider caching requires runtime support and measured cache hits. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.
