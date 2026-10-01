---
name: helen-strategy
description: Use when starting a new project, setting visual direction, or gathering design inspiration (curating real references, moodboards, design tokens); prioritizing product roadmaps, features, and quarterly backlog items using value, effort, and kill criteria; conducting competitor benchmarking and market analysis; or scanning initial tech stack risks.
version: 2.1.0
---

# Strategy and Prioritization

Strategic clarity precedes line-by-line coding. `helen-strategy` guides product roadmapping, competitor benchmarking, design foundation, and risk analysis using interactive discovery and autonomous synthesis.

## Operating Principles

### 1. Interactive Discovery Questionnaire
Kick off strategy sessions with a structured questionnaire to extract crucial constraints:
- **Core ICP & Problem**: Who is the exact target persona and what single urgent pain is being solved?
- **Competitive Positioning**: Who are the primary alternatives, and what is our defensible differentiator (speed, niche, UX simplicity)?
- **Scope & Kill Criteria**: What features are strictly out of scope? What metrics determine if an initiative should be killed?
- **Clean Code vs. Rapid MVP**: Is the goal a production-grade hardened architecture or an experimental prototype?

### 2. Autonomous Synthesis Loop
Once constraints are established via the questionnaire, autonomously research, synthesize, and benchmark without requiring micromanaged prompts. Deliver complete strategic artifacts (`DESIGN.md`, `ROADMAP.md`, `ADR-001.md`).

### 3. Specialized Subagent Orchestration
- **Market & Competitor Researcher Subagent**: Discovers real public products, feature matrices, and pricing teardowns.
- **Tech Stack & Architecture Risk Subagent**: Audits scalability limitations, lock-in risks, and third-party API dependencies.

### 4. Extreme Token Economy
Present findings in dense comparison matrices, bulleted trade-off summaries, and actionable decision trees. Avoid filler business buzzwords.

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
