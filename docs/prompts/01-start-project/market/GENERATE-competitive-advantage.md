---
action: GENERATE
phase: 01-start-project
summary: Build the highest-impact features found in the competitive benchmark, improved rather than copied, in the current stack.
modifies_code: true
aliases:
  - generate-competitive-cloning
---

# Competitive Advantage Build

## Goal

Turn a validated competitive gap into working product: implement the features with the clearest impact on conversion or trust, doing them better than the competitor.

## Use when

- After `research-competitive-benchmark`, with an existing project and a validated opportunity.

## Requirements

1. Read the project structure and conventions before editing.
2. Implement only features with clear conversion or trust impact; reduce scope of the rest or turn them into small experiments.
3. Improve on the competitor's pattern: fewer steps, better copy, better responsive behavior, better accessibility.
4. Integrate with existing components, styles and conventions.
5. Include loading, error, empty and success states when the feature needs them.
6. Run build, lint and relevant tests when available.

## Beyond the checklist

Parity is not advantage. Prefer one feature done clearly better over three copied ones.

## Limits

- Never copy brands, proprietary text, protected assets or identical structures.
- Do not break routes, tracking, forms or CMS.
- No heavy libraries without justifying their cost.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
