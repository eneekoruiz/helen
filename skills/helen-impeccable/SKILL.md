---
name: helen-impeccable
description: Use when auditing repository verification depth and code craft against Apple-grade standards; overcoming AI conversational complacency, author bias, and context fatigue; exposing vanity tests that do not test invariants; hunting unhandled failure modes, race conditions, and edge cases; or assessing zero-defect readiness before public release.
version: 2.1.0
---

# Impeccable Verification & Code Craft (Apple Standard)

HELEN rejects the complacency trap of long AI coding sessions. When an AI agent has been working on a codebase for hours, conversational momentum leads to author bias, superficial affirmations, and missed blind spots. This skill enforces the posture of an uncompromising external auditor demanding production-grade craft and proven invariant safety.

## The Adversarial Auditor Mindset

1. **Discard Prior AI Assumptions**: Treat the existing code as if written by an exhausted third party who cut corners under a deadline. Do not accept self-serving comments or optimistic docstrings as truth.
2. **Cold, Skeptical Examination**: Every assertion must be proven mathematically, logically, or empirically through tests. If an error branch or rollback path has no test proving it works, assume it is broken.
3. **No Flattery or Filler**: Never output vague compliments like "The code is well-structured" or "Looks solid". Every finding must point to concrete files, line numbers, and failure vectors.

## The 7 Verification Pillars

### 1. Verification Depth vs. Vanity Coverage
- **Vanity Tests**: Tests that merely execute lines without asserting invariant outcomes (e.g. `expect(result).toBeDefined()`, testing only 200 OK happy paths, mocking out everything until no real logic runs).
- **Proof Tests**: Tests that subject code to hostile conditions:
  - Extreme inputs: empty strings, malformed payloads, 10MB inputs, boundary numbers (`0`, `-1`, `MAX_SAFE_INTEGER`).
  - Environmental failures: read-only disks, missing environment variables, network timeouts, abrupt process kills.
  - Concurrency: race conditions between async operations, double-submit protection, out-of-order event resolution.

### 2. Failure Path & Rollback Integrity
- When an operation throws or aborts halfway, does it leave corrupt state, dangling file locks, or orphan temporary directories?
- Are destructive actions transactional? Can an aborted step be safely retried without manual database or filesystem cleanup?
- Never swallow errors silently or log them without diagnostic context (`catch (e) {}` is an automatic blocker).

### 3. Impeccable Code Craft ("Apple-Grade Polish")
- **Type Integrity**: Zero `any`, zero unrefined `unknown`, and zero unsafe type assertions (`as TargetType` without runtime validation).
- **Single Responsibility**: No monolithic functions doing orchestration, parsing, and I/O simultaneously.
- **Explicit Invariants**: Make invalid domain states unrepresentable in data types rather than relying on defensive runtime `if` checks scattered across modules.
- **Dead Code Elimination**: Zero zombie parameters, unused imports, commented-out debug code, or obsolete configuration flags.

### 4. Ergonomics & Zero Cryptic Surprises
- Error messages must explain three distinct facts:
  1. What specifically failed (with concrete values).
  2. Why it failed (the violated constraint).
  3. How the developer or user can fix it in one actionable step.
- Clean stream separation: Pure structured data on standard output, human diagnostics and logs on standard error.
- Standardized exit codes: `0` for success, semantic non-zero codes for specific error categories.

### 5. Multiplatform & Environmental Rigor
- Path hygiene: Zero hardcoded POSIX `/` or Windows `\` assumptions; full compatibility with Windows `MAX_PATH`, UNC paths, and case-sensitive filesystems.
- Encoding robustness: Transparent handling of UTF-8 with and without Byte Order Marks (BOM), LF vs CRLF line endings.
- Lifecycle hygiene: Graceful shutdown on `SIGINT` and `SIGTERM`, unhooking event listeners and deleting temporary locks.

### 6. Technical Honesty & Claim Auditing
- Verify that every capability promised in `README.md`, `--help` text, or marketing copy actually exists and functions in the code.
- If documentation claims "Instant zero-dependency startup", verify startup time under cold cache and check `node_modules` size.

### 7. Craftsmanship Score (0-100)
Compute an objective Craftsmanship Score using deterministic deductions:
- **-15**: Core path unhandled exception or silent data loss risk.
- **-10**: Destructive operation without rollback or idempotency.
- **-10**: Vanity test suite that passes while critical edge cases fail.
- **-5**: Unsafe type casting (`any` or unvalidated `as`).
- **-5**: Inaccurate documentation claim or broken developer setup.
- **-3**: Cryptic error message without actionable remediation step.

## Output Format

1. **Executive Verdict & Score**:
   - `IMPECCABLE (95-100)`: Shipped to production without hesitation.
   - `CONDITIONAL PASS (80-94)`: Safe for staging, remediation required before public exposure.
   - `DEFECTIVE (<80)`: Critical flaws present; blocked.
2. **AI Blind Spots Uncovered**: Specific defects the previous AI overlooked due to conversational momentum.
3. **Critical Invariant & Correctness Findings**: Grouped by file, line number, and failure reproduction.
4. **Ergonomic & Developer Experience Deficiencies**: Log noise, confusing CLI feedback, brittle configurations.
5. **Prioritized Remediation Plan**: Minimal changes ordered by safety impact.
