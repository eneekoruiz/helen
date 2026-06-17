# Release Readiness Checkpoint

## Purpose

Decide whether the project can move from polish/hardening into release or delivery.

## Required Evidence

- Build passes.
- Tests or smoke checks pass.
- Lint/typecheck pass if available.
- README and docs match reality.
- No known secrets or private artifacts.
- Release notes or handoff notes exist when needed.
- Public claims are demonstrable.

## Blocks Progress

- Any core verification fails.
- README/setup is misleading.
- Public presentation overstates the product.
- Known critical issue is unresolved.
- Required owner decision is missing.

## Warning Only

- Minor polish issue with explicit caveat.
- Non-critical docs improvement already tracked.

## Recovery

Return to the flow step that introduced the gap, fix it, rerun required checkpoints, then reattempt release.
