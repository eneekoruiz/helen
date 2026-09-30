---
action: APPLY
phase: 02-building
summary: Flow: find and fix secrets, injection risks, vulnerable dependencies and unsafe permissions before public exposure or release.
modifies_code: true
repeatable: true
stage: hardening
---

# Security Hardening Flow

## Goal

Review and mitigate security risks before public exposure, client delivery or release.

## Use when

- During building and before stabilization; again before release or handoff.

## Steps

1. [audit-security-risk-checkpoint](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md): know the current risk level.
2. **Secrets and configuration:** hardcoded credentials, tokens, passwords, exposed environment variables, committed `.env` files.
3. **Input and injection:** validation, path traversal, command and query injection, unsafe HTML rendering.
4. **Dependencies:** run the ecosystem audit (`npm audit` or equivalent); fix by severity, not by count.
5. **Permissions and destructive operations:** filesystem calls, subprocesses, unnecessary privileges.
6. **Third-party code and MCP servers:** see `audit-third-party-tools-and-mcp`.
7. Apply safe mitigations in code, then [audit-quality-gates-checkpoint](../checkpoint/AUDIT-quality-gates-checkpoint.md).

## Stop when

- A fix requires changing network or authentication architecture: get explicit confirmation first.

## Limits

- Never print secrets in chat or in reports; say where they are, not what they are.
- Never hide a vulnerability to get a green check.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
