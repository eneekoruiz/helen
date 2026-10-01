---
action: AUDIT
phase: 05-final-audit
summary: Apple-grade zero-defect audit: adversarial verification depth, fault tolerance, API ergonomics, clean craft and autonomous convergence loops.
modifies_code: false
aliases:
  - audit-apple-standard
  - audit-impeccable-code-craft
---

# Apple-Grade Impeccable Verification and Craft Audit

## Goal

Conduct an uncompromising, fresh-eyes audit of the repository to eliminate AI conversational complacency, uncover hidden failure modes, prove invariant depth, and elevate code craft to Apple-grade standards in an autonomous convergence loop.

## Use when

- The project has undergone long conversational sessions and the current AI may suffer from context blindness or author bias.
- You switch models (e.g. from Claude to ChatGPT or Gemini) and want an immediate, unforgiving technical inspection.
- The project is approaching release and requires zero-defect verification.

## Operating Protocol

### 1. Interactive Scoping Questionnaire
Before running deep inspection passes or applying fixes, clarify user constraints:
- **Clean Code & Refactor Scope**: *"Do you want Clean Code & architectural refactoring in this pass, or should we strictly isolate changes to functional bug fixes, security, aesthetics, and performance without touching working legacy structure?"*
- **Execution Mode**: Autonomous Convergence Loop (Audit → Fix → Test → Re-audit until 100/100) vs. Advisory Audit Report.

### 2. Autonomous Convergence Loop
When execution mode is requested, do not halt between fix batches. Autonomously fix every identified defect within scope, run tests/typechecks, re-audit, and repeat until 0 issues remain and the Craftsmanship Score reaches 100/100.

### 3. Specialized Subagent Orchestration
Delegate domain sweeps to specialized subagents:
- **Adversarial QA Subagent**: Tests extreme boundaries, concurrency, and multiplatform filesystem safety.
- **Type Safety & Craft Subagent**: Eliminates `any` casts, unvalidated type assertions, and dead code.
- **Ergonomics & Claims Subagent**: Validates documentation parity, clean CLI streams, and actionable error messages.

### 4. Extreme Token Economy
Deliver high-density findings with exact file paths, line numbers, and actionable diffs. Eliminate conversational filler.

## Requirements

Adopt the adversarial posture of an external inspector. Discard previous conversational praise and evaluate reality against the strictest production criteria:

1. **Verification Depth vs. Vanity Coverage:**
   - Detect vanity assertions (e.g. `expect(res).toBeDefined()`, testing only 200 OK paths, shallow mocks).
   - Test extreme boundaries: empty payloads, huge inputs, boundary values, network timeouts, read-only filesystems, and abrupt interrupts.
   - Prove idempotency, concurrency safety, and race condition prevention.

2. **Failure Paths and Rollback Integrity:**
   - Inspect what happens when operations fail mid-flight. Are file handles closed, lock files deleted, and partial writes safely rolled back?
   - Verify that all errors are typed, caught, and logged with actionable context rather than swallowed or logged as noise.

3. **Impeccable Code Craft:**
   - Enforce strict type safety: zero `any`, no unverified `unknown` casts, and runtime schema validation at all network and storage boundaries.
   - Eliminate dead code, zombie variables, commented blocks, and misleading abstractions.
   - Verify single-responsibility modules and make invalid system states unrepresentable in types.

4. **Apple-Grade Ergonomics:**
   - Error messages must state what failed, why it failed, and provide the exact command or action to resolve it.
   - Ensure clean stream separation: parseable machine output to stdout, operational diagnostics to stderr.

5. **Multiplatform Resilience:**
   - Audit path handling for Windows, macOS, and Linux compatibility (path separators, length limits, case sensitivity).
   - Verify UTF-8 encoding hygiene (with and without BOM) and line endings.

6. **Claim Honesty:**
   - Verify that every claim made in `README.md`, docs, CLI help text, or marketing copy is strictly matched by actual code behavior.

## Limits

- Base all findings on verifiable code evidence (file, line number, reproducible failure vector).
- Once scope is confirmed via the questionnaire, execute autonomously without intermediate interruptions.
- Reject trivial bikeshedding; focus on safety, correctness, ergonomics, and craft.

## Output

1. **Craftsmanship Score (0-100)** and Verdict: `IMPECCABLE (95-100)`, `CONDITIONAL PASS (80-94)`, or `DEFECTIVE (<80)`.
2. **AI Blind Spots Uncovered**: Defects and regressions missed during prior conversational iterations.
3. **Critical Correctness and Invariant Failures**: Detailed with file, line, and failure vector.
4. **Ergonomic and DX Deficiencies**: Confusing errors, stream pollution, or inconsistent behavior.
5. **Prioritized Remediation Backlog / Autonomous Convergence Steps**: Actions required to reach 100/100 perfection.
