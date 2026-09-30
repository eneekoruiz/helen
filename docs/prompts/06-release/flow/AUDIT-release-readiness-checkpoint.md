---
action: AUDIT
phase: 06-release
summary: Final release gate: verification, honest docs and claims, no secrets, resolved or accepted findings. PASS, PASS WITH CAVEATS or FAIL.
modifies_code: false
aliases:
  - plan-release-checklist
---

# Release Readiness Checkpoint

## Goal

Decide, as the accountable release owner, whether the project can honestly be marked finished, released, delivered or presented right now.

## Use when

- Right before tagging a release, delivering, publishing or archiving.

## Requirements

Confirm every applicable item, then apply senior judgment beyond the list:

1. Works from a reasonably clean setup, not only on the original machine; build, lint, types and tests pass (`helen check`).
2. The main user flow was exercised manually after the last meaningful change.
3. README and docs match real commands, setup and limits; `.env.example` exists when configuration is required.
4. Screenshots real and current; social preview, About box, description and topics accurate when the project is public; page-level Open Graph on live sites.
5. No secrets, tokens, private URLs, machine-specific paths, generated junk or personal artifacts committed.
6. No feature, performance, security, accessibility, scale, SEO or production-ready claim that cannot be demonstrated; demo-only behavior and mocks labeled.
7. Earlier audit findings resolved or accepted with explicit rationale; required owner decisions taken.
8. Release or handoff notes exist when needed.

**Blocks release:** any core verification fails; misleading README or setup; public presentation that overstates the product; an unresolved critical issue; a missing owner decision. You may also block for an unlisted reason that materially affects quality, trust, security or presentation.

## Limits

- Audit only. Recovery: return to the step that introduced the gap, fix it, rerun the required checkpoints, then retry.

## Output

1. Verdict first: `PASS`, `PASS WITH CAVEATS` or `FAIL`.
2. Unresolved blockers as **Critical**, **Important**, **Optional**, and accepted caveats.
3. The smallest next action, and whether you would personally sign off today.
