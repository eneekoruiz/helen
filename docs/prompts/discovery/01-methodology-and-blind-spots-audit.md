# Methodology and Blind Spots Audit

Purpose: discover what the current project methodology, folder structure, prompt library, and quality process are not yet capable of seeing.

Use this prompt when you want an unusually deep review before final audits, especially after several improvement iterations.

Expected output:

- missing categories;
- weak assumptions;
- methodology gaps;
- proposed prompt or process improvements;
- a prioritized action plan.

## Prompt

Review this repository and its project methodology as a Principal Engineer, CTO, Product Manager, Product Designer, UX Researcher, Security Engineer, SRE, QA Lead, Growth Engineer, software architect, SaaS founder, and senior technical consultant.

Goal: identify the blind spots that the current process, folder structure, prompt library, documentation, tests, and release approach still fail to cover.

Do not limit yourself to existing documents. Inspect the whole repository and infer what the project is trying to become.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Methodology coverage
- Check whether the project has clear stages: discovery, design, implementation, verification, release, maintenance, and archival.
- Identify lifecycle phases with no prompt, no checklist, no owner, or no decision gate.
- Flag places where the process verifies outputs but not assumptions.

2. Prompt library structure
- Review whether prompts are grouped by real project lifecycle and professional function.
- Identify prompts that are too narrow, duplicated, overlapping, or missing.
- Check whether each prompt asks for evidence, prioritization, tradeoffs, and a final decision.

3. Folder and documentation structure
- Review whether docs, templates, source, tests, assets, and generated outputs are easy to navigate.
- Flag naming conventions that will confuse future contributors.
- Identify missing top-level documents only when they would provide durable value.

4. Quality system
- Check whether tests, linting, type checking, docs, examples, release process, and manual QA form a coherent system.
- Identify quality claims that are not backed by repeatable verification.
- Flag checks that exist but do not protect meaningful risk.

5. Ownership and decision clarity
- Identify ambiguous ownership, unclear scope boundaries, unsupported modules, or undocumented tradeoffs.
- Flag places where future maintainers would not know whether to extend, replace, remove, or preserve a component.

6. Missing professional perspectives
- Explicitly ask what a Staff Engineer, Product Designer, Security Engineer, SRE, QA Lead, Growth Engineer, and founder would each notice that the current methodology misses.
- Distinguish true gaps from overkill.

## Más allá de estos criterios

Use the full repository as context and apply your own expert judgment.

Look for categories nobody asked for yet. Examples include onboarding, pricing, analytics, abuse prevention, observability, accessibility, content quality, information architecture, extensibility, data lifecycle, legal/compliance, contributor experience, migration strategy, deprecation policy, design system maturity, release governance, and portfolio positioning.

You may recommend adding, removing, merging, or renaming prompts if that makes the library more useful. You may propose structural changes to folders or docs when they reduce confusion or increase long-term quality.

Do not add process theater. Every recommendation must earn its maintenance cost.

## Output format

1. Start with the most important blind spots, ordered by severity and leverage.
2. For each finding include: area, evidence, why it matters, smallest useful improvement, and whether it should be fixed now or later.
3. List missing prompt categories worth adding.
4. List existing prompts or docs that should be merged, rewritten, or removed.
5. End with a verdict: `STRONG SYSTEM`, `GOOD BUT INCOMPLETE`, or `BLIND SPOTS REMAIN`.
6. Finish with one paragraph naming the biggest risk if the methodology stays unchanged.
