---
action: AUDIT
phase: 05-final-audit
summary: Forensic audit for AI aesthetic slop and robotic copy: detects generic template clichés and specifies bespoke art direction and human personality refactors.
modifies_code: false
aliases:
  - audit-anti-slop
  - audit-bespoke-aesthetic
---

# Anti-AI Slop and Bespoke Personality Audit

## Goal

Forensically audit the user interface, typography, layout, and copy to detect generic AI tropes, eliminate robotic sludge, and formulate a bespoke art direction infused with authentic human craft.

## Use when

- The web interface or app looks generic, templated, or immediately identifiable as an AI-generated product.
- You need to distinguish the product from hundreds of interchangeable competitor pages using identical Tailwind gradients and Bento grids.
- The marketing copy reads like synthesized corporate filler without distinct brand voice or point of view.

## Requirements

Inspect all user-facing screens, components, styles, and copy for unmistakable AI tells:

1. **Visual and Layout Slop Detection:**
   - Purple, indigo, and cyan neon glow effects behind cards or headers.
   - Symmetrical 3-card Bento grids with uniform padding, rounded-2xl radii, and colored icon badge squares.
   - Gratuitous canvas particle animations or decorative 3D noise unrelated to the product's actual function.
   - Glassmorphism stacked everywhere (`backdrop-blur bg-white/5 border border-white/10`) without purposeful visual hierarchy.
   - Homogeneous sans-serif typography (Inter/Geist everywhere with identical weight and tracking).

2. **Copywriting and Voice Slop Detection:**
   - Overused AI vocabulary: "Unleash", "Elevate", "Seamless", "Delve", "Supercharge", "Cutting-edge", "Next-generation", "Tapestry", "Game-changer".
   - Mechanical tricolons ("Fast. Reliable. Secure.").
   - Vague value propositions that say nothing concrete about how the product actually works.
   - Synthetic, fabricated testimonials and customer claims.

3. **Bespoke Art Direction Prescription:**
   - Formulate a cohesive design language rooted in a distinct aesthetic tradition (e.g. Swiss typographic grid, warm editorial analog, tactile industrial utility, or radical minimalism).
   - Prescribe an opinionated typographical pairing with tension and personality.
   - Replace fuzzy radial glow with crisp physical borders, optical shadows, or bold architectural framing.
   - Break symmetric grids with purposeful asymmetrical rhythm and varied content density.

## Limits

- Audit only: do not rewrite production files without user approval.
- Ground every critique in specific files, CSS classes, component files, or copy strings.
- Prescribe actionable aesthetic alternatives rather than vague artistic suggestions.

## Output

1. **Evidence-backed design assessment**: Specific repeated patterns, their effect on the intended audience, and uncertainty; do not invent an objective numerical score.
2. **Catalog of AI Tells**: Exhaustive list of detected visual and verbal tropes with exact file and line references.
3. **Bespoke Art Direction Blueprint**: Palette, typography pairings, border styles, and spacing philosophy.
4. **Before and After Component Refactors**: Concrete diffs demonstrating how to transform generic cards and copy into distinctive, human-crafted components.
