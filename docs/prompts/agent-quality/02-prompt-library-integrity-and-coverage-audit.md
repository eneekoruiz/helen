# Prompt Library Integrity and Coverage Audit

Purpose: audit this prompt repository itself for duplicates, missing categories, weak names, inconsistent structure, unclear orchestration, and prompts that fail to use agent intelligence.

Use this before adding new prompt families, after major prompt changes, or whenever the library starts feeling scattered.

Do not use this to polish an application product. Use it to improve the prompt system.

## Prompt

Act as a Principal Engineer, AI Workflow Architect, Staff Product Engineer, prompt systems designer, QA Lead, technical editor, and CTO reviewing a reusable prompt library.

Inspect the full prompt repository, registry, flows, steps, checkpoints, README files, guides, and tests. Improve the system only where the change increases clarity, reuse, coverage, safety, maintainability, or orchestration quality.

## Requisitos mínimos obligatorios

1. Audit taxonomy and coverage
- Check whether each prompt has a distinct intention.
- Find duplicated prompts, overlapping flows, vague names, hidden entrypoints, and missing canonical mappings.
- Verify that `TAXONOMY.md`, `COVERAGE.md`, `STANDARDS.md`, and `registry.json` agree.

2. Audit structure
- Check whether each file belongs in the right layer: guide, family prompt, flow, step, or checkpoint.
- Find prompts that should be merged, split, renamed, moved, or removed.
- Verify that every important family is reachable from the README and CLI registry.

3. Audit prompt quality
- Check that atomic prompts include objective, usage boundaries, mandatory criteria, `Más allá de estos criterios`, safety limits, final checks, and delivery format.
- Flag prompts that are checklist-only, too generic, too narrow, or too risky.
- Check whether prompts encourage repository-wide inspection and senior judgment.

4. Audit orchestration
- Check that flows execute in a sensible order.
- Verify checkpoints exist between risky phases.
- Check that stop conditions are clear.
- Find flows that do too much too early, repeat work, or run final audits before the project is ready.

5. Audit naming and discoverability
- Check names for clarity from CLI output alone.
- Remove vague names where a more explicit name would reduce misuse.
- Ensure similar intents resolve to one canonical entry.

6. Audit validation
- Check whether tests cover prompt discovery, registry parsing, important families, and ambiguity risks.
- Recommend lightweight automation when manual discipline is not enough.

## Más allá de estos criterios

Think like the owner of a prompt operating system that should keep improving for years.

Look for failure modes that are not obvious: prompt drift, category sprawl, hidden duplicates, instructions that sound good but are not executable, missing stop conditions, agent loops, false confidence, stale README entries, CLI discoverability gaps, and prompts that encourage large unsafe rewrites.

Prefer making the library smaller, sharper, and more coherent over adding more files.

## Límites de seguridad

- Do not create new prompt families unless they cover a distinct missing intention.
- Do not rename files without updating references, registry entries, README files, coverage docs, and tests.
- Do not remove prompts unless their intention is fully covered elsewhere.
- Do not loosen safety rules to make flows feel smoother.
- Do not add automation that hides agent judgment.

## Checks finales

- Registry parses.
- CLI can resolve new or renamed prompts.
- README, coverage, taxonomy, and standards are aligned.
- No obvious duplicate prompt remains.
- New names are understandable from CLI output.
- Tests/typecheck run when available.

## Formato de entrega

1. Structural changes.
2. Prompts merged, split, renamed, added, or removed.
3. Coverage gaps closed.
4. Remaining gaps intentionally left open.
5. Registry/CLI updates.
6. Validation commands run.
7. Recommendation for the next maintenance pass.
