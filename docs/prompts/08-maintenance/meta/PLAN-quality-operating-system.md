---
action: PLAN
phase: 08-maintenance
summary: Design (or audit) the repository's whole quality methodology: lifecycle gates, evidence, decision rules, agent workflow and blind spots.
modifies_code: false
aliases:
  - plan-quality-operating-system-design
  - audit-methodology-and-blind-spots
---

# Quality Operating System

## Goal

Design a complete quality methodology for a repository instead of running isolated audits, and find the blind spots the current process, structure and prompt library still cannot see.

## Use when

- Setting up how a project (or HELEN itself) verifies quality; after several improvement rounds, before final audits.

## Requirements

1. **Lifecycle map:** discovery to maintenance and archive, with gates for assumptions, implementation, UX, QA, security, operations, growth, delivery and release. Which phases have no prompt, checklist, owner or gate?
2. **Prompt map:** prompts each phase needs; missing, duplicated, too narrow or overlapping prompts; do prompts demand evidence, priorities, tradeoffs and a decision?
3. **Evidence model:** what proves quality in each phase (tests, screenshots, logs, metrics, benchmarks, flows, docs, demos, manual QA); claims without repeatable verification; checks that protect nothing.
4. **Decision gates:** `PASS`, `PASS WITH CAVEATS`, `FAIL`, `DO NOT SHIP` rules.
5. **Agent workflow:** how an agent inspects, plans, implements, verifies and reports; when it may apply changes and when it may only propose.
6. **Ownership:** unclear scope, unsupported modules, undocumented tradeoffs; would a maintainer know whether to extend, replace, remove or keep each component?
7. **Missing perspectives:** what a Staff Engineer, Product Designer, Security Engineer, SRE, QA Lead, Growth Engineer and founder would each notice. Separate real gaps from overkill.

## Beyond the checklist

Valuable rituals: pre-mortems, kill criteria, competitor deltas, adoption friction and support burden reviews, rollback and data-export rehearsals, dependency exit plans, screenshot truth audits. Remove ceremony that does not create quality: every recommendation must earn its maintenance cost.

## Limits

- Plan only: do not modify files.

## Output

1. Proposed methodology and prompt execution graph.
2. Blind spots as **Critical**, **Important**, **Optional**, each with evidence and the smallest useful improvement.
3. Quality gates, folder or prompt changes (add, merge, rename, remove).
4. Verdict: `STRONG SYSTEM`, `GOOD BUT INCOMPLETE` or `BLIND SPOTS REMAIN`, and the highest-leverage next changes.
