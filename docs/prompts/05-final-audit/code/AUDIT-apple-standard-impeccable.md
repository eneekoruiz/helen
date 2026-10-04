---
action: AUDIT
phase: 05-final-audit
summary: Evidence-backed audit of invariants, failure recovery, API ergonomics, test depth and additional improvement opportunities.
modifies_code: false
aliases:
  - audit-apple-standard
  - audit-impeccable-code-craft
---

# Invariant and Verification Audit

## Goal

Find reproducible correctness, recovery, verification and ergonomics gaps with fresh eyes. Follow [RULES.md](../../RULES.md); prior praise and passing tests are not proof of correctness.

## Use when

- After extended agent work, before release, or when changing reviewers.
- When failure paths, invariants and documentation claims need independent evidence.

## Requirements

1. Define acceptance and scope from existing context before inspection: compatibility, affected workflows, required checks and unknowns.
2. Inspect tests for asserted outcomes, not mere execution. Investigate empty/huge inputs, timeouts, duplicate actions, concurrency and abrupt interruption.
3. Trace partial writes, transaction rollback, file locks and temporary cleanup. Reproduce actionable defects when possible.
4. Inspect validation at network/storage boundaries, unsafe casts, responsibility boundaries and confirmed dead code. Preserve public contracts.
5. Check machine-output streams, error recovery commands, encoding and supported OS behavior. Do not infer platform failures solely from slash syntax.
6. Compare README, CLI help and claims with actual behavior.
7. Inspect CI and run locally reproducible commands. Record passed, failed, unavailable and not applicable checks; local execution does not prove a hosted OS matrix.
8. Use independent QA/recovery, contracts and claims specialists only when their expected benefit justifies overhead; otherwise perform focused primary-agent passes. Follow cost-aware model routing from shared rules.
9. After initial inspection, independently discover further evidence-backed improvements in adjacent workflows, error paths and verification. Repeat investigation without an arbitrary retry cap; apply fixes only when remediation is authorized, then verify and re-audit.

## Limits

- Read-only unless the user has authorized remediation; never scaffold tests or change files merely to perform an audit.
- Ground findings in available files, observable behavior or explicitly labeled hypotheses. Do not fabricate line numbers or completed checks.
- Respect original exclusions; report external blockers and outside-scope proposals.
- No perfection score, guaranteed zero defects or cosmetic refactoring without benefit.

## Output

Prioritized findings with file, evidence, impact, proposed fix, effort and verification. Include acceptance status, additional opportunities discovered, actual CI-command results, applied fixes when authorized, blockers and residual risks.