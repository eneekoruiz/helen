# Security Risk Checkpoint

## Purpose

Stop unsafe changes before release, delivery, or public exposure.

## Command

Use available commands:

- `npm audit`
- dependency scanner if configured;
- project-specific security checks.

## Manual Review

Check:

- secrets;
- private URLs;
- unsafe logs;
- path handling;
- input validation;
- auth and permissions if applicable;
- dependency risk;
- destructive operations.

## Blocks Progress

- Secret committed or exposed.
- Critical/high dependency issue with reachable impact.
- Unsafe destructive behavior.
- Public release with known sensitive data leakage.

## Warning Only

- Low-severity dependency issue with no reachable path.
- Security improvement that requires larger architecture work and is documented.

## Recovery

Remove exposure, patch or mitigate, document residual risk, and repeat the checkpoint.
