---
action: AUDIT
phase: 08-maintenance
summary: Merge the findings of several audits into one deduplicated, prioritized plan with work packages and the decisions needed.
modifies_code: false
---

# Cross-Audit Synthesis

## Goal

Consolidate the findings of several prompts into one coherent execution plan.

## Use when

- After running two or more audits on the same project.

## Requirements

1. **Deduplicate:** merge repeated issues, keeping the strongest evidence and highest severity.
2. **Resolve conflicts:** choose a direction or mark a decision as needed.
3. **Prioritize** by user impact, risk reduction, effort, leverage and dependencies.
4. **Phase:** now, next, later or intentionally ignored.
5. **Work packages:** small, coherent batches of related items.

## Beyond the checklist

Find the hidden theme and the systemic causes (unclear direction, weak boundaries, poor naming, missing ownership, insufficient verification, presentation over substance). Recommend deleting or simplifying work when that creates more quality.

## Limits

- Plan only: do not modify files; keep the source audit for every item.

## Output

1. Executive summary.
2. Top risks as **Critical**, **Important**, **Optional**.
3. Prioritized work packages and decisions needed.
4. Items to ignore or defer, and the next prompt or agent brief (`generate-agent-brief-builder`).
