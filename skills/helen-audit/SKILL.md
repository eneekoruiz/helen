---
name: helen-audit
description: Master skill for auditing code quality, finding improvements, standardizing Apple-grade tests, checking edge cases, performing code reviews, and identifying technical debt.
---

# The HELEN Audit (Impeccable Quality & Improvement Scanner)

HELEN rejects the complacency trap of long AI coding sessions. When an AI agent has been working on a codebase for hours, conversational momentum leads to author bias, superficial affirmations, and missed blind spots. `helen-audit` acts as an uncompromising external auditor demanding production-grade craft, proven invariant safety, and continuous improvement across all dimensions.

## The Adversarial Auditor Mindset

1. **Discard Prior AI Assumptions**: Treat the existing code as if written by an exhausted third party who cut corners under a deadline. Do not accept self-serving comments or optimistic docstrings as truth.
2. **Cold, Skeptical Examination**: Every assertion must be proven mathematically, logically, or empirically through tests. If an error branch or rollback path has no test proving it works, assume it is broken.
3. **Zero Dead Code & Clean Architecture**: Remove unused variables, imports, functions, classes, and files. Reduce complexity, duplication, and technical risk without changing behavior.
4. **No Flattery or Filler**: Never output vague compliments like "The code is well-structured." Every finding must point to concrete files, line numbers, and failure vectors.

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

## Output Format & Prioritization

Structure all proposed improvements and audit findings into clear, actionable tiers. Do not modify code in an audit run unless explicitly instructed; only provide the report.

1. **Executive Verdict & Score**:
   - `IMPECCABLE (95-100)`: Shipped to production without hesitation.
   - `CONDITIONAL PASS (80-94)`: Safe for staging, remediation required before public exposure.
   - `DEFECTIVE (<80)`: Critical flaws present; blocked.
2. **AI Blind Spots Uncovered**: Specific defects the previous AI overlooked.
3. **Prioritized Remediation Matrix**:
   - **Tier 1 (Critical/Blockers)**: Unhandled exceptions, data loss risks, security leaks, failing tests.
   - **Tier 2 (Strategic/Important)**: Architectural bottlenecks, missing adversarial tests, `any` typings.
   - **Tier 3 (Polish/Optional)**: Dead code elimination, DX improvements, UI ergonomics.
4. **Immediate Next Step**: The single most impactful improvement to implement first.