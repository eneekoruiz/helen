---
name: helen-review
description: Use when reviewing a pull request, git diff, or staged changes against HELEN quality, security, and design standards before submitting or merging.
version: 2.1.0
---

# HELEN PR & Code Review

Review pull requests and git diffs against the HELEN engineering, security, and design standards.

## Review Gates

1. **No Secret Leakage**: Verify no `.env`, private keys, API tokens, passwords, or internal endpoints are included in the diff.
2. **Quality & Types**: Ensure strict TypeScript adherence with zero unchecked `any` casts and zero ignored lint errors.
3. **No Breaking Regressions**: Verify existing public APIs, interfaces, and test fixtures remain backwards-compatible.
4. **Clean Code Integrity**: Ensure dead code, redundant abstractions, and duplicated logic are removed.
5. **Deterministic Gates**: Confirm that `npm run typecheck`, `npm run lint`, and `npm test` execute with zero failures.

## Procedure

1. Read the diff with `git diff origin/main...HEAD` or `git status`.
2. Inspect changed files against the five review gates.
3. Report findings categorized by: Blocker (must fix), Warning (should fix), and Suggestion.
