---
action: GENERATE
phase: 08-maintenance
summary: Turn an audit or goal into a precise brief a coding agent can execute independently: context, scope, criteria, verification, done.
modifies_code: false
---

# Agent Brief Builder

## Goal

Turn an audit result or product goal into a brief that lets a capable agent with repository access work independently without making arbitrary changes. For a HELEN goal, `helen apply <goal> --brief` produces a first draft.

## Use when

- Delegating work to another agent or session, or to yourself later.

## Requirements

1. **Objective:** the concrete outcome.
2. **Context to inspect first:** files, folders, commands, docs, tests, UI surfaces, external constraints.
3. **Scope:** what the agent may change, may only propose, and must not touch.
4. **Quality criteria:** functional, UX, code, docs, security, performance, maintenance as applicable.
5. **Verification:** commands, manual checks, screenshots or artifacts required before finishing.
6. **Reporting:** final response format, risks, caveats, follow-ups.

## Beyond the checklist

Add missing context, likely edge cases and hidden risks. If the goal is underspecified, propose a safe path and mark the assumptions.

## Limits

- Never put secrets or credentials in a brief.

## Output

A ready-to-use brief: Mission, Context, Constraints, Work plan, Verification plan, Definition of done.
