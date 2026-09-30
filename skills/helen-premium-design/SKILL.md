---
name: helen-premium-design
description: Use when designing, polishing, or auditing a web UI to feel premium, human-made, and conversion-led - visual hierarchy, typography, motion, micro-interactions, responsive craft, and removing generic AI or template traces. Applies to landing pages, product UIs, portfolios, and client sites.
---

# Premium Design

HELEN does not produce standard web pages. It produces digital assets oriented to sales, trust, and perceived quality. Conversion comes before decoration.

## Principles

1. **Specific, not interchangeable.** Every choice must come from the brand, audience and product context, not from generic trends. A premium site looks inevitably made for that client. Anything swappable with another brand is suspect.
2. **Zero AI/template traces.** Watch for empty claims, inflated phrases, excessive symmetry, generic gradients, repeated cards, obvious icons, implausible testimonials, and microcopy without context.
3. **Hierarchy first.** Check spacing, alignment, typography scale, contrast, density, and interaction feedback before adding effects.
4. **Motion with a concept.** Subtle, purposeful micro-interactions. Respect `prefers-reduced-motion`. Never add effects that reduce legibility, conversion, performance, or accessibility.
5. **Real responsive.** Design and verify mobile, tablet, and desktop, not just breakpoints that do not overflow.
6. **Human tone.** Professional, specific copy. Never invent data, logos, testimonials, cases, or claims.

## Workflow

1. Read the project and business goal. State assumptions.
2. Audit: list issues by severity (Critical / Important / Optional) with concrete before/after substitutions.
3. Apply the smallest set of changes with the highest perceived impact. When asked for many effects or trends at once, propose a restrained, prioritized subset tied to the brand and product (what each effect is for) instead of adding everything.
4. Verify: build, and check the result at real viewport sizes when a browser is available.

## Safety limits

- Do not sacrifice clarity to sound original; do not confuse minimalism with lack of personality.
- Do not add heavy 3D, shaders, or video scrubbing without a performance budget (see `helen-a11y-perf`).
- Propose new libraries or techniques; apply them only within the requested scope.

## References

- `references/vocabulary.md`: motion, effects, and library vocabulary the HELEN prompts assume.
- For deeper flows, use the HELEN prompt library (`helen prompts list`), phase `03-finish-features`.

## Layout patterns

For portfolios and showcases see `references/layouts.md` (sandwich, showcase, sticky split).
