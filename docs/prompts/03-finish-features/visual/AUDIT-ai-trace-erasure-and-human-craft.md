---
action: AUDIT
phase: 03-finish-features
summary: Detect AI and template traces in copy, visuals, layout, icons and motion, and propose specific human replacements.
modifies_code: false
---

# AI Trace Erasure and Human Craft Audit

## Goal

Find every sign that the site was produced by a template or a generic AI, and replace it with something only this client could have. Anything interchangeable is suspect.

## Use when

- Before client delivery or publishing a portfolio or premium landing; when the result works but has no soul or specificity.

## Requirements

1. **Copy traces:** empty claims, inflated phrases, staged run-ups, forced triples, generic enthusiasm, implausible testimonials, microcopy without context.
2. **Visual traces:** excessive symmetry, generic gradients, repeated cards, obvious icons, default radii and shadows, stock-looking imagery, motion without concept.
3. **Missing authorship:** no point of view, no industry detail, no concrete proof, no uncomfortable decisions.
4. **Replacements:** specific copy, visuals with a real source, less generic layout, verifiable proof, motion with a concept. Helpers: `helen skills external humanizer`, `helen skills external taste-skill`.

## Limits

- Audit only: do not modify files.
- Never suggest inventing data, logos, testimonials or cases; do not trade clarity for originality; minimalism is not lack of personality.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Highest-impact replacements as before / after pairs.
3. Credibility risks and the next prompt to run.
