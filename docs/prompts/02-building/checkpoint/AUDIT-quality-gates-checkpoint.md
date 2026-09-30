---
action: AUDIT
phase: 02-building
summary: Blocking gate: build, typecheck, lint and tests must pass (run `helen check`) before a flow continues.
modifies_code: false
aliases:
  - audit-build-and-compile-checkpoint
  - audit-lint-and-typecheck-checkpoint
  - audit-test-suite-checkpoint
  - audit-fast-build-test-verification
---

# Quality Gates Checkpoint

## Goal

Confirm the project builds and its static checks and tests pass before deeper work, polishing or release continues.

## Use when

- At the start and end of any flow, after significant code changes, and before a release candidate.

## Requirements

1. Run the project's real commands. With HELEN: `helen check` (runs `typecheck`, `lint`, `test` and `build` scripts that exist). Otherwise the equivalents, e.g. `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`; add `format:check` in release-bound flows.
2. If a command does not exist, say so and state whether its absence is acceptable for this flow; for risky flows without tests, list the manual verification needed.
3. **Blocks progress:** build or type generation fails; typecheck fails; lint fails in touched code; existing tests fail; a check claimed in docs does not exist; the build only works on one machine or needs undocumented environment.
4. **Warning only:** warnings that do not affect output, lint warnings outside touched files (documented), low-risk missing tests outside a release flow, slow tests when a documented smoke path exists.

## Limits

- Never edit or delete tests, or weaken lint rules, just to pass the gate.
- Fix the smallest credible cause first; avoid broad style churn unless the flow is a cleanup.

## Output

1. Checks available and checks run, each `PASS` or `FAIL`.
2. Blockers and warnings with the failing output.
3. Verdict: `GATE PASSED` or `GATE BLOCKED`, and the next action.
