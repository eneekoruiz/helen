---
name: helen-security
description: Master skill for auditing and hardening project security before public exposure, client delivery, or release; detecting secrets, injection vulnerabilities, dependency risks, and MCP server permissions in an autonomous convergence loop.
version: 2.1.0
---

# Security Hardening (Security Master Skill)

Security is an uncompromising prerequisite for production software. `helen-security` forensically audits codebases for secret leaks, injection vectors, malicious dependencies, and insecure permissions, applying immediate safe mitigations in an autonomous loop.

## Operating Principles

### 1. Interactive Scoping Questionnaire
Before running deep penetration or hardening sweeps, clarify security scope:
- **Security Profile**: Simple (standard env validation, basic HTML escaping) vs. Strict (fail-fast Zod, AES-GCM ciphers, strict CSP, SHA-256 integrity)?
- **Third-Party & Dependency Tolerance**: Auto-patch low/moderate vulnerabilities with safe version bumps or report for review?
- **Public vs. Internal Exposure**: Is the service directly public-facing (requiring strict rate-limiting and DDoS/CORS lockdown) or internal tooling?

### 2. Autonomous Security Convergence Loop
Once the security profile is locked:
**Secret Scan → Input Validation Audit → Dependency CVE Sweep → Patch & Mitigate → Verify Build/Tests → Repeat**
Iterate autonomously until 100% of critical and high-severity security vectors are mitigated. Never stop to ask permission to fix an obvious secret leak or unescaped input.

### 3. Specialized Subagents
- **Secret & Credential Scanner Subagent**: Uses regex patterns to detect API keys, private tokens, and exposed `.env` files.
- **Dependency & CVE Auditor Subagent**: Audits `package-lock.json` or `pnpm-lock.yaml` against vulnerability databases.
- **Injection & Path Traversal Subagent**: Inspects SQL, shell exec, file path resolution, and dangerouslySetInnerHTML.

### 4. Extreme Token Economy
Report findings with file paths, violated OWASP rules, and before/after code remediation diffs. Never print secret values or lecture on security theory.

## Audit and Mitigation Criteria

1. **Secrets and configuration:** Hardcoded credentials, tokens, passwords, and committed `.env` files.
2. **Input and injection:** SQL injection, command injection, path traversal, and unsafe HTML rendering.
3. **Dependencies:** Vulnerability audits with severity scoring.
4. **Permissions and destructive operations:** Subprocess spawns, raw shell execution, and file write permissions.
5. **Third-party code and MCP servers:** Least-privilege connections, verified endpoints, no production credentials in dev tools.

## Safety Invariants

- Never print actual secrets or tokens in output; indicate where they live (e.g. `src/config.ts#L12`), never what they are.
- Confirm before major structural changes to network or auth architecture.
- Never suppress or cosmetically bypass a security scanner to get a fake green pass.
