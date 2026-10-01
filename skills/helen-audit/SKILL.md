---
name: helen-audit
description: Master skill for auditing code quality, finding improvements, standardizing Apple-grade tests, checking edge cases, performing code reviews, and identifying technical debt in a zero-interruption autonomous convergence loop.
---

# The HELEN Audit (Autonomous Quality & Convergence Engine)

HELEN rejects the complacency trap of long AI coding sessions. When an AI agent has been working on a codebase for hours, conversational momentum leads to author bias, superficial affirmations, and missed blind spots. `helen-audit` acts as an uncompromising external auditor and autonomous remediation engine.

> **CRITICAL OPERATING RULE: THE AUTONOMOUS CONVERGENCE LOOP**
> Never stop at just reporting defects or asking for permission between fix cycles. When `helen-audit` is invoked (or combined with `/helen-implementa`), you MUST execute an **Autonomous Convergence Loop**:
> **Audit → Fix → Verify → Re-audit → Repeat** until the Craftsmanship Score reaches a **100/100 (IMPECCABLE)** and zero defects remain across all 6 dimensions. Only report back when the codebase is a pristine 10/10.

## The Adversarial Auditor Mindset

1. **Discard Prior AI Assumptions**: Treat the existing code as if written by an exhausted third party who cut corners under a deadline. Do not accept self-serving comments or optimistic docstrings as truth.
2. **Cold, Skeptical Examination**: Every assertion must be proven mathematically, logically, or empirically through tests. If an error branch or rollback path has no test proving it works, assume it is broken.
3. **Zero Dead Code & Clean Architecture**: Remove unused variables, imports, functions, classes, and files. Reduce complexity, duplication, and technical risk without changing behavior.
4. **No Half-Measures or Premature Halts**: Do not ask the user "Should I fix the rest?". Fix all Tier 1, Tier 2, and Tier 3 issues autonomously until there is nothing left to improve.

## The 6 Dimensions of Auditing

### 1. Functional & Product Capabilities
- **Workflow Incompleteness**: Identify dead-ends where users or developers have to perform manual steps (e.g., lack of export/import, missing batch actions, no undo/redo).
- **Graceful State Handling**: Ensure zero-states, loading states, empty searches, and error states provide helpful recommendations rather than empty screens.

### 2. Verification Depth & QA Scale
- **Proof vs. Vanity Tests**: Expose tests that merely execute lines without asserting invariant outcomes. Replace them with adversarial edge cases (empty strings, huge payloads, network timeouts, boundary numbers).
- **Adversarial QA**: Test or reason through malformed data, duplicate actions, slow network, cancelled actions, permission failures, partial failures, and repeated retries.
- **Race Conditions**: Check concurrency, double-submit protection, out-of-order event resolution, and state recovery.

### 3. Failure Path & Rollback Integrity
- When an operation throws or aborts halfway, does it leave corrupt state, dangling file locks, or orphan temporary directories?
- Are destructive actions transactional? Can an aborted step be safely retried without manual database cleanup?
- Never swallow errors silently or log them without diagnostic context (`catch (e) {}` is an automatic blocker).

### 4. Impeccable Code Craft ("Apple-Grade Polish")
- **Type Integrity**: Zero `any`, zero unrefined `unknown`, and zero unsafe type assertions (`as TargetType` without runtime validation).
- **Single Responsibility**: No monolithic functions doing orchestration, parsing, and I/O simultaneously.
- **Explicit Invariants**: Make invalid domain states unrepresentable in data types rather than relying on defensive runtime `if` checks.

### 5. Performance, Scale & Observability
- **Scale and Cost**: Identify bottlenecks (unbounded loops, synchronous work, N+1 patterns). Review caching, batching, pagination, and rate limits.
- **Observability**: Failures must be visible at the right level of detail. Remove noise, add missing context, and check for sensitive data leakage in logs (secrets, PII).
- **Multiplatform Parity**: Guarantee seamless operation across Windows, Linux, and macOS without path separator (`/` vs `\`) or line-ending (`\n` vs `\r\n`) glitches.

### 6. Developer Experience & Ergonomics
- **Actionable Diagnostics**: Error messages must state: what failed, why it failed, and the exact 1-step remediation command.
- **Technical Honesty**: Verify that every capability promised in `README.md` or marketing copy actually exists and functions in the code.
- **PR & Code Review**: When reviewing Pull Requests, ensure no secret leakage, no breaking regressions, and verify deterministic gates (`npm run typecheck` / `lint` / `test`) pass.

## The Convergence Execution Protocol

1. **Phase 1: Deep Audit**: Scan all 6 dimensions. Identify all defects (Tier 1, Tier 2, Tier 3).
2. **Phase 2: Autonomous Remediation**: Immediately implement fixes for every single finding. Do not stop to report or ask for confirmation.
3. **Phase 3: Deterministic Verification**: Execute `npm run typecheck`, `npm run lint`, and `npm test`. If any check fails, fix the failure immediately.
4. **Phase 4: Re-Audit**: Re-evaluate the entire codebase against the 6 dimensions.
   - If findings remain: Go to **Phase 2**.
   - If 0 findings remain and Craftsmanship Score = 100/100: Proceed to **Phase 5**.
5. **Phase 5: Final Pristine Report**: Output the final 10/10 report summarizing all autonomous iterations, fixes applied, and verification metrics.

## Final Output Format (When 100/100 Reached)

```text
# 🏆 HELEN Audit Final Report: 10/10 IMPECCABLE

- **Craftsmanship Score**: 100 / 100 (IMPECCABLE)
- **Autonomous Convergence Cycles**: [N] rounds completed
- **Defects / Technical Debt Remaining**: 0

### Summary of Autonomous Fixes Applied
- [List of all issues detected and fixed during the convergence loop]

### Deterministic Verification Gates
- ✅ Typecheck: 0 errors
- ✅ Lint: 0 warnings/errors
- ✅ Test Suite: 100% passing
```