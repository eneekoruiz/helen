# Changelog

## Unreleased

- Add the optional project `setup --preset efficient` with additive MCP configuration and six native tracking skills for Codex, Claude Code and Antigravity.
- Align setup and documentation with optional cost-aware delegation, verifiable acceptance and latency-conscious execution.
- Clarify catalog versus installed skills, native question-based reprompting and partial versus full verification gates.


## 2.1.0 — 2026-09-30

Wave 1 implementation: automated project bootstrap, machine-readable JSON output for AI agents, statistically honest evaluation framework, npm publication pipeline, and cross-platform Windows compatibility.

### Added
- `helen mcp`: native Model Context Protocol (MCP) server running via standard stdio JSON-RPC 2.0. Exposes tools (`helen_status`, `helen_next`, `helen_done`, `helen_apply`, `helen_doctor`, `helen_prompt_get`, `helen_skills_list`, `helen_init_project`) directly to Antigravity, Claude, and Cursor without terminal parsing.
- `helen doctor --fix`: automated, safe remediation of missing or broken git hooks, `.github/dependabot.yml`, outdated skills, and missing `.helenrc`.
- `helen apply --auto`: semi-autonomous step orchestration that advances through playbook steps, automatically executing and verifying checkpoint quality gates.
- `helen report`: standalone, interactive HTML dashboard (`.helen/report.html`) and JSON reporting of project phase, completion percentage, checkpoint health, and skills inventory. Supports `--open` and `--json`.
- `helen token-budget`: token estimation and multi-model cost projection (Gemini 1.5 Flash/Pro, Claude 3.5 Sonnet, GPT-4o) across prompt library and playbooks. Supports `--json`.
- `helen init-project`: single-command idempotent project initialization chaining `setup`, `guardrails`, and goal tracking (`apply <goal> --track`). Supports `--dry-run`, `--json`, `--goal`, and `--agents`.
- Global `--json` output across all commands (`apply`, `next`, `done`, `skip`, `status`, `check`, `doctor`, `lint`, `setup`, `init-project`, `prompts *`, `skills *`). Standard envelope: `{ ok, command, data, warnings, errors }` on `stdout`, with human/progress logs routed strictly to `stderr`.
- Standard exit codes: `0` (Success), `1` (Error), `2` (Warnings present), `3` (Checkpoint gate failed). Interactive menus cleanly disabled in JSON mode.
- Statistically honest eval framework:
  - Multi-run sampling (`--runs N`, default 3) with mean, standard deviation, and 95% confidence intervals via Student's t-distribution.
  - Paired delta confidence intervals with automatic `Noise*` labeling when the interval crosses 0 (no false letter grades).
  - Negative test case support (`expectTrigger: false`) to measure and report false positive trigger rates.
  - Eval runner CLI options: `--dry-run`, `--cases`, `--skill`, `--max-calls` budget enforcement, and run resumability.
  - Strict schema validation in `helen lint` and documentation in `evals/README.md`.
  - Expanded eval suite to 90 cases (6 per skill, including 2 negative cases each).
- Publishing and Release Pipeline:
  - npm trusted publishing with provenance via OIDC (`.github/workflows/publish.yml`).
  - Automated versioning and changelog with Release Please (`.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`).
  - Added `helen-cli` bin alias in `package.json` for seamless `npx helen-cli` usage.
  - Added `SECURITY.md` (vulnerability disclosure policy) and `docs/RELEASING.md` (maintainer release checklist).
- Windows portability: normalized CRLF vs LF in frontmatter parsing, unified forward-slash relative paths, and safe spawn handling.

### Changed
- Skill trigger descriptions tuned with concrete user trigger phrasing across all 15 skills to improve autonomous AI agent invocation.

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
- `guardrails` module: dependency-free pre-commit/pre-push hooks and a grouped Dependabot config (also used by this repo).
- Spanish user guide `docs/GUIA.md` (`helen guide`).

### Changed
- Prompt library rewritten in English and consolidated from 131 to 94 prompts with a shared `RULES.md` and `CONTRACT.md`.
- CI runs the full `helen lint` and `npm audit --audit-level=high`; Dependabot is weekly with grouped minor/patch updates and separate majors.
- `helen check` falls back to npm when no lockfile is found.

### Security
- `npm audit`: 0 vulnerabilities. HELEN never installs third-party tools; it prints pinned commands for review.
