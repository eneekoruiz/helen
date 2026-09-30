---
name: helen-security
description: Use when auditing or hardening a project's security before public exposure, client delivery, or release - secrets, input validation and injection, dependency vulnerabilities, permissions, and destructive operations. Mitigates safely and never prints secrets. Also use for any code review, snippet, dependency audit, secret leak, CI shortcut or question about installing third-party scripts, skills, plugins or MCP servers.
---

# Security Hardening

Review and mitigate security risk before public exposure, delivery, or release.

## Audit and mitigation criteria

1. **Secrets and configuration.** Look for hardcoded credentials, tokens, passwords, and exposed environment variables. `.env` files must not be committed.
2. **Input and injection.** Check input validation, path traversal, command injection, query injection, unsafe HTML rendering.
3. **Dependencies.** Run a quick vulnerability audit (`npm audit` or the ecosystem equivalent) and report severity, not just counts.
4. **Permissions and destructive operations.** Review filesystem calls, subprocesses, and unnecessary privileges.
5. **Third-party code.** Treat any skill, plugin, or install script as code that runs with your permissions: read it, pin versions, prefer official channels.
6. **MCP servers.** They give the agent real tools with your accounts: official endpoint only, least-privilege and read-only where possible, development environments not production, secrets outside the repo, human confirmation for writes and deploys (`audit-third-party-tools-and-mcp`).

## Procedure

1. Load the security risk checkpoint before starting (`helen prompts show audit-security-risk-checkpoint`).
2. Apply safe mitigations directly in the code.
3. Re-run lint/typecheck and build; the build must still pass.

## Limits

- Never print secrets in chat or in report files; say where they live, not what they are.
- No structural changes to network or auth architecture without explicit confirmation.
- Do not hide a vulnerability to get a green check.

Full flow: `helen prompts flow security-hardening`.
