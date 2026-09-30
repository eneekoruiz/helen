---
action: GENERATE
phase: 03-finish-features
summary: Landing variants that adapt copy, proof and CTAs to segment, traffic source or industry, with a solid default and no flicker.
modifies_code: true
aliases:
  - generate-ai-personalized-landing-flow
---

# Personalized Landing

## Goal

Make visitors feel the page understands their specific situation better than a template, by adapting copy, examples, proof, CTAs or paths per segment, responsibly.

## Use when

- Multi-segment campaigns, account-based marketing, B2B SaaS, high-ticket services or portfolios with distinct audiences.
- One message dilutes conversion and there is a real signal: UTM or source, industry, or an explicit visitor choice.

## Requirements

1. Define segments by source, industry, maturity, objection and expected CTA.
2. Decide what changes, what stays stable, the default fallback and the measurement event for each variant.
3. Implement without unnecessary personal data, without visual flicker (resolve on the server or before paint), with variants editable through CMS or config.
4. Copy stays human and verifiable in every variant.

## Limits

- No personal data without consent; no claims outside approved content; no variants nobody can maintain.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also list segments, rules and measurement events.
