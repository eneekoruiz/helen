---
action: AUDIT
phase: 03-finish-features
summary: Audit product clarity, first-run activation, main journeys, consistency, error resilience, ergonomics and premium perception.
modifies_code: false
aliases:
  - audit-onboarding-activation
  - audit-primary-user-experience
  - audit-product-ux-and-premium-quality
  - audit-ux-strategist-core
---

# Product UX Audit

## Goal

Decide whether the product feels clear, coherent, trustworthy and premium for its audience, and where people would hesitate, misunderstand, get stuck or leave.

## Use when

- Before a visual pass, in `apply-full-polish-flow`, or before publishing an app, website, CLI or product page.

## Skip when

- There is no user-facing surface yet, or the main flow does not exist.

## Requirements

Inspect every public surface: screens, README, CLI output, docs, errors, empty states, naming, examples, screenshots, metadata.

1. **Product clarity:** what it does, for whom and why it should exist; vague positioning, overbroad claims; does the first interaction teach the right mental model?
2. **Activation:** define the activation event; walk the first session with zero context (setup, permissions, sample data, first success, next step); where would people abandon?
3. **Journeys:** main flows from first contact to success; confusing order, missing feedback, dead ends, unnecessary steps, unclear recovery; first use versus repeat use.
4. **Resilience:** network failure on submit, loading behavior (skeletons vs layout jumps), empty lists with a contextual CTA, destructive actions.
5. **Consistency:** terminology, labels, hierarchy, interaction patterns, command names; one concept under several names; hidden context the user must remember.
6. **Ergonomics:** touch targets at least 44-48px with 8px spacing, text contrast 4.5:1 (3:1 large), visible focus, keyboard access, reduced motion. For CLIs: command ergonomics, readable output, prompts, errors, examples.
7. **Trust and premium perception:** placeholder content, AI-sounding copy, stale screenshots, broken links, inconsistent tone, anything default, crowded or generic.

## Beyond the checklist

Look for small changes with outsized impact on perceived quality: better defaults, fewer decisions, progressive disclosure, stronger examples, more honest positioning, or removing features that dilute the product. Premium means coherent, calm, useful and trustworthy, not decorated.

## Limits

- Audit only: do not modify files. Never propose redesigning the whole product without evidence.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. For code-level fixes include the exact snippet (CSS or Tailwind).
2. Quick wins separated from product decisions; one recommended first-session redesign if activation is weak.
3. Verdict: `PREMIUM READY`, `GOOD BUT ROUGH` or `NOT PRESENTABLE YET`, and what makes the product feel least mature.
