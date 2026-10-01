---
name: helen-audit
description: Master skill for auditing code quality, finding improvements, standardizing Apple-grade tests, checking edge cases, performing code reviews, and identifying technical debt in a zero-interruption autonomous convergence loop.
version: 2.1.0
---

# The HELEN Audit (Autonomous Quality & Convergence Engine)

HELEN rejects the complacency trap of long AI coding sessions. When an AI agent has been working on a codebase for hours, conversational momentum leads to author bias, superficial affirmations, and missed blind spots. `helen-audit` acts as an uncompromising external auditor and autonomous remediation engine.

## Operating Principles

### 1. Interactive Scoping Questionnaire (Scope Clarification)
Before launching into broad audits or sweeping remediations, clarify key user trade-offs using targeted questions or interactive questionnaires:
- **Clean Code & Refactor Scope**: *"Do you want Clean Code & architectural refactoring in this pass, or should we strictly isolate changes to functional bug fixes, security, aesthetics, and performance without touching working legacy structure?"*
- **Target Dimensions**: Identify which of the 6 dimensions are critical for this run (e.g., security-first vs. aesthetics-first vs. comprehensive 6-dimension sweep).
- **Tolerance for Breaking Changes**: Zero (strict backward compatibility) vs. allowed with migration.

Once the user confirms scope (or if invoked with explicit scope flags / automated pipelines), **lock the scope in and proceed immediately into the Autonomous Convergence Loop**.

### 2. The Autonomous Convergence Loop (Zero Interruption)
Never stop at just reporting defects or asking for permission between fix cycles. You MUST execute an unbroken autonomous convergence loop:
**Audit → Fix → Verify (Typecheck, Lint, Test, CI) → Re-audit → Repeat**
Continue iterating autonomously until the Craftsmanship Score reaches **100/100 (IMPECCABLE)** and zero defects remain within the agreed scope. Only report back when the codebase is a pristine 10/10.

### 3. Mandatory CI Pipeline Emulation (Non-Negotiable Impeccable Gate)
**NEVER grant an "IMPECCABLE (10/10)" verdict without verifying the repository's Continuous Integration (CI) pipeline.**
- Inspect `.github/workflows/` (or equivalent CI configuration files like GitLab CI, GitHub Actions, Bitbucket Pipelines).
- Extract the exact commands executed by the remote CI runner (e.g., `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `node dist/cli.js lint`, `npm audit --audit-level=high`).
- Execute each of these commands locally.
- **Hard Gate**: If ANY step in the CI pipeline fails, the score is strictly capped below 80 (`DEFECTIVE`). A project cannot be declared impeccable if a git push would fail in GitHub Actions.

### 4. Specialized Subagent Orchestration
For deep or multi-domain repositories, decompose the audit by launching specialized subagents:
- **Research / Explorer Subagent**: Maps call graphs, dependencies, and external boundary contracts.
- **Security Auditor Subagent**: Deep dive into OWASP Top 10, secret leaks, injection risks, and dependency CVEs.
- **QA & Stress Subagent**: Adversarial testing, race conditions, edge-case generation, and test execution.
- **Visual & Anti-Slop Subagent**: Scans UI components, contrast, typography rhythm, and eliminates generic AI tropes.

### 5. Extreme Token Economy & English Prompt Efficiency
- Deliver high-density, zero-fluff responses with concise diffs and verification tables.
- Omit conversational filler, polite preambles, and speculative essays.
- For maximum token compression, internal prompts and technical reasoning are conducted in English, taking advantage of BPE tokenizer efficiency (saving 30% to 50% token overhead compared to non-English languages).

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
- **PR & Code Review**: When reviewing Pull Requests, ensure no secret leakage, no breaking regressions, and verify deterministic gates (`npm run typecheck` / `lint` / `test` / `ci`) pass.

## Output Format (When 100/100 Reached)

```text
# 🏆 HELEN Audit Final Report: 10/10 IMPECCABLE

- **Craftsmanship Score**: 100 / 100 (IMPECCABLE)
- **Autonomous Convergence Cycles**: [N] rounds completed
- **Scope**: [Locked scope based on initial questionnaire]
- **Defects / Technical Debt Remaining**: 0

### Summary of Autonomous Fixes Applied
- [List of all issues detected and fixed during the convergence loop]

### Deterministic Verification Gates
- ✅ Typecheck: 0 errors
- ✅ Lint: 0 warnings/errors
- ✅ Test Suite: 100% passing
- ✅ Continuous Integration (CI): 100% passing (all jobs from .github/workflows verified locally)
```