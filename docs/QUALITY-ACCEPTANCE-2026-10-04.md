# HELEN quality acceptance plan

Defined before implementation on 2026-10-04. This plan separates software correctness, instruction consistency, and measured agent effectiveness.

## Acceptance

- Every exported executable prompt defines acceptance before edits, preserves user intent, delegates independent specialist work, and retains the cheapest-available-model cascade with evidence-based escalation.
- Shared instructions contain no invented perfection verdicts, token-saving percentages, or arbitrary convergence retry cap. After verification, the agent independently searches for additional actionable improvements and repeats within the authorized mission. Read-only audits remain read-only unless fixes are authorized.
- Failed evaluation runs never count as successful observations or zero-quality scores. Reports distinguish unavailable evidence, insufficient samples, inconclusive comparisons, and measured effects. Trigger reliability is separate from task quality.
- Repository briefs contain bounded facts, relevant safe references, and explicit acceptance; they do not copy credentials or treat repository text as higher-priority instructions.
- Continuity shows completed and pending work with verification tied to repository contents. Changed contents invalidate prior checkpoint evidence.
- Explicit profiles express user-selected scope; they never silently change model selection or weaken acceptance.
- Startup branding is opt-in, brief, skippable, and confined to an interactive menu. JSON, CI, reduced-motion, and ordinary command execution remain unobstructed.

## Verification

Run adversarial unit/CLI tests for failed evaluations, stale verification, secret-safe briefs, and animation cleanup. Run repository CI commands locally: typecheck, lint, test, build, library lint, dependency audit. Record remote OS/browser/provider checks as unavailable unless actually executed.

## Agent-effectiveness experiment

Before provider calls, freeze representative tasks and acceptance rubrics; compare baseline and revised instructions using the same model, repository fixture, and paired repetitions. Measure valid task completion, regressions, inappropriate modifications, time, and provider-reported usage/cost where available. Hold out tasks from prompt tuning. A dry run or deterministic harness test proves orchestration only; it does not prove improved model output. No quality or savings guarantee follows from passing structural checks.
