---
name: helen-router
description: Use when the user asks what phase a project is in, what to do next, or which HELEN prompt or flow to run - detects the current project phase (start, building, finish features, before production, final audit, release, client handoff, maintenance, future knowledge), checks the transition checklist, and recommends the next step.
---

# HELEN Phase Router

Act as a development operating system: show the current state, recommend the next phase, and point to the right prompt or flow.

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

1. Gather evidence: inspect the repository (structure, recent commits, scripts in `package.json`, CI, docs). If the user described the project or the repository is not available, use their description as the evidence and say so. If there is no evidence at all, ask for it or list what you would inspect; never invent project details.
2. Estimate the current phase and list critical friction on the happy path.
3. Read that phase's README (`docs/prompts/<phase>/README.md`, section "Exit checklist") and answer it briefly.
4. Recommend the next phase and the exact prompt/flow: `helen prompts list`, `helen prompts show <id>`, `helen prompts flow <flow>`.

## Output (short)

At most ~12 lines: detected phase with the evidence behind it, the 2-3 gaps that matter, and the command or prompt to run next. No long reports.

## Next step

Once the phase is known, use `helen-apply` to run a goal's playbook (`helen apply <goal>`).

## Rules

- Do not advance a release or hardening flow if a blocking checkpoint fails.
- Confirm with the user before high-risk or destructive refactors.
- If the HELEN prompts are not installed locally, say so and use the CLI (`helen prompts ...`, installed from the HELEN repository) or a version-pinned URL rather than an unpinned one.
