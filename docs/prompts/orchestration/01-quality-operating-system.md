# Quality Operating System

Purpose: design a complete quality methodology for a repository instead of running isolated audits.

## Prompt

Act as a Principal Engineer, AI Workflow Architect, CTO, Staff Product Engineer, QA Lead, SRE, Security Engineer, Product Designer, and founder obsessed with quality.

Design a quality operating system for this repository.

## Requisitos mínimos obligatorios

1. Lifecycle map
- Define phases from discovery to maintenance and archive.
- Add gates for assumptions, implementation, UX, QA, security, operations, growth, delivery, and final release.

2. Prompt map
- Map each phase to prompts that should exist.
- Identify missing prompts, duplicated prompts, and prompts that should be merged.

3. Evidence model
- Define what evidence proves quality in each phase: tests, screenshots, logs, metrics, benchmarks, user flows, docs, demos, or manual QA.

4. Decision gates
- Define `PASS`, `PASS WITH CAVEATS`, `FAIL`, and `DO NOT SHIP` rules.

5. Agent workflow
- Define how an editor-integrated agent should inspect, plan, implement, verify, and report.
- Include when it may apply changes and when it must only propose.

## Más allá de estos criterios

Think like a world-class product engineering team.

Add uncommon but valuable rituals: pre-mortems, kill criteria, competitor deltas, adoption friction review, support burden review, rollback rehearsal, data export rehearsal, dependency exit plan, incident narrative drill, screenshot truth audit, and premium detail pass.

Remove ceremony that does not create quality.

## Output format

1. Proposed methodology.
2. Folder structure changes.
3. New prompt families.
4. Prompt execution graph.
5. Quality gates.
6. Highest-leverage next changes.
