---
action: GENERATE
phase: 09-future-knowledge
summary: Write Architecture Decision Records (one decision each: context, decision, consequences, status) and an ADR index.
modifies_code: true
---

# Decision Log (ADR)

## Goal

Record the "why" behind technical decisions so future readers do not have to guess or repeat old debates.

## Use when

- After any decision that is costly to reverse: architecture, stack, data model, hosting, major dependencies.

## Requirements

1. One decision per record, Michael Nygard format.
2. **Context:** forces behind the decision (performance, cost, platform limits, team skills).
3. **Decision:** the chosen alternative and the main alternatives rejected.
4. **Consequences:** benefits and the debts or tradeoffs accepted.
5. **Status:** Proposed, Accepted, Rejected or Superseded (with a link to the successor).
6. Link the commits or branches that implemented it; keep an index at `docs/adr/README.md`.

## Limits

- Never rewrite history: supersede old ADRs instead of editing their decision.

## Output

A file ready for `docs/adr/ADR-NNN-short-title.md`:

```markdown
# ADR NNN: Short title
- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Rejected | Superseded by ADR-XXX
- Authors: names

## Context
## Decision
## Consequences
- Positive:
- Negative:
```
