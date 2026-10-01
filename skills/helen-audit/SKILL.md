---
name: helen-audit
description: Master skill for auditing code quality, finding improvements, standardizing Apple-grade tests, checking edge cases, performing code reviews, and identifying technical debt.
---


## From helen-impeccable

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

## From helen-improve

# Holistic Repository Improvement Scanner (Más Mejoras)

HELEN recognizes that asking *"What else can we improve?"* is one of the most powerful workflows in software development, but generic AI assistants fail at it by returning superficial trivia (e.g. "add more comments" or "format code"). 

`helen-improve` acts as an exhaustive, demanding meta-scanner that sweeps the entire codebase across 6 distinct dimensions (Product/Functionality, Aesthetics/Craft, Backend/Data, Performance, Verification Depth, and Developer Experience), cross-referencing and invoking specialized HELEN skills where deep remediation is needed.

## The 6 Improvement Dimensions

### 1. Functional & Product Capabilities (Value & Utility)
- **Workflow Incompleteness**: Identify dead-ends where users or developers have to perform manual steps (e.g., lack of export/import, missing batch actions, no undo/redo, absent clipboard copy shortcuts).
- **Graceful State Handling**: Ensure zero-states, loading states, empty searches, and error states provide helpful recommendations rather than empty screens.
- **Smart Defaults & Persistence**: Remember user preferences, last-used configurations, and form states in local storage or session state without requiring repetitive setup.

### 2. Aesthetics, Craft & Anti-Slop (UI & Personality)
*Delegates to:* `helen-anti-slop`, `helen-premium-design`, and `helen-motion-3d`.
- **Slop Eradication**: Detect and eliminate generic AI tropes (purple neon glows, uniform Bento grids, generic buzzwords, identical card radii).
- **Bespoke Art Direction**: Inject authentic personality, characterful typography pairings (contrasting display serif/mono with functional sans), tactile physical borders, and optical contrast.
- **Tactile Micro-Interactions**: Replace continuous floating animations with purposeful spring physics, active press states, and responsive hover feedback.

### 3. Backend, Architecture & Data Integrity (Robustness)
*Delegates to:* `helen-data-api`, `helen-clean-code`, and `helen-qa-scale`.
- **Query Efficiency & Batching**: Detect N+1 loops awaiting single database or API calls; replace with batched queries or bulk mutations.
- **Idempotency & Concurrency**: Ensure API endpoints and data operations handle double-submits, network retries, and race conditions gracefully.
- **Runtime Schema Validation**: Enforce strict validation (Zod, Valibot, or robust type guards) at all external boundaries (incoming payloads, file reads, environment variables).

### 4. Performance & Scalability (Speed & Efficiency)
*Delegates to:* `helen-a11y-perf`.
- **Bundle & Asset Optimization**: Identify oversized dependencies, uncompressed assets, synchronous script loading, and unmemoized heavy re-renders.
- **Caching & Prefetching**: Identify opportunities for HTTP caching headers, stale-while-revalidate data fetching, and intelligent route prefetching.
- **Non-blocking Operations**: Offload heavy computational work, large JSON parsing, or filesystem sweeps away from synchronous blocking execution.

### 5. Verification Depth & Resilience (Zero-Defect Craft)
*Delegates to:* `helen-impeccable`.
- **Proof vs. Vanity Tests**: Expose test suites that execute code without asserting invariant outcomes; replace with adversarial edge cases (empty strings, huge payloads, network timeouts).
- **Fault Recovery & Rollback**: Verify that operations failing mid-flight cleanly roll back changes, remove temporary files, and release locked resources.
- **Multiplatform Parity**: Guarantee seamless operation across Windows, Linux, and macOS without path separator or line-ending glitches.

### 6. Developer Experience & Operational Polish (DX)
*Delegates to:* `helen-knowledge` and `helen-onboarding`.
- **One-Command Workflows**: Ensure onboarding, testing, linting, building, and running take single, memorable npm scripts.
- **Actionable Diagnostics**: Error messages must state: what failed, why it failed, and the exact 1-step remediation command.
- **Automated Verification**: Fast pre-commit/pre-push hooks that catch syntax, type, secret, and quality errors in seconds before code leaves the developer machine.

