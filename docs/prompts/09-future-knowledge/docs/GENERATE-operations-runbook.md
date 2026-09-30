---
action: GENERATE
phase: 09-future-knowledge
summary: Write the operations runbook: deploy, rollback, restore backups, rotate credentials, reset local env, health checks, incident steps.
modifies_code: true
---

# Operations Runbook

## Goal

Write down exactly how to operate and recover the project, so anyone with access can do it under pressure.

## Use when

- Before production, before handoff, or right after an incident exposed missing steps.

## Requirements

1. **Deploy:** the exact steps or pipeline, who can trigger it, how to verify.
2. **Rollback:** how to return to the previous version (host rollback command, previous tag) and how long it takes.
3. **Backups:** where they are, how to restore them, when the last restore test happened.
4. **Credentials:** where they live (vault name, never values), how to rotate each, who can.
5. **Local reset:** clean `node_modules`, caches and local databases; reseed.
6. **Health:** health-check endpoints, dashboards and alerts, and what "healthy" looks like.
7. **Incidents:** first five minutes checklist, who to contact, how to communicate, how to write the post-mortem.
8. Mark which steps are automatic and which are manual.

## Limits

- No secret values, private keys or personal phone numbers in the runbook.

## Output

`docs/RUNBOOK.md` content, ready to save, with a last-reviewed date.
