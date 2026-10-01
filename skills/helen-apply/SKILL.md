---
name: helen-apply
description: Main HELEN entry point. Use when the user says "use HELEN", "aplica Helen", asks where the project stands, what to do next, or asks for a whole area of work ("apply all the design improvements", "prepare the release", "make it secure"). Detects the project phase and runs the matching playbook of HELEN prompts, flows, checkpoints, skills and catalog tools.
version: 2.1.0
---

# HELEN Apply

One entry point for everything in HELEN. The user does not need to know which prompt or skill exists: you pick them, clarify scope, delegate to specialized subagents, and execute in an autonomous convergence loop.

## Procedure

1. **Detect the phase & clarify scope with an Interactive Questionnaire:**
   - Detect phase via `helen apply` or codebase heuristics.
   - Present targeted questions / questionnaire to lock in critical scope parameters:
     * *Which goals/areas to prioritize?* (e.g. design, security, performance, release).
     * *Clean Code & Refactor Scope:* Do you want broad architectural cleanup, or should we strictly isolate fixes to functional, security, and aesthetic changes?
     * *Subagent Mode:* Delegate domain tasks to specialized subagents for parallel execution?
2. **Choose the goal & lock the plan:**
   - Map user responses to a playbook goal.
3. **Execute in an Autonomous Convergence Loop:**
   - Once scope is confirmed, shift into autonomous execution mode.
   - Do NOT stop between steps to ask for permission.
   - For complex tasks, spawn **Specialized Subagents** (e.g. Research, Audit, Design, Testing).
   - Execute: Step → Verify → Test → Fix → Advance until all checkpoints and gates pass.
4. **Token Economy:**
   - Omit conversational filler. Deliver dense, high-signal briefs, diffs, and verification metrics.
5. **Final 10/10 Report:**
   - Report executed steps, subagent outputs, test/build status, and remaining zero-defect verdict.

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

- **Level 100 Mandate & Autonomous Convergence**: User requests are the Level 0 baseline. Exercise full technical mastery and broad scope ("manga ancha") to resolve adjacent issues autonomously until 100/100 quality is achieved.
- **Interactive Scoping First**: Clarify trade-offs up front, then execute without interruptions.
- **Subagents & Token Economy**: Leverage specialized subagents; communicate with maximum density and minimum tokens.
- Confirm before destructive or irreversible changes (e.g. database wipe). Never invent synthetic metrics, logos, or claims.
