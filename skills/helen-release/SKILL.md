---
name: helen-release
description: Use for any release question, decision or task: checking if code is ready to release, ship, tag or deploy (e.g. 'Can we tag vX today?', 'Release is today', flaky tests before shipping, CI failures before release), writing changelogs and release notes from commit lists, reviewing release blockers, or deciding release candidate (RC) readiness with an RC READY / NOT RC READY verdict.
---

# Release Candidate

Decide if the project can be packaged as a release candidate, with guarantees.

## Sequence

1. Load and pass the **build and compile** checkpoint.
2. Fast build/test verification, then the **test suite** checkpoint.
3. Security hardening, then the **security risk** checkpoint.
4. i18n audit and final SEO audit.
5. **Lint and typecheck** checkpoint before documenting.
6. GitHub repository audit; release notes, changelog, and demo package.
7. **Release readiness** checkpoint.

The detailed prompts live in the HELEN library: `helen prompts flow release-candidate` prints the full flow and links to each step.

## Conditions to advance

- Build, linter, and test suite pass with no exceptions.
- No open secrets or critical security gaps.
- Documentation and quickstarts match the real state of the software.

## Stop when

- Any checkpoint or critical verification fails. Never hide or cosmetically fix a type, build, or security error.
- Indexability directives or language fallbacks are broken.
- A destructive or high-risk change needs confirmation: ask the user first.

## Final summary

1. Verdict: `RC READY`, `RC WITH CAVEATS`, or `NOT RC READY`.
2. Checks executed.
3. Changes made during the flow.
4. Remaining blockers.
5. Draft release notes or pending items.
