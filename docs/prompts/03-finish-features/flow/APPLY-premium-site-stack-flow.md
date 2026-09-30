---
action: APPLY
phase: 03-finish-features
summary: Flow: build or lift a premium website end to end: inspiration, design, copy, motion, components, quality, SEO and publishing.
modifies_code: true
repeatable: true
stage: polish
---

# Premium Site Stack Flow

## Goal

Build or raise a premium website following a complete working stack, from inspiration to a published site.

## Use when

- Starting the polish of a visual website and taking it all the way to production.

## Steps

1. [init-creative-direction-and-design-md](../../01-start-project/init/INIT-creative-direction-and-design-md.md): inspiration and `DESIGN.md`.
2. [generate-portfolio-layout-patterns](../visual/GENERATE-portfolio-layout-patterns.md) or [generate-conversion-led-hero-system](../visual/GENERATE-conversion-led-hero-system.md): layout.
3. [enhance-taste-and-art-direction](../visual/ENHANCE-taste-and-art-direction.md): visual point of view.
4. [audit-ai-trace-erasure-and-human-craft](../visual/AUDIT-ai-trace-erasure-and-human-craft.md).
5. [enhance-copy-and-conversion](../visual/ENHANCE-copy-and-conversion.md).
6. [enhance-motion-polish-and-transitions](../motion/ENHANCE-motion-polish-and-transitions.md) and [generate-scroll-driven-sequences](../motion/GENERATE-scroll-driven-sequences.md).
7. [generate-component-library-integration](../visual/GENERATE-component-library-integration.md).
8. [apply-basic-accessibility-pass](../performance/APPLY-basic-accessibility-pass.md) and [apply-basic-performance-pass](../performance/APPLY-basic-performance-pass.md), then [audit-visual-ux-regression-checkpoint](AUDIT-visual-ux-regression-checkpoint.md).
9. [audit-final-seo](../../04-before-production/compliance/AUDIT-final-seo.md).
10. [audit-release-readiness-checkpoint](../../06-release/flow/AUDIT-release-readiness-checkpoint.md), then [apply-deploy-github-and-hosting](../../06-release/deploy/APPLY-deploy-github-and-hosting.md).

Optional third-party tools (review each with [audit-third-party-tools-and-mcp](../../08-maintenance/ops/AUDIT-third-party-tools-and-mcp.md); use only one main design skill):

| Step | Tool | Command |
|---|---|---|
| Inspiration | awesome-design-md, google-design-md, godly | `helen skills external awesome-design-md` |
| Design | taste-skill, impeccable or ui-ux-pro-max | `helen skills external taste-skill` |
| Copy | humanizer, cro-optimization | `helen skills external humanizer` |
| Motion | scroll-craft, transitions-dev | `helen skills external scroll-craft` |
| Components | 21st.dev | `helen skills external 21st-dev` |
| Quality | web-design-guidelines | `helen skills external web-design-guidelines` |
| Visual check | playwright-cli or playwright-mcp | `helen skills external playwright-cli` |
| SEO | seo (ECC) | `helen skills external seo` |

## Stop when

- Performance leaves the agreed budget, a step would require inventing content, testimonials or metrics, or the client's real material (images, text, permissions) is missing.

## Limits

- The site must build and pass tests after each step; no third-party skill installed without review.

## Output

1. Steps done and skipped, with reasons.
2. External tools used and their versions.
3. ```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
