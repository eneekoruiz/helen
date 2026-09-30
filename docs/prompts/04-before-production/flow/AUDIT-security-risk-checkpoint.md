---
action: AUDIT
phase: 04-before-production
summary: Blocking gate: no exposed secrets, reachable critical dependency vulnerabilities, unsafe destructive behavior or data leaks.
modifies_code: false
---

# Security Risk Checkpoint

## Goal

Stop unsafe changes before release, delivery or public exposure.

## Use when

- Before and after security work, and before any release, handoff or public launch.

## Requirements

1. Run what exists: `npm audit` (or the ecosystem equivalent), configured dependency scanners, project security checks.
2. Review secrets, private URLs, unsafe logs, path handling, input validation, auth and permissions, dependency risk and destructive operations.
3. **Blocks progress:** a secret committed or exposed; a critical or high dependency issue with reachable impact; unsafe destructive behavior; a public release with known sensitive data leakage.
4. **Warning only:** low-severity dependency issues with no reachable path; documented improvements that need larger architecture work.

## Limits

- Never print secret values; say where they are.
- Recovery: remove the exposure (rotate leaked secrets), patch or mitigate, document residual risk, repeat the checkpoint.

## Output

Checks run, blockers and warnings with evidence, residual risk, and `GATE PASSED` or `GATE BLOCKED`.
