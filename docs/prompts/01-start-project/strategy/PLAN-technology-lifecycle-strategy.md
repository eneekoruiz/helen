---
action: PLAN
phase: 01-start-project
summary: Plan the lifecycle of core technologies: support windows, deprecation criteria, major-upgrade strategy and upgrade budget.
modifies_code: false
---

# Technology Lifecycle Strategy

## Goal

Keep the core stack healthy over time: know when each key technology stops being supported, when to replace it, and how to upgrade safely.

## Use when

- Choosing the stack of a new project, or reviewing an existing one once a year.

## Requirements

1. **Core technology map:** frameworks and libraries (e.g. React, Vite, Tailwind, TypeScript) with official support status and estimated end of life.
2. **Deprecation criteria:** when a library must be replaced (no maintenance for over 12 months, unresolved critical vulnerabilities, technological lag).
3. **Major upgrade strategy:** scheduled, safe plans for major version jumps (e.g. React 18 to 19), with tests and rollback.
4. **Alternatives register:** technologies evaluated and discarded, and why.
5. A recurring time budget for preventive upgrades.

## Beyond the checklist

Align the technical roadmap with the release cycles of critical dependencies to avoid being blocked.

## Limits

- Do not push bleeding-edge technology without a business reason or solid backing.
- Plan only: do not upgrade dependencies here.

## Output

A chronological, executable checklist: lifecycle table of core technologies and a preventive upgrade plan ordered by obsolescence risk.
