# Changelog

## Unreleased

### Added
- **Team of agents** (`helen team`, skill `helen-team`, MCP `helen_team_*`): a work graph with parallel read-only waves; claims with leases, path scopes and secret tokens (MCP sessions must present them); handoffs between agents or roles; an event log; and `helen team run`, which drives a plan to the end with worker agents (`--agent claude` or any `--command`), verifies checkpoints with the project's own scripts, shares a plan with other runs, and gives claims back on Ctrl-C. See `docs/ORCHESTRATION.md`.
- **Quality loops** (`helen loop`): rubric scoring (general, design, code, copy, security, release) with evidence rules, verdicts (continue, stalled, exhausted, converged) and an independent final score.
- **Design directions and template check** (`helen design direction`, `helen design check`): seeded, distinct directions over seven curated axes with WCAG-checked palettes, and a deterministic detector of template tells.
- **Personal assistant** (skill `helen-assistant`): memory, reminders, lists and agenda in `~/.helen`; Spanish and English dates (recurrence, DST, hours in words); a scheduler with desktop, ntfy/webhook and Telegram delivery and a daily briefing; `helen ask` and `helen chat`; `helen assistant serve` with a chat page, a token API, a Telegram bot and an Alexa endpoint with Amazon's request verification and native Echo reminders; an optional model (a local command or the Claude API with HELEN's tools); privacy rules for credentials and private items; MCP tools for coding agents. See `docs/ASSISTANT.md` and `docs/ALEXA.md`.
- Eval suite: <!--fact:evalCases-->136<!--/fact--> cases across the bundled skills, with negative (must-not-trigger) cases for each.
- `npm run docs:check` / `docs:sync`: numbers, file references and links in the documentation are checked against the repository in CI.
- Release pipeline for real: release-please and npm trusted publishing with provenance (`release.yml`), a packaging check, a Docker image job and a portability matrix (Linux, macOS, Windows).

### Fixed
- Documentation claims that did not match the repository (missing workflows, counts, links) were corrected and are now enforced.
- The MCP server confines tools to its allowed roots and refuses `force` unless the user enables it.
- Git hooks come from one source, keep their executable bit, and `helen doctor --fix` repairs them.
- Coordination hardening after an independent review: locks are only broken when their holder is gone, two runs never take the same item, claims cannot be completed or released by naming their holder, rotation cannot empty an inbox, notes cannot forge sections of `STATE.md`, and the runner never writes through symbolic links.

### Changed
- Add the optional project `setup --preset efficient` with additive MCP configuration and six native tracking skills for Codex, Claude Code and Antigravity.
- Align setup and documentation with optional cost-aware delegation, verifiable acceptance and latency-conscious execution.
- Clarify catalog versus installed skills, native question-based reprompting and partial versus full verification gates.
- Bound test workers and exercise crash recovery through compiled JavaScript to avoid unnecessary loader processes in CI verification.


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
  - Eval suite across the bundled skills, each with negative (must-not-trigger) cases.
- Publishing: `helen-cli` bin alias in `package.json`, `SECURITY.md` and `docs/RELEASING.md`. The npm publish and release-please workflows described in the first draft of this entry did not exist in the repository; they are added for real under Unreleased.
- Windows portability: normalized CRLF vs LF in frontmatter parsing, unified forward-slash relative paths, and safe spawn handling.

### Changed
- Skill trigger descriptions tuned with concrete user trigger phrasing across the bundled skills to improve autonomous AI agent invocation.

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
