---
name: helen-apply
description: Main HELEN entry point. Use when the user says "use HELEN", "aplica Helen", asks where the project stands, what to do next, or asks for a whole area of work ("apply all the design improvements", "prepare the release", "make it secure"). Detects the project phase and runs the matching playbook of HELEN prompts, flows, checkpoints, skills and catalog tools.
version: 2.1.0
---

# HELEN Apply

One entry point for everything in HELEN. The user does not need to know which prompt or skill exists: you pick them.

## Procedure

1. **Detect the phase.** If the `helen` CLI is available, run `helen apply` (no goal). Otherwise inspect the repository (package.json, source, tests, CI, CHANGELOG, deploy config, docs) and estimate the phase from `helen-router`. State the evidence and say it is an estimate.
2. **Choose the goal.**
   - The user named an area: map it to a goal below (or run `helen apply "<their words>"`).
   - The user only said "use HELEN" or "what should I do": propose the goals suggested for the detected phase and ask which to run. Do not run all of them unasked.
3. **Load the playbook.** `helen apply <goal> --track` starts a tracked run: then `helen next` shows the current step with the prompt text or commands, `helen done "<what you did>"` advances, `helen skip "<reason>"` skips, `helen status` shows progress, `helen check` runs the project's typecheck, lint, test and build (a checkpoint step cannot be marked done until it passes). Without tracking, `helen apply <goal>` prints the steps and `--brief` prints a brief. Without the CLI, read `docs/prompts/playbooks.json`. If neither is available, present the plan in the default order: evidence of the current state → direction or design system → structure and layout → detailed polish → responsive and accessibility → verification (build, tests, visual check) → report.
4. **Execute the steps in order.** By step kind:
   - `prompt` or `flow`: read it (`helen prompts show <ref>`) and follow it.
   - `checkpoint`: run it; if it fails, stop and report. Never advance past a failed checkpoint.
   - `skill`: use the bundled skill. If missing, install it: `helen skills install <name> --target claude codex` (or `--target custom --dir <path>`).
   - `external` (skills, plugins, CLIs and MCP servers): never install or connect on your own. Show `helen skills external <id>` output, remind the user to review it (`audit-third-party-tools-and-mcp`), and continue only with approval. Use at most ONE main design skill (taste-skill, impeccable or ui-ux-pro-max overlap). Large harnesses such as ECC overlap with HELEN itself: recommend a minimal or selective install (single skills, no hooks), never the whole bundle on top.
5. **Verify** before reporting: build and tests, plus a visual check (screenshots or visual regression) for design and motion work.
6. **Report**: steps done, skipped (and why), changes, risks, manual actions.

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
| connect-tools | connecting MCP servers safely (browser, docs, GitHub, hosting, database) |
| safe-install | vetting third-party skills |

## Rules

- Prompts guide one task; skills give standing know-how; catalog tools are third-party and optional.
- Confirm before destructive or high-risk changes. Never invent content, metrics, testimonials, or claims.
- Prefer minimal changes and verify with build, lint, and tests when they exist.
