---
name: helen-debug
description: Find and fix the root cause of a bug, failing test, crash, flaky behavior or regression with evidence - reproduce first, narrow it down, prove the cause, fix it minimally and lock it with a regression test. Use when something "does not work", a test or CI fails, an error or stack trace appears, behavior changed between versions, or an earlier fix did not hold.
metadata:
  version: 2.1.0
---

# HELEN Debug

Debugging is finding out, not trying things. Every step produces evidence the next step relies on, and the fix is done when a test proves it.

## When to use it

- A failing test, a red CI job, an exception or stack trace, wrong output, a crash.
- "It worked last week": a regression between two versions or commits.
- Flaky or intermittent behavior, things that only fail in CI, in production or on one machine.
- A fix that did not hold.

Not for building features, reviewing a design or tidying code that works; use `helen-implementa` or `helen-audit` for those.

## Method

1. **Reproduce.** Get the exact command, input, environment and versions, and run it until you see the failure yourself. Save the failing output. If it does not reproduce, collect what differs (environment variables, time zone, locale, data, versions, concurrency) instead of guessing.
2. **Narrow it down.** Make the smallest input or test that still fails. For a regression, `git bisect start <bad> <good>` and `git bisect run <script that exits non-zero on the bug>`; confirm the culprit by reverting it locally.
3. **One hypothesis at a time.** State it, predict what you would observe if it were true, and check with a probe (an assertion, a log line, a debugger, a query). Do not change code to see whether a symptom goes away.
4. **Root cause.** Explain the whole chain from cause to symptom. Then look for siblings: the same mistake elsewhere (`grep` for the pattern).
5. **Fix at the cause.** The smallest change that removes the cause. No swallowed errors, no retries or sleeps that hide a race, no optional chaining sprinkled over a missing value, no skipped or loosened tests.
6. **Lock it.** A regression test that fails before the fix and passes after; run it both ways and keep the output.
7. **Verify.** The relevant suite, typecheck and lint (`helen check` runs the project's own scripts). For flaky behavior, run the test many times (for example twenty) and under the conditions that broke it.

## Usual suspects

- Time: time zones (run with `TZ=UTC` and another zone), daylight saving changes, month ends, clocks in tests.
- Order and state: tests that depend on run order or shared state, caches, global mocks.
- Concurrency: two requests at once, missing idempotency, check-then-act races, unawaited promises.
- Environment: locale and number formats, file path separators and case on Windows or macOS, line endings, missing variables.
- Data: empty, null and very large inputs, Unicode, the first run with no data.

## Production incidents

Mitigate first when users are affected (roll back or switch off the feature) with the owner's authorization; then find the root cause on a reproduction, not on production.

## With HELEN

- `helen loop start code --subject "fix: <bug>"` keeps the fix honest: score it with evidence and let another agent confirm it.
- In a team plan, write the reproduction and the root cause to the item's result so the next agent does not start over.

## Acceptance

Done means: the failure was reproduced (or the evidence for why it could not be is reported), the root cause is explained, the fix is at the cause, a regression test fails before and passes after, and the relevant checks pass. Report symptom, reproduction, cause, fix, test, verification output and residual risk.

## Execution contract

Define observable acceptance for each item before delegating, and preserve the user's intent and authorization. Choose the cheapest available capable model for each worker; delegate to specialists only when expertise or smaller contexts outweigh context transfer, coordination, integration, verification and retries. Use one agent for small cohesive tasks. After the checks pass, discover further evidence-backed improvements within scope before reporting. Never invent savings or claim perfection.
