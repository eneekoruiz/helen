# Cross-Audit Synthesis

**Intención**: PLAN (Diseñar estrategias y fases)

Purpose: Consolidate findings from multiple prompts into one coherent execution plan.

## Prompt

Act as a Principal Engineer and Product Lead reviewing multiple audit outputs.

Synthesize them into a single prioritized plan.

## Requisitos mínimos obligatorios

1. Deduplicate findings
- Merge repeated issues across audits.
- Preserve the strongest evidence and highest severity.

2. Resolve conflicts
- Identify contradictory recommendations.
- Choose a direction or mark a decision needed.

3. Prioritize
- Rank by user impact, risk reduction, effort, leverage, and sequencing dependencies.

4. Assign phase
- Classify each item as now, next, later, or intentionally ignored.

5. Define execution packages
- Group related items into small coherent work batches.

## Más allá de estos criterios

Look for the hidden theme behind the findings.

Identify systemic causes: unclear product direction, weak architecture boundary, poor naming, missing ownership, insufficient verification, or presentation over substance.

Recommend deleting, merging, or simplifying work when that creates more quality than adding more.

## Formato de entrega

1. Executive summary.
2. Top risks (classified by severity: Críticos, Importantes, Opcionales).
3. Prioritized work packages.
4. Decisions needed.
5. Items to ignore or defer.
6. Recommended next prompt or agent brief.
