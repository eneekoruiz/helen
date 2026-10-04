---
name: helen-router
description: Use when the user asks what phase a project is in, what to do next, or which HELEN prompt or flow to run - detects the project phase from evidence, checks transition criteria, reuses existing scope and recommends the next step.
version: 2.1.0
---

# HELEN Phase Router

Act as a development operating system: show current state, infer scope from existing context, recommend the next phase, and point to the right prompt, skill, or specialized subagent.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
## Phases

1. `01-start-project`: initial risk scan, benchmark, roadmap, technology lifecycle.
2. `02-building`: implementation, clean code, data models, APIs, build/lint/test checkpoints.
3. `03-finish-features`: UX, premium visual design, responsive, accessibility, visual regression.
4. `04-before-production`: adversarial QA, scale and cost, privacy, observability.
5. `05-final-audit`: code, i18n, docs, GitHub repository.
6. `06-release`: packaging, changelog, release notes, release gates.
7. `07-client-handoff`: last-mile checks (forms, CTAs, links), delivery package.
8. `08-maintenance`: backups, governance, showcases, library integrity.
9. `09-future-knowledge`: onboarding, resilience, bus factor, decision log.

## Phase signals

| Evidence | Likely phase |
|---|---|
| Idea, no code or only a scaffold | 01 |
| Code in progress; tests, CI or lint gates missing | 02 |
| Features work; UX, visual, responsive or a11y rough | 03 |
| Polished; no load/abuse testing, privacy or monitoring | 04 |
| Hardened; docs, i18n or repo presentation pending | 05 |
| Ready to ship; changelog/release notes/tag pending | 06 |
| Shipped to a client; delivery package or last-mile checks pending | 07 |
| Delivered or signed off; now dependencies, backups, monitoring | 08 |
| Long-lived project at risk of losing knowledge (single owner, no ADRs) | 09 |

Pick the latest phase whose entry evidence is present and whose exit checklist is not yet met.

## Procedure

1. Gather evidence from repository structure, git log, `package.json`, CI, and docs.
2. Infer phase and scope from existing context; ask only for essential unknowns.
3. Recommend exact next prompt or playbook: `helen apply <goal>` or `helen prompts show <ref>`.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected expertise or context savings outweigh transfer, coordination, integration, verification and retries. Flash is optional when available and suitable. Keep shared instructions as a stable prefix and task facts after it; provider caching requires runtime support and measured cache hits. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.
