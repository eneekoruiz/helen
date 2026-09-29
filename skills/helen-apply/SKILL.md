---
name: helen-apply
description: Main HELEN entry point. Use when the user says "use HELEN", "aplica Helen", asks where the project stands, what to do next, or asks for a whole area of work ("apply all the design improvements", "prepare the release", "make it secure"). Detects the project phase and runs the matching playbook of HELEN prompts, flows, checkpoints, skills and catalog tools.
---

# HELEN Apply

One entry point for everything in HELEN. The user does not need to know which prompt or skill exists: you pick them.

## Procedure

1. **Detect the phase.** If the `helen` CLI is available, run `helen apply` (no goal). Otherwise inspect the repository (package.json, source, tests, CI, CHANGELOG, deploy config, docs) and estimate the phase from `helen-router`. State the evidence and say it is an estimate.
2. **Choose the goal.**
   - The user named an area: map it to a goal below (or run `helen apply "<their words>"`).
   - The user only said "use HELEN" or "what should I do": propose the goals suggested for the detected phase and ask which to run. Do not run all of them unasked.
3. **Load the playbook.** `helen apply <goal>` prints the ordered steps; `helen apply <goal> --brief` prints a brief. Without the CLI, read `docs/prompts/playbooks.json`.
4. **Execute the steps in order.** By step kind:
   - `prompt` or `flow`: read it (`helen prompts show <ref>`) and follow it.
   - `checkpoint`: run it; if it fails, stop and report. Never advance past a failed checkpoint.
   - `skill`: use the bundled skill. If missing, install it: `helen skills install <name> --target claude codex` (or `--target custom --dir <path>`).
   - `external`: never install on your own. Show `helen skills external <id>` output, remind the user to review it (`audit-third-party-skills-supply-chain`), and continue only with approval. Use at most ONE main design skill.
5. **Report**: steps done, skipped (and why), changes, risks, manual actions.

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
| safe-install | vetting third-party skills |

## Rules

- Prompts guide one task; skills give standing know-how; catalog tools are third-party and optional.
- Confirm before destructive or high-risk changes. Never invent content, metrics, testimonials, or claims.
- Prefer minimal changes and verify with build, lint, and tests when they exist.
