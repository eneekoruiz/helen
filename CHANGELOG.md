# Changelog

## 2.0.0 — 2026-09-30

HELEN becomes an AI agent workflow kit. Breaking: legacy prompt files, routers, `registry.json`, `USE_CASE_INDEX.md` and the remote `[PLAN]` orchestrator were removed; old prompt ids keep working through aliases.

### Added
- 15 bundled agent skills (`skills/`) for Claude Code (`.claude/skills`), Codex and Antigravity (`.agents/skills`) or any folder (`--target custom --dir`).
- `helen apply` playbooks: detect the project phase and plan prompts, skills and tools for a goal; `--track` with `helen next / done / skip / status / check`.
- `helen setup`: skills + a managed HELEN block in `AGENTS.md` / `CLAUDE.md`.
- Third-party catalog (`helen skills catalog`, `helen skills external`) with kinds (skill, plugin, cli, mcp, reference, service), status and `verified` dates; includes MCP servers, ECC, AgentShield and design references.
- `helen lint`: prompts (contract, English, sections incl. `Output`), generated phase indexes, playbooks, skills and catalog in one command.
- `helen doctor` agent checks (installed/outdated skills, MCP config files, inline secrets) and `helen skills update`.
- `helen prompts search`, short ids and aliases.
- Skill evals (`evals/`, `npm run evals`) with the quality report in `docs/SKILLS_QUALITY.md`.
- Spanish user guide `docs/GUIA.md` (`helen guide`).

### Changed
- Prompt library rewritten in English and consolidated from 131 to 94 prompts with a shared `RULES.md` and `CONTRACT.md`.
- `helen check` falls back to npm when no lockfile is found.

### Security
- `npm audit`: 0 vulnerabilities. HELEN never installs third-party tools; it prints pinned commands for review.
