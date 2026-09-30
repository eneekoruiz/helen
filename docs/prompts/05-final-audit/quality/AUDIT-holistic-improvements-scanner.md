---
action: AUDIT
phase: 05-final-audit
summary: Exhaustive multi-dimensional scan for repository improvements across functionality, aesthetics, backend architecture, performance and DX.
modifies_code: false
aliases:
  - audit-more-improvements
  - scan-repository-improvements
  - audit-enhancements
---

# Holistic Repository Improvement Scanner (Más Mejoras)

## Goal

Conduct an exhaustive, demanding scan across the entire repository to discover high-value improvements in functionality, visual craft, backend architecture, performance, test depth, and developer experience.

## Use when

- You want to answer "What else can we improve?" across the entire codebase without superficial filler.
- The core features are working and you want to elevate the project to production-grade excellence.
- You need a prioritized roadmap of improvements categorized by impact and implementation effort.

## Requirements

Scan the repository thoroughly across all 6 dimensions, avoiding generic advice and focusing on concrete, high-leverage opportunities:

1. **Functionality and Product Value:**
   - Detect missing workflow steps: bulk actions, export/import, undo/redo, smart caching, search filtering, and keyboard navigation.
   - Inspect edge-state UX: empty states, loading indicators, graceful degradation, and offline tolerance.

2. **Aesthetics, Personality and Anti-Slop:**
   - Hunt for generic AI templates: purple radial glows, uniform Bento grids, generic marketing buzzwords, and lack of visual character.
   - Propose bespoke art direction: distinctive typography pairings, tactile physical borders, optical contrast, and meaningful micro-interactions.

3. **Backend and Architecture:**
   - Identify query bottlenecks: unbatched loops, missing pagination, lack of database indexes, and N+1 API calls.
   - Audit data integrity: runtime schema validation (Zod/Valibot), idempotent mutations, transactional rollbacks, and clean interface boundaries.

4. **Performance and Scaling:**
   - Inspect bundle footprint, heavy blocking dependencies, unmemoized expensive calculations, and uncompressed assets.
   - Check caching strategy: HTTP cache headers, client-side stale-while-revalidate, and prefetching.

5. **Verification Depth and Fault Tolerance:**
   - Uncover vanity tests that fail to assert invariant outcomes; replace with boundary cases, network failure simulations, and extreme payloads.
   - Verify multiplatform filesystem safety (Windows, macOS, Linux) and crash recovery.

6. **Developer Experience and Operational Polish:**
   - Review setup scripts, CLI ergonomics, automated pre-commit/pre-push gates, and diagnostic error message clarity.

## Limits

- Audit only: do not modify files directly during the scan.
- Reject trivial filler (e.g. "add more comments" or formatting nits); every proposal must deliver measurable user, architectural, or developer value.
- Every proposed improvement must cite the specific files involved and provide a concrete implementation strategy.

## Output

1. **Executive Improvement Diagnostic**: Summary of the repository's biggest leverage points.
2. **Dimension-by-Dimension Findings**: Concrete enhancements with files, rationale, and recommended HELEN skills.
3. **Action Matrix**: Prioritized into Quick Wins (< 30 min), Strategic Upgrades, and Polish.
4. **First Recommended Action**: The single highest-ROI improvement to implement immediately.
