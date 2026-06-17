# MASTER Prompt Orchestration Guide

This file explains how an editor-integrated AI agent must use this prompt system.

Use this first when the user says something like:

> Lee `docs/prompts/flows/full-polish.md` y ejecuta el flujo paso a paso.

## Core Rule

Do not run prompts blindly.

Run guided automation with judgment: inspect, execute, validate, fix, summarize, and only then continue.

## Operating Protocol

1. Read the requested flow file completely.
2. Read every atomic step prompt referenced by the flow before executing the first step.
3. Read every checkpoint referenced by the flow before reaching that checkpoint.
4. Execute one step at a time.
5. After each step, produce a short phase summary for yourself and preserve the important findings.
6. Run the required checkpoint before moving to the next phase.
7. If a blocking checkpoint fails, stop, fix the issue if it is in scope, and repeat the checkpoint.
8. If the fix is high risk, broad, destructive, or changes product behavior, ask for confirmation before applying it.
9. Do not rewrite large parts of the project unless the current design is itself the problem.
10. Preserve existing behavior unless the flow explicitly asks to change it.
11. Do not add dependencies unless the benefit is clear and the repository has no simpler existing option.
12. Avoid repeating expensive audits if a recent step already produced sufficient evidence.
13. Keep traceability: record what was checked, changed, skipped, failed, and deferred.
14. At the end, provide a final summary with completed steps, failed checks, changes made, remaining risks, and recommended next flow.

## Safety Rules

- Never run destructive commands without explicit user approval.
- Never delete user work to make a check pass.
- Never hide a failing build, test, lint, typecheck, or security issue.
- Never polish public presentation while core behavior is broken.
- Never claim production readiness without evidence.
- Never continue a release flow if compilation or core tests fail.
- Never treat screenshots, docs, README, metadata, or release notes as true unless verified against the repo.

## Step Contract

Every atomic step should be treated as an independent reusable prompt with:

- objective;
- when to use it;
- when not to use it;
- minimum criteria;
- `Más allá de estos criterios`;
- safety limits;
- final checks;
- delivery format.

## Checkpoint Contract

Every checkpoint must say:

- what command to run if available;
- what to inspect manually if no command exists;
- what blocks progress;
- what can remain as warning;
- how to recover.

## Continue / Stop Logic

Continue when:

- the step objective is complete;
- blocking findings are fixed or explicitly accepted;
- required checkpoint passes;
- remaining risks are documented.

Stop when:

- build/typecheck/test/lint fails in a release or hardening flow;
- a change would be destructive or high risk;
- a finding requires product/owner decision;
- there is not enough repo evidence to continue honestly;
- the next step would waste tokens before a more basic failure is fixed.

## Final Delivery Format

At the end of a flow, report:

1. Flow executed.
2. Steps completed.
3. Checkpoints passed.
4. Changes made.
5. Blockers fixed.
6. Warnings accepted.
7. Deferred work.
8. Remaining risks.
9. Recommended next flow.
