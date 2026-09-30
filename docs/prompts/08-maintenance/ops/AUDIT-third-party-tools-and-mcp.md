---
action: AUDIT
phase: 08-maintenance
summary: Vet any third-party skill, plugin, CLI or MCP server before installing: origin, status, license, scripts, permissions, scope, secrets.
modifies_code: false
aliases:
  - audit-third-party-skills-supply-chain
  - audit-mcp-servers-security-and-scope
---

# Third-Party Tools and MCP Review

## Goal

Review any skill, plugin, extension, CLI, install script or MCP server before it is installed or connected. Skills and plugins run instructions (and sometimes scripts) with your permissions; MCP servers give the agent real tools with your accounts and tokens, which is even more sensitive.

## Use when

- Before running anything shown by `helen skills external <id>`, and when updating an installed tool.

## Requirements

1. **Origin:** the official repository, package or endpoint documented by its owner; beware forks, mirrors, typo-squats and same-name repositories; check the domain of one-click installs.
2. **Status:** archived, discontinued or unmaintained tools are not recommended (the catalog marks them).
3. **License** compatible with the intended use.
4. **Content:** read `SKILL.md` and every script (`scripts/`, installers, hooks): network access, files outside the project, credential reads, remote execution.
5. **Installation:** no blind `curl | sh`; pinned version; one installation method per tool.
6. **Scope:** install only the needed skill, not whole collections; one main skill per function (e.g. one design skill).
7. **MCP servers:** real need (if a skill or CLI is enough, skip the server); least privilege and read-only when looking is enough; limited to one project or repository; development environments, not production; tokens in environment variables or the agent's secret store, never in the repository or chat; human confirmation for writes, deletes, deploys and spending; prompt injection risk from pages, logs and issues the tool reads; telemetry and how to disable it; per-project rather than global configuration; remove unused servers and revoke their tokens.

## Beyond the checklist

Keep a short approved list per project (name, version, permissions, owner) in `.quality_audit_log.md` or `AGENTS.md`.

## Limits

- Audit only: never install, run or connect anything during the review; never reveal credentials you find.

## Output

Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. End with the decision for each tool: install, install with restrictions, or do not install.
