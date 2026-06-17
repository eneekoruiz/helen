# Test Suite Checkpoint

## Purpose

Confirm the relevant test suite passes before advancing.

## Command

Use the repo's real test command. Common candidates:

- `npm test`
- `npm run test`

## Manual Review

If there are no tests, identify the risky flows that need manual verification.

## Blocks Progress

- Existing tests fail.
- Test command is broken or misleading.
- Critical flow has no automated or manual verification path in a release-bound flow.

## Warning Only

- Low-risk missing tests in a non-release polish flow.
- Slow tests if there is a documented smaller smoke path.

## Recovery

Fix failing behavior or outdated tests. Do not delete tests just to pass the checkpoint.
