---
action: AUDIT
phase: 09-future-knowledge
summary: Can a new developer go from clone to first green test fast, without private context? Find setup blockers and undocumented knowledge.
modifies_code: false
aliases:
  - audit-developer-onboarding
  - audit-future-developer-onboarding
  - audit-knowledge-gap
---

# Developer Onboarding and Knowledge Gaps Audit

## Goal

Make a new developer productive quickly without private context, and find the unwritten assumptions that would stall future work.

## Use when

- Before onboarding someone, before a handoff, or when the original author is the only one who can move fast.

## Requirements

1. **Setup:** prerequisites and install steps in the README work first time; measure time from clone to first green test (target under 15 minutes).
2. **Environment:** a complete, documented `.env.example` (what each variable does and how to obtain it); hidden dependencies on private networks or undeclared SaaS.
3. **Map:** a short folder and architecture overview; where the main logic lives; how to discover modules, commands, conventions and owners.
4. **Commands:** `dev`, `build`, `test`, `lint` documented and working; troubleshooting for common failures.
5. **Knowledge gaps:** complex code without explanation; stale TODO/FIXME piles; docs that disagree with current APIs, schemas or flows; third-party integrations (payments, auth, CRM) whose data flow must be reverse-engineered.
6. Dead code that misleads readers about the real flow.

## Beyond the checklist

Reduce cognitive load before writing more docs: better scripts, clearer errors, a smoke test, seed data, a first-issue guide, a data-flow diagram where logic is complex.

## Limits

- Audit only. Never store real credentials in docs or the report; report gaps as gaps instead of guessing behavior; link canonical docs instead of duplicating them.

## Output

1. Onboarding readiness score (1-10) and the measured or estimated time to first green test.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. Critical = cannot start the project.
3. Critical grey zones and preservation steps.
