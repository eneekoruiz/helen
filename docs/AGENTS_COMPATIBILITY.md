# Agent Compatibility Matrix

Verified on: 2026-09-30

This document tracks verified support across major AI coding agents for HELEN skills, rules, and MCP tools.

| Agent | Target Directory | Frontmatter Fields Supported | MCP Tooling Support | System Rules |
|---|---|---|---|---|
| **Google Antigravity** | `.agents/skills/`, global `~/.gemini/config/skills/` | `name`, `description`, `version` | Yes (stdio JSON-RPC via `mcp_config.json`) | `.agents/rules/*.md`, `GEMINI.md` |
| **Claude Code** | `.claude/skills/`, global `~/.claude/skills/` | `name`, `description`, `version` | Yes (via `.claude.json` / stdio) | `CLAUDE.md`, `.claude/commands/` |
| **Codex** | `.agents/skills/` | `name`, `description` | Partial | `AGENTS.md` |
| **Cursor** | `.cursor/rules/`, `.cursorrules` | Frontmatter metadata | Yes (via Cursor MCP) | `.cursor/rules/*.mdc` |
| **GitHub Copilot** | `.github/` | N/A | Limited | `.github/copilot-instructions.md` |

## Notes on Best Practices
1. **Antigravity**: Antigravity discovers workspace skills in `.agents/skills/<name>/SKILL.md` or global skills in `~/.gemini/config/skills/<name>/SKILL.md`. Both standard format and frontmatter descriptions are supported.
2. **Claude Code**: Supports progressive disclosure (`references/` subdirectories) and slash commands in `.claude/commands/`.
3. **Cursor**: MDC rules format provides path globbing for contextual instruction loading.
