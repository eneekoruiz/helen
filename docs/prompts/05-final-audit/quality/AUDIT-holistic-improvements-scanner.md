---
action: AUDIT
phase: 05-final-audit
summary: Discover evidence-backed workflow, design, architecture, performance, verification and developer-experience improvements.
modifies_code: false
aliases:
  - audit-more-improvements
  - scan-repository-improvements
  - audit-enhancements
---

# Holistic Repository Improvement Scanner

## Goal

Find useful improvements across repository functionality, visual interaction, contracts, performance, verification and developer experience. Follow [RULES.md](../../RULES.md); proactively discover additional opportunities without requiring repeated user prompts.

## Use when

- The user requests repository-wide quality or further improvements.
- Core features work but workflows, failure recovery or verification may be incomplete.

## Requirements

1. Reuse existing scope, exclusions and authorization. Ask only for essential unknowns; define observable acceptance and baseline checks before changes.
2. Inspect six dimensions:
   - Functionality: incomplete journeys, batch operations, recovery and empty/error states.
   - Design/accessibility: hierarchy, responsive interactions, keyboard use, reduced motion and product identity.
   - Contracts: validation, idempotency, public compatibility and transaction boundaries.
   - Performance: measurable bottlenecks, queries, bundles, caching and resource cost.
   - Verification: invariant assertions, adversarial inputs, interruptions and supported OS behavior.
   - Developer experience: setup, context handoff, diagnostics, CLI streams and documentation accuracy.
3. Choose primary-agent domain sweeps or focused specialists according to expected expertise and total delegation overhead; when justified, provide compact context and ownership, then integrate evidence. Preserve cost-aware model routing.
4. Run locally reproducible project and CI checks. For affected UI, obtain Playwright Chromium evidence at 375, 768 and 1440 px; mark unavailable checks unverified.
5. After initial findings or completed fixes, explicitly ask what additional evidence-backed improvement would materially improve the authorized outcome. Inspect adjacent consumers and overlooked failure paths. Repeat discovery without an arbitrary iteration cap.
6. Apply actionable findings when remediation is authorized, then verify and rediscover. Otherwise stay read-only and report findings. Finish after acceptance is met and fresh discovery finds no further actionable improvement within scope, or disclose a concrete blocker.

## Limits

- Never silently turn a request for ideas into implementation.
- Prioritize observable benefit, not cosmetic churn, hypothetical feature counts or guaranteed perfection.
- Respect user exclusions, cancellation and explicit resource limits. Record outside-scope proposals.
- Do not repeat unchanged failures or fabricate checks, metrics or files.

## Output

An evidence-backed improvement matrix: finding, affected file/workflow, benefit, effort, dependencies, acceptance and verification. Separate applied changes, proposed work, external blockers and residual risks. State the final discovery outcome.