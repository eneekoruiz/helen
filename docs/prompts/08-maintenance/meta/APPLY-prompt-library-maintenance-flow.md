---
action: APPLY
phase: 08-maintenance
summary: Flow: keep the HELEN library small in intent, wide in coverage and valid: contract, lint, indexes, playbooks, skills and log.
modifies_code: true
repeatable: true
stage: maintenance
---

# Prompt Library Maintenance Flow

## Goal

Keep the HELEN prompt library small in intent, wide in coverage, coherent, reachable from the CLI and free of duplication, improving it with current research, bounded reflection, memory and reproducible verification.

## Use when

- After adding, renaming, merging or removing prompts, skills, playbook goals or catalog entries.

## Steps

Loop until an audit finds no material gap (at most two re-applications per prompt family per pass):

1. **Read** [CONTRACT](../../CONTRACT.md), [RULES](../../RULES.md) and `.quality_audit_log.md`.
2. **Research** current sources when a change depends on external practices, models, tools, security or regulation.
3. **Audit the library:** one clear intent per prompt; no two prompts with the same intent (merge and keep the old id as an alias); correct phase folder; flows end in `-flow.md` and gates in `-checkpoint.md`; every prompt has the required sections and a concise English style.
4. **Apply minimal changes:** prefer fixing the contract, a flow or metadata over rewriting many prompts.
5. **Regenerate and validate:** `helen prompts index`, `helen prompts lint` (frontmatter, sections, language, links, aliases, playbooks), `npm test`.
6. **Update consumers:** playbook steps (`docs/prompts/playbooks.json`), bundled skills that cite prompt ids, the guide.
7. **Log** in `.quality_audit_log.md`: date, files, sources, reasoning, verification, residual risk.

## Stop when

- A change is destructive, the intent is ambiguous, a mass change cannot be verified, or CLI compatibility would break.
- No material improvement is left: record why and finish.

## Limits

- Never claim perfection while residual risks remain; separate verified facts from assumptions.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
