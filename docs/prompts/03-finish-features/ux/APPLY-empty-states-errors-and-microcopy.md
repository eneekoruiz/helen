---
action: APPLY
phase: 03-finish-features
summary: Add or fix loading, empty, error, success, disabled and destructive states, with messages that say what happened and what to do next.
modifies_code: true
---

# Empty States, Errors and Microcopy Pass

## Goal

Make the product feel finished beyond the happy path: every state explains what happened and what to do next, clearly and accessibly.

## Use when

- During UX and UI polish, when the product only works well on the happy path.

## Requirements

1. **Find or add states:** long loads (skeletons that match the final layout), empty data with a contextual first-action CTA, network failures, permission denials, disabled controls and destructive confirmations.
2. **Forms:** what happens if the network fails on submit; real-time, specific field errors instead of generic alerts.
3. **Copy:** precise, friendly, solution-focused; no jargon, no blaming the user, no vague "An error occurred".
4. Every state has a recovery action or link.
5. Error messages never expose secrets, credentials or stack traces.

## Limits

- Do not change business logic to create states; keep i18n and CMS structure intact.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
