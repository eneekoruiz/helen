---
action: INIT
phase: 01-start-project
summary: Translate the business brief and DESIGN.md into information architecture, base layout, tokens and an initial component system.
modifies_code: true
---

# Architecture and Scaffold

## Goal

Create the base technical, visual and commercial structure of a new web project: pages and sections with a sales purpose, design tokens, and reusable components, without a generic template look.

## Use when

- After `init-business-core` (and ideally `init-creative-direction-and-design-md`).
- Before generating the first real project in an editor agent or AI builder.

## Requirements

Inputs: the business brief, stack, conversion type, visual references or `DESIGN.md`, brand constraints.

1. **Information architecture** with commercial intent: first viewport, proof, mechanism, objections, process, cases, closing.
2. **Design tokens:** color, typography, spacing, radii, shadows, motion, breakpoints (take them from `DESIGN.md` when it exists).
3. Navigation, footer, CTAs, forms, empty states and loading states from the start.
4. Reusable components without over-designed abstractions.
5. Restrained micro-interactions: hover, focus, reveal, scroll, validation, confirmation.
6. The first viewport shows the promise and hints at the next section.

## Beyond the checklist

If a section does not help sell, remove or merge it. If an interaction adds friction, simplify it.

## Limits

- No final copy without enough proof in the brief; never invent quantitative claims.
- Avoid template patterns (split SaaS hero) when the brand needs a crafted feel.

## Output

Information architecture, visual system, base components, responsive layout, motion rules, and an implementation checklist. When writing code, report it as: files created, how to run, what is still placeholder.
