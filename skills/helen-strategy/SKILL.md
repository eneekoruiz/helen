---
name: helen-strategy
description: Use when starting a new project, setting visual direction, or gathering design inspiration (curating real references, moodboards, design tokens); prioritizing product roadmaps, features, and quarterly backlog items using value, effort, and kill criteria; conducting competitor benchmarking and market analysis; or scanning initial tech stack risks.
metadata:
  version: 2.1.0
---

# Strategy and Prioritization

Strategic clarity precedes line-by-line coding. `helen-strategy` guides product roadmapping, competitor benchmarking, design foundation, and risk analysis using interactive discovery and autonomous synthesis.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → run one focused discovery pass for high-impact edge cases, security or correctness within authorized scope. Once criteria pass, synthesize results and report optional further recommendations rather than looping indefinitely. Change failing hypotheses; respect cancellation and resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
## Competitive Benchmark

1. Identify competitors and substitutes.
2. Compare feature parity, UX quality, onboarding, pricing or packaging, integrations, trust signals, docs, performance, and polish.
3. Find gaps that matter to users, not feature counts, and existing differentiators.
4. Second-order opportunities: fewer features with better flow, better defaults, faster time-to-value, sharper niche.
5. Do not copy competitors blindly. Do not invent facts; if live data is needed and unavailable, state it clearly.

## Roadmap and ROI

1. Classify work by user value, risk reduction, revenue or growth, maintenance value, strategic value.
2. Estimate effort and confidence; identify dependencies and sequencing.
3. Separate quick wins (< 1 day) from strategic bets.
4. Define kill criteria for low-value work.

## Inspiration and Design Foundation

Collect 5-10 real references with their URLs and, for each, the one thing to take from it (Dribbble, Awwwards, Behance, Godly, Pinterest) and capture the design system in a `DESIGN.md`. Inspire; never clone another brand's identity.

## Native clarification

Before implementation or evaluation, check whether a missing preference, constraint or acceptance decision materially affects the result. If it does, invoke the application's available native structured question tool (such as `request_user_input_async`, an available `request_user_input`, or `AskUserQuestion`), with concise task-specific choices and free text. Reuse existing answers and continue independent work while waiting. If the tool is unavailable in the current mode, ask conversationally; do not create a separate visual artifact or invent answers. If context suffices, proceed without a questionnaire.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected specialist expertise or context savings outweigh transfer, coordination, integration, verification and retries. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.

## Project records

When HELEN is available, inspect `helen work list` and reuse the relevant `helen work brief <id>` before acting or handing off. Preserve its exclusions, acceptance and decisions. Record material questions and the actual human answer in that dossier; use native forms when available without claiming UI verification from metadata. Relevant learning matches remain advisory; for visual or written deliverables read `helen creative show` and respect explicit user/template choices. If these tools are unavailable, use supplied scope and report the continuity limitation.
