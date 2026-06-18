# Product, UX, and Premium Quality Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Find product, UX, interface, content, and presentation issues that make a project feel unfinished, confusing, generic, or less premium than it could be.

Use this prompt when the project has a user-facing surface, public documentation, CLI interaction, onboarding flow, website, product page, or portfolio value.

Expected output:
- user-facing blockers;
- friction and polish gaps;
- product clarity improvements;
- premium quality opportunities;
- a practical action plan.

## Prompt

Review this project as a Product Manager, Product Designer, UX Researcher, Staff Frontend Engineer, brand-minded founder, and senior usability reviewer.

Goal: determine whether the product feels clear, coherent, intentional, trustworthy, and premium for its intended audience.

Do not limit the review to UI screens. Inspect README, CLI flows, docs, errors, empty states, naming, examples, screenshots, metadata, and any public-facing artifact.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Product clarity
- Identify what the product actually does, who it serves, and why it should exist.
- Flag vague positioning, unclear value, overbroad claims, and missing use cases.
- Check whether the first interaction teaches the right mental model.

2. User journeys
- Review primary flows from first contact to successful outcome.
- Flag confusing order, missing feedback, dead ends, unnecessary steps, and unclear recovery paths.
- Check onboarding, setup, empty states, errors, destructive actions, and success states.

3. UX consistency
- Review terminology, labels, hierarchy, interaction patterns, command names, navigation, and docs language.
- Flag places where the same concept appears under different names.
- Identify moments where the user must remember hidden context.

4. Visual and interaction quality
- For UI projects, inspect layout, spacing, typography, responsiveness, contrast, focus states, loading states, and motion.
- For CLI or library projects, inspect command ergonomics, output readability, prompts, errors, and examples.
- Flag anything that feels default, crowded, generic, awkward, or under-designed.

5. Trust and premium perception
- Review whether copy, visuals, examples, metadata, screenshots, and repository presentation create confidence.
- Flag placeholder content, generic AI-sounding language, stale screenshots, weak naming, broken links, rough edges, and inconsistent tone.

6. Accessibility and inclusivity
- Check keyboard access, semantic structure, color contrast, screen reader signals, reduced motion, language clarity, and error communication where applicable.
- For non-UI projects, check accessibility of docs, examples, and CLI output.

## Más allá de estos criterios

Use your own product and design judgment. Look for small changes that create disproportionate improvements in perceived quality.

You may propose copy changes, layout simplifications, naming improvements, flow reductions, better defaults, stronger examples, sharper screenshots, more honest positioning, or removal of features that dilute the product.

Question whether the project is solving the right problem. Identify places where the product is technically complete but experientially weak.

Do not chase decoration. Premium means coherent, calm, useful, intentional, and trustworthy.

## Formato de entrega

1. Start with user-facing blockers and UX issues, classified by severity (Críticos, Importantes, Opcionales).
2. Premium polish opportunities, ordered by impact.
3. For each item include: evidence, user impact, recommended fix, and scope.
4. Separate quick wins from deeper product decisions.
5. End with a verdict: `PREMIUM READY`, `GOOD BUT ROUGH`, or `NOT PRESENTABLE YET`.
6. Include one sentence explaining what currently makes the product feel least mature.
