---
action: APPLY
phase: 06-release
summary: Flow: verify and package a release candidate with evidence. Verdict: RC READY, RC WITH CAVEATS or NOT RC READY.
modifies_code: true
repeatable: false
stage: final
---

# Release Candidate Flow

## Goal

Decide whether the project can become a release candidate and package it with reproducible verification.

## Use when

- Stabilization is finished and a release is planned.

## Steps

1. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).
2. [apply-security-hardening-flow](../../02-building/security/APPLY-security-hardening-flow.md), then [audit-security-risk-checkpoint](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md).
3. [audit-i18n](../../05-final-audit/code/AUDIT-i18n.md) if multilingual, and [audit-final-seo](../../04-before-production/compliance/AUDIT-final-seo.md) for public web projects.
4. [audit-public-presentation](../../05-final-audit/presentation/AUDIT-public-presentation.md).
5. [generate-release-notes-changelog-and-demo-package](../notes/GENERATE-release-notes-changelog-and-demo-package.md).
6. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md) and [audit-release-readiness-checkpoint](AUDIT-release-readiness-checkpoint.md).

## Stop when

- Any checkpoint or critical test fails, or indexability directives or language fallbacks are broken.

## Limits

- Never hide or cosmetically fix a type, build or security error to reach RC.

## Output

1. Verdict: `RC READY`, `RC WITH CAVEATS` or `NOT RC READY`.
2. Checks run and changes made during the flow.
3. Remaining blockers.
4. Draft release notes or what is still pending.
