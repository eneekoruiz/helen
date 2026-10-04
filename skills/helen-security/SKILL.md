---
name: helen-security
description: Master skill for auditing and hardening project security before public exposure, client delivery, or release; detecting secrets, injection vulnerabilities, dependency risks, and MCP server permissions in an autonomous convergence loop.
version: 2.1.0
---

# Security Hardening (Security Master Skill)

Security is an uncompromising prerequisite for production software. `helen-security` forensically audits codebases for secret leaks, injection vectors, malicious dependencies, and insecure permissions, applying immediate safe mitigations in an autonomous loop.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
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

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected expertise or context savings outweigh transfer, coordination, integration, verification and retries. Flash is optional when available and suitable. Keep shared instructions as a stable prefix and task facts after it; provider caching requires runtime support and measured cache hits. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.
