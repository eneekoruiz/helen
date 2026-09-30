---
action: AUDIT
phase: 09-future-knowledge
summary: Can the system recover from failures and keep up with upgrades? Rollback, restore, health checks, outdated and deprecated dependencies.
modifies_code: false
aliases:
  - audit-legacy-resistance
  - audit-self-recovery
---

# Resilience and Upgradeability Audit

## Goal

Check that the project can recover from broken deploys, corrupted data or dependencies, and that it will still be upgradeable in the coming years.

## Use when

- Yearly, before long-term handoff, or after a painful incident or upgrade.

## Requirements

1. **Rollback:** a clear, tested way to revert a failed production version.
2. **Restore:** backup restore guides for databases and user uploads exist and are readable; recovery time (RTO) acceptable for the business.
3. **Local reset:** a clean way to reset the development environment.
4. **Health checks:** endpoints or checks that report the state of key dependencies (database, third-party APIs).
5. **Outdated dependencies:** direct dependencies two or more major versions behind; deprecated APIs in core libraries (lint warnings, deprecations).
6. **Monoliths:** oversized modules that are hard to decouple or test; integrations so tied to the framework that changing it means a rewrite.
7. Separate automatic recovery from manual emergency steps.

## Beyond the checklist

Automated rollback on elevated error rates; a 12-month progressive upgrade roadmap with effort estimates, ordered by return on investment.

## Limits

- Audit only. Never run destructive commands against production; never propose mass refactors without tests covering the affected area.

## Output

1. Resilience level (Low, Medium, High) and upgradeability rating (Solid, Fragile, Critical).
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Preventive actions and the upgrade roadmap.
