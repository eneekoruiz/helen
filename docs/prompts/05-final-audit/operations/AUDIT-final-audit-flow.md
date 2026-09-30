---
action: AUDIT
phase: 05-final-audit
summary: Flow: the final audit sequence with gates: blind spots, technical truth, honest repository, public exposure decision, release gate.
modifies_code: false
repeatable: false
stage: final
aliases:
  - generate-runbook
---

# Final Audit Flow

## Goal

Run the closing technical audits in the right order, with explicit gates, so the final audit does not only validate what you already knew how to look at.

## Use when

- Before freezing code for release, handoff or public exposure of an important project.

## Steps

1. **Blind spots:** [audit-project-risk-and-architecture](../../01-start-project/audit/AUDIT-project-risk-and-architecture.md) (deep), [audit-product-ux](../../03-finish-features/ux/AUDIT-product-ux.md), and [plan-quality-operating-system](../../08-maintenance/meta/PLAN-quality-operating-system.md) for methodology gaps.
2. **Technical truth:** [audit-code-quality](../code/AUDIT-code-quality.md) and [audit-i18n](../code/AUDIT-i18n.md) if multilingual. Gate: a `FAIL` stops the flow.
3. **Honest repository:** [audit-documentation](AUDIT-documentation.md).
4. **Public exposure:** [audit-public-presentation](../presentation/AUDIT-public-presentation.md).
5. **Release gate:** [audit-release-readiness-checkpoint](../../06-release/flow/AUDIT-release-readiness-checkpoint.md).

## Stop when

- Code quality fails: the project is not technically fit to close.
- Documentation fails: the project is not reproducible.
- Public presentation fails: it can be used privately but must not be shared.

## Limits

- This phase does not rewrite logic: it produces findings and separate tasks.

## Output

Verdict of each step, blockers, accepted risks, and the go / no-go decision for release.
