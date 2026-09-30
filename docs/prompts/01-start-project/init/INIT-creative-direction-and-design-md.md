---
action: INIT
phase: 01-start-project
summary: Collect real inspiration and set the art direction in a validated DESIGN.md that any agent can read, so the UI is coherent from the first line.
modifies_code: true
aliases:
  - init-design-md-and-inspiration
  - init-director-creativo-orquestador-40k
  - director-creativo-40k
  - creative-director-orquestador-40k
---

# Creative Direction and DESIGN.md

## Goal

Act as creative director before code exists: gather real references, decide an art direction with a point of view, and capture it as a `DESIGN.md` (tokens plus reasoning) that coding agents follow.

## Use when

- Starting a visual project (landing, product, portfolio) or redesigning one without a documented design system.
- The business brief exists (`init-business-core`) and the look is still undecided.

## Skip when

- The client provides a closed design system: use it as is.

## Requirements

1. **Intake:** confirm niche and positioning, the site's purpose (conversion landing, portfolio, SaaS, immersive experience) and whether it is new or a redesign. Stop and ask if these are unknown.
2. **Inspiration:** 5-8 real references (Dribbble, Awwwards, Behance, Pinterest, Godly or others) with URL and what you take from each (structure, typography, rhythm, motion). Never invent references.
3. **Art direction:** palette with semantic contrast (CSS variables; avoid pure `#000`/`#fff`), a font pairing with personality for headings and a legible body face, spacing scale, radii, shadows and a motion tone (easing curves, stagger, pacing).
4. **DESIGN.md** in the project root: YAML tokens plus a rationale explaining why each decision serves the business and audience. Mark what is your own decision and what comes from references.
5. **Validation:** when Node is available run `npx @google/design.md lint DESIGN.md` and fix errors (broken token references, contrast, section order).
6. Three non-negotiable design principles and three things the brand will never do.

## Beyond the checklist

`helen skills external awesome-design-md` shows how well-known brands structure a DESIGN.md. Use it to learn the format, not to copy an identity.

## Limits

- Never clone another brand's identity for a client: take principles, not logos, exact palettes or compositions.
- Respect font and asset licenses. Do not invent business data.
- If the stack cannot support a requested effect (WebGPU, heavy 3D), say so before writing configuration.

## Checks

- References listed with URL and reason.
- `DESIGN.md` exists and passes the linter (or the reason it could not run).
- Principles and anti-principles written.

## Output

References, path to `DESIGN.md`, lint result, and the recommended next step (`helen apply design`, or `generate-portfolio-layout-patterns` for portfolios).
