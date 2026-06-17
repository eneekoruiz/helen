# Canonical Prompt Coverage Map

This file explains what exists, what each area is for, and where not to create duplicate prompts.

## Rule

If a new request fits one of these canonical intentions, improve the existing prompt or flow instead of adding another one.

## Canonical Intentions

| Intention | Canonical Entry |
|---|---|
| Decide which prompt or flow to run | `orchestration/00-prompt-router.md` |
| Execute a complete guided polish | `flows/full-polish.md` |
| Audit clean code and architecture together | `flows/clean-code-architecture-audit.md` |
| Audit Staff-level architecture only | `steps/architecture/staff-architecture-audit.md` |
| Simplify code safely without behavior changes | `steps/clean-code/safe-clean-code-simplification-pass.md` |
| Audit general design, premium UI, Awwwards, or SOTY | `design/01-product-design-and-awards-visual-excellence-audit.md` |
| Execute an awards-level design review flow | `flows/awwwards-soty-design-review.md` |
| Convert static page text and images into CMS editable content | `flows/cms-editable-content-conversion.md` |
| Audit editable content model and editorial workflow | `cms/02-content-model-and-editorial-workflow-audit.md` |
| Audit primary UX and user journey | `steps/ux/primary-user-experience-audit.md` |
| Audit loading, error, empty, and state design | `steps/ux/loading-error-empty-states.md` |
| Polish visual details after UX is sound | `steps/visual/premium-visual-polish-pass.md` |
| Check responsive behavior | `steps/visual/responsive-pass.md` |
| Run fast build/test verification | `steps/testing/fast-build-test-verification.md` |
| Audit security hardening | `steps/security/security-hardening.md` |
| Audit privacy/legal/compliance | `privacy/01-privacy-legal-and-compliance-audit.md` |
| Audit APIs, webhooks, SDKs, and contracts | `integrations/01-api-integration-and-contract-audit.md` |
| Audit data model and domain integrity | `data/01-data-model-and-domain-integrity-audit.md` |
| Audit observability | `observability/01-observability-instrumentation-audit.md` |
| Audit product analytics | `observability/02-product-analytics-and-metrics-audit.md` |
| Audit market and competitors | `strategy/01-competitive-benchmark.md` |
| Prioritize roadmap and ROI | `strategy/02-roadmap-roi-prioritization.md` |
| Prepare client delivery | `flows/client-delivery.md` |
| Prepare release candidate | `flows/release-candidate.md` |
| Polish GitHub repository presentation | `steps/github/github-repository-presentation-polish.md` |
| Audit the prompt system itself | `agent-quality/01-agent-workflow-and-prompt-quality-audit.md` |

## Known Merge Decisions

- General design and Awwwards/SOTY are one canonical prompt with ambition levels, not separate prompts.
- Clean code and architecture are separate atomic steps because one applies safe local simplifications and the other evaluates system structure. They are combined by `flows/clean-code-architecture-audit.md`.
- Visual polish is a step, not a domain prompt. The canonical design prompt owns design judgment; the visual step owns scoped implementation polish.
- GitHub polish is a step used by release/delivery flows. Full repository credibility remains covered by `final/04-github-repository-audit.md`.

## Adding New Prompts

Before adding a new prompt:

1. Check this coverage map.
2. Check [TAXONOMY.md](TAXONOMY.md).
3. Prefer improving an existing canonical prompt.
4. Add a new prompt only when it introduces a truly different intention, evidence model, or stop condition.