## Prioritization Framework (Impact vs. Effort)

Structure all proposed improvements into four actionable tiers:
1. **Tier 1: Quick Wins (High Impact, Low Effort)**:
   - Immediate high-leverage changes taking < 30 minutes that instantly elevate usability, performance, or safety.
2. **Tier 2: Strategic Upgrades (High Impact, Medium/High Effort)**:
   - Core architectural or functional enhancements that significantly expand product capabilities or eliminate architectural ceilings.
3. **Tier 3: Polish & Delights (Moderate Impact, Low Effort)**:
   - Micro-details, tactile keyboard shortcuts, smooth transitions, and refined copywriting that convey bespoke quality.
4. **Tier 4: Future Explorations**:
   - Long-term ideas, advanced integrations, or experimental features to log in the project roadmap.

## Output Format

1. **Executive Repository Assessment**: Current maturity, top strengths, and highest-priority improvement vectors.
2. **Improvement Catalog by Dimension**: Concrete proposals with affected files, rationale, and target specialized skill.
3. **Prioritized Action Matrix**: Grouped by Quick Wins, Strategic Upgrades, and Polish.
4. **Immediate Next Step**: The single most impactful improvement to implement first.

## From helen-qa-scale

# QA, Scale and Observability

## Adversarial QA

1. Identify critical flows and risky inputs.
2. Test or reason through malformed, empty, and huge data; duplicate actions; slow network; cancelled actions; permission failures; partial failures; repeated retries.
3. Review destructive flows and rollback behavior.
4. Check race conditions, concurrency, idempotency, and state recovery.
5. List missing regression tests.

## Scale and cost

1. Identify scaling dimensions: users, records, files, requests, builds, integrations, locales.
2. Find bottlenecks: unbounded loops, synchronous work, repeated parsing, large assets, expensive queries, N+1 patterns.
3. Review caching, batching, pagination, quotas, rate limits, backpressure.
4. Estimate third-party cost drivers. Prefer simple mitigations before architecture.

## Observability

1. Review logs, errors, metrics, traces, alerts, health checks, audit trails.
2. Failures must be visible at the right level of detail; remove noise and add missing context.
3. Check sensitive data leakage in logs (secrets, PII). Alerts need an owner.

## Output

Findings grouped as Critical / Important / Optional, each with evidence and a proposed fix. Do not modify code in an audit run.

Prompts: `audit-adversarial-qa-and-edge-cases`, `audit-stress-scale-and-cost`, `audit-observability-instrumentation`.

## From helen-clean-code

# Clean Code Pass

Reduce complexity, duplication, and technical risk **without changing behavior**.

## When to use

- After a quick audit, before hardening or a release candidate.
- The code works but feels fragile.

## When NOT to use

- The project does not build or compile yet: fix that first.
- Large aesthetic refactors with no clear value.

## Minimum criteria

1. **Zero dead code (high priority).** Remove unused variables, imports, functions, classes, components, and files. Confirm they are unused (search references, check exports and dynamic usage) before deleting.
2. Review responsibilities, naming, duplication, coupling, silent error handling, and abstractions.
3. Prefer small, safe changes. Keep existing behavior for every caller: exported names, signatures and return shapes stay the same unless the user agrees to change them.

## Beyond the checklist

Look for simplifications that lower cognitive load: delete code, merge helpers, clarify boundaries, remove magic conventions, and make the correct path the obvious one. Propose larger improvements (newer tech, better approaches) instead of applying them unasked.

## Safety limits

- Do not change public APIs or contracts without a stated justification.
- No sweeping refactors.
- If context needed to decide is missing, stop and ask.

## Final checks

- Run build/typecheck and lint if the project has them.
- Run the relevant tests if they exist.

## Delivery format

Keep the report minimal:

```text
Done. / Changes applied with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions needed:
- None. / specific actions (e.g. run the build, set a variable)
```

Do not write long reports or theory.

## From helen-review

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