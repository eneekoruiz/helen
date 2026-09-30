---
action: APPLY
phase: 09-future-knowledge
summary: Generate docs/KNOWLEDGE_SNAPSHOT.md: file map, scripts, non-secret config, ADR index and dependencies, for archiving or handoff.
modifies_code: true
aliases:
  - apply-automated-knowledge-preservation
---

# Knowledge Snapshot

## Goal

Package the current technical and operational state of the repository into one self-contained document for archiving or handoff.

## Use when

- Before archiving a project, a long pause, or a handoff.

## Requirements

1. **File map** from `git ls-files` (grouped, not every file when the repository is large).
2. **Scripts and configuration:** what each script does; an explained schema of `.env.example` without values.
3. **Decisions:** titles and statuses of all ADRs in chronological order.
4. **Dependencies:** direct dependencies with current versions and their purpose.
5. Optional: a Mermaid diagram of the main modules or data flow; exported database schema (structure only).
6. Write `docs/KNOWLEDGE_SNAPSHOT.md`, readable on its own.

## Limits

- Never include real secrets, production tokens, passwords, SSH keys or customer data.
- Exclude caches, builds (`dist`, `build`) and `node_modules`.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
