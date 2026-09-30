---
action: AUDIT
phase: 07-client-handoff
summary: Check that a project can be handed over without hidden knowledge: setup, deploy, access, docs, known limits, support and recovery.
modifies_code: false
---

# Client Handoff and Support Readiness

## Goal

Make sure the project can be handed to a client, teammate, maintainer or future self without hidden knowledge.

## Use when

- Before delivery or a change of owner.

## Requirements

1. Setup, deployment, credentials (where they live), configuration, docs, known limitations and support expectations.
2. Operational tasks the recipient must perform, and how often.
3. Troubleshooting and recovery documented.
4. Knowledge that only the current owner has.
5. Deliverables organized and named professionally; ownership of domains, hosting, repositories and SaaS accounts clear.

## Beyond the checklist

Confidence builders: demo script, acceptance checklist, support FAQ, maintenance calendar, risk register, decision log, owner handoff note.

## Limits

- Audit only. Never write raw secrets in the report.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. Missing recipient knowledge and support risks.
3. Deliverable checklist and the recommended handoff package.
