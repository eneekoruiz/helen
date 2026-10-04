---
name: helen-apply
description: Main HELEN entry point. Use when the user says "use HELEN", "aplica Helen", asks where the project stands, what to do next, or asks for a whole area of work ("apply all the design improvements", "prepare the release", "make it secure"). Detects the project phase and runs the matching playbook of HELEN prompts, flows, checkpoints, skills and catalog tools.
version: 2.1.0
---

# HELEN Apply

One entry point for everything in HELEN. The user does not need to know which prompt or skill exists: you pick them, clarify scope, delegate to specialized subagents, and execute in an autonomous convergence loop.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Start with the cheapest available model when selectable; escalate only for verified failure or unresolved reasoning. State unavailable controls.
- Delegate independent domains to focused specialist agents with exclusive ownership; integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
## Procedure

1. Detect phase from repository evidence or `helen apply`. Reuse existing scope; clarify only essential unknowns.
2. Select the goal and playbook; define acceptance before execution.
3. Execute authorized steps and checkpoints, then run autonomous improvement discovery.
4. Report outcomes, checks, additional findings and residual risks.

## Goals

| Goal | Use for |
|---|---|
| design | premium design, layout, responsive, anti-template |
| copy | copy, claims, CRO, humanizing text |
| motion | animation, scroll, view transitions, 3D |
| quality | clean code, accessibility, performance, build/lint/tests |
| security | secrets, injection, dependencies |
| seo-legal | SEO, i18n, privacy, legal claims |
| qa | adversarial QA, scale, observability |
| release | release candidate and verdict |
| deploy | GitHub and hosting |
| handoff | client delivery |
| strategy | risks, benchmark, roadmap |
| data | API contracts and data model |
| knowledge | ADRs, AI context, runbook, bus factor |
| autonomy | agent loops, spec-driven work, automated review |
| implementa | autonomous end-to-end implementation with self-correction |
| connect-tools | connecting MCP servers safely (browser, docs, GitHub, hosting, database) |
| safe-install | vetting third-party skills |

## Rules

Follow the execution contract above. Preparing a release does not authorize tagging, publishing or transferring credentials. Never invent metrics, logos or claims.
