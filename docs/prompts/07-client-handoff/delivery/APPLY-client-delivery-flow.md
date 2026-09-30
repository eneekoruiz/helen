---
action: APPLY
phase: 07-client-handoff
summary: Flow: last-mile checks and the handoff package for a client or maintainer: content, links, forms, media, browser smoke test, access.
modifies_code: true
repeatable: false
stage: delivery
aliases:
  - apply-last-mile-client-site-delivery-flow
---

# Client Delivery Flow

## Goal

Run the last layer of review before a demo, publication or delivery, and prepare a clean handoff package so the client or next maintainer can operate without hidden knowledge or leaked private access.

## Use when

- The release is stable and a client, team or future maintainer is about to receive it.

## Steps

1. [audit-quality-gates-checkpoint](../../02-building/checkpoint/AUDIT-quality-gates-checkpoint.md).
2. [audit-content-copy-brand-and-claims](../marketing/AUDIT-content-copy-brand-and-claims.md); fix blocking copy with [enhance-copy-and-conversion](../../03-finish-features/visual/ENHANCE-copy-and-conversion.md).
3. If the client edits content: [apply-cms-editable-content-conversion-flow](../../02-building/cms/APPLY-cms-editable-content-conversion-flow.md).
4. [audit-links-forms-ctas-and-conversion-paths](../marketing/AUDIT-links-forms-ctas-and-conversion-paths.md): manual smoke test of forms and primary links.
5. [audit-media-assets-alt-text-and-performance](../verification/AUDIT-media-assets-alt-text-and-performance.md), [apply-responsive-pass](../../03-finish-features/visual/APPLY-responsive-pass.md) and [apply-basic-accessibility-pass](../../03-finish-features/performance/APPLY-basic-accessibility-pass.md), then [audit-visual-ux-regression-checkpoint](../../03-finish-features/flow/AUDIT-visual-ux-regression-checkpoint.md).
6. [audit-browser-smoke-test-and-demo-readiness](../verification/AUDIT-browser-smoke-test-and-demo-readiness.md).
7. [apply-security-hardening-flow](../../02-building/security/APPLY-security-hardening-flow.md) and [audit-security-risk-checkpoint](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md): no development access or credentials in the package.
8. [audit-client-handoff-and-support-readiness](AUDIT-client-handoff-and-support-readiness.md) and [generate-release-notes-changelog-and-demo-package](../../06-release/notes/GENERATE-release-notes-changelog-and-demo-package.md).
9. [audit-release-readiness-checkpoint](../../06-release/flow/AUDIT-release-readiness-checkpoint.md).

## Stop when

- A critical link or CTA leads to a 404 or a blank page.
- Fake text, lorem ipsum, placeholders or broken images are visible on conversion routes.
- Forms do not reach their real destination.

## Limits

- Setup and deploy must be reproducible on a clean machine; never hand over credentials in documents.

## Output

1. Delivery state: `READY`, `READY WITH CAVEATS` or `NOT READY`.
2. Changes made, routes and flows tested, status of links, forms, CTAs, assets and social preview.
3. Handoff package structure: access and IP transfer instructions (where credentials live, never the credentials), documented technical and support risks.
4. Remaining blockers, accepted warnings and a sign-off recommendation.
