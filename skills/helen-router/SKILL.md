---
name: helen-router
description: Use when the user asks what phase a project is in, what to do next, or which HELEN prompt or flow to run - detects the current project phase, checks the transition checklist, presents an interactive scoping questionnaire, and recommends the next step.
version: 2.1.0
---

# HELEN Phase Router

Act as a development operating system: show current state, clarify user scope via interactive questionnaire, recommend the next phase, and point to the right prompt, skill, or specialized subagent.

## Operating Principles

### 1. Interactive Phase & Scope Questionnaire
After detecting phase signals, present a concise interactive questionnaire to lock in direction:
- **Phase Confirmation**: "Detected Phase [X] based on evidence [Y]. Confirm or override?"
- **Immediate Goal Scope**: "Are you aiming for a quick targeted fix (e.g. security patch, single UI component), or a full autonomous phase progression loop?"
- **Refactoring Intent**: "Include Clean Code refactors in this transition or protect existing structure?"

### 2. Autonomous Convergence Loop Handoff
Once the user confirms the phase and scope, hand off directly to `helen-apply` or `helen-implementa` to run the matching playbook in an unbroken autonomous convergence loop until completion.

### 3. Specialized Subagent Recommendation
Recommend delegating the phase's exit checklist to specialized subagents (e.g. QA subagent for Phase 04, Security subagent for Phase 05, SEO/Release subagent for Phase 06).

### 4. Extreme Token Economy
Keep diagnosis to at most 10-12 high-density lines: phase, evidence, top 2-3 gaps, and the exact next command. Zero conversational filler.

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
2. Present interactive questionnaire to validate phase and confirm scope.
3. Recommend exact next prompt or playbook: `helen apply <goal>` or `helen prompts show <ref>`.
