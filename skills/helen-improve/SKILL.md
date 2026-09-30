---
name: helen-improve
description: Use when conducting exhaustive, full-stack scans for improvements across all repository dimensions; answering 'what else can be improved?' or 'propose more improvements'; discovering high-impact upgrades in functionality, aesthetics, backend, performance, and developer experience; or synthesizing prioritized enhancement backlogs by impact and effort.
version: 2.1.0
---

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
