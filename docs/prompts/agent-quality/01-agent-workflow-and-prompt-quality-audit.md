# Agent Workflow and Prompt Quality Audit

Purpose: audit the prompt system itself: clarity, coverage, safety, orchestration, repeatability, and usefulness for editor-integrated agents.

## Prompt

Act as an AI Workflow Architect, Principal Engineer, prompt systems designer, and agent safety reviewer.

Review this prompt library and agent workflow system.

## Requisitos mínimos obligatorios

1. Review prompt names, folder structure, flow orchestration, checkpoints, safety rules, output formats, and duplication.
2. Check whether each prompt has a clear objective, scope, stop conditions, validation criteria, and final deliverable.
3. Identify prompts that are too broad, too narrow, overlapping, ambiguous, or hard for an agent to execute.
4. Review whether flows avoid premature final audits, repeated work, token waste, unsafe changes, and missing evidence.
5. Check whether the CLI or registry exposes prompts consistently.

## Más allá de estos criterios

Look for prompt-system debt: instructions that sound good but cannot be operationalized, missing machine-readable metadata, unclear step dependencies, weak checkpoint semantics, poor naming, lack of traceability, or flows that could let an agent continue when it should stop.

Recommend improvements that make the system easier to execute, not merely more impressive.

## Output format

1. Prompt-system blockers.
2. Naming and structure issues.
3. Orchestration risks.
4. Missing prompt families.
5. Automation opportunities.
6. Verdict: `AGENT-READY`, `USABLE BUT ROUGH`, or `ORCHESTRATION RISK`.
