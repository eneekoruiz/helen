# HELEN

Repository-aware briefs, durable session continuity, explicit context profiles, optional startup branding, and evidence-first prompt evaluation are documented in [Workflow and quality](docs/WORKFLOW-QUALITY.md).

Use your agent's native question form through `helen-reprompt` to clarify missing task details; see [Native reprompt questions](docs/REPROMPT.md). Export reusable shared instructions first with `helen prompts show <prompt> --cache-ready`.

HELEN is a workflow kit for building projects with AI agents (Claude Code, Codex, Antigravity or any agent that reads `SKILL.md` folders):

- **Prompts** (`docs/prompts`): 98 English, lint-checked task prompts and flows (105 total library documents), organized by project phase.
- **Skills** (`skills/`): 12 bundled agent skills that load the right prompts automatically.
- **Playbooks** (`helen apply`): detect the project phase and plan which prompts, skills and tools to use for a goal.
- **Catalog** (`helen skills catalog`): 41 vetted third-party skills, CLIs, MCP servers and references, with install commands HELEN prints but never runs.
- **Scaffolding**: optional modules for React + Vite + TypeScript projects (`helen init`, `helen add`).

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)

## Install

Requires Node.js 20 or Node.js 22 and newer. Hosted CI uses Node 22 on Linux; other operating systems and Node versions need separate verification.

```bash
npm install -g helen-cli
# or run directly with npx
npx helen-cli --help
```

Or from source:

```bash
git clone https://github.com/eneekoruiz/helen.git
cd helen && npm ci && npm run build && npm link   # exposes the `helen` and `helen-cli` commands
```

## Start here

To initialize a new or existing project with full agent setup and safety guardrails in a single command:

```bash
helen init-project my-app       # adopts folder, runs setup, installs safety guardrails, tracks goal
# or step by step:
cd your-project
helen setup                     # install skills for Claude, Codex and Antigravity + AGENTS.md instructions
helen setup --preset efficient  # optional project MCP connection and chat tracking helpers
helen apply                     # detect the project phase and suggest goals
helen apply design --track      # plan a goal and track it step by step
helen next                      # current step, with its prompt
helen done                      # mark it done (checkpoints require `helen check` to pass)
helen doctor                    # project + agent setup health (skills, MCP config, inline secrets)
```

### JSON Mode & Automation for AI Agents

All HELEN commands support a global `--json` flag producing a structured, machine-readable envelope on `stdout`:

```bash
helen status --json
helen apply strategy --json
helen doctor --json
```

```json
{
  "ok": true,
  "command": "status",
  "data": { ... },
  "warnings": [],
  "errors": []
}
```

Standard exit codes: `0` (Success), `1` (Error), `2` (Warnings present), `3` (Checkpoint gate failed).

`helen apply --auto` runs configured checkpoint scripts and pauses at prompt, skill, or external-tool instructions that require an agent or person to execute them. It does not mark those instructions complete automatically.

## Commands

| Area | Commands |
|---|---|
| Project initialization | `helen init-project [name] [--agents ...] [--goal <goal>] [--yes] [--dry-run] [--json]` |
| Plan and track | `helen apply [goal] [--brief] [--track] [--auto] [--install] [--json]` · `helen next [--json]` · `helen done [--json]` · `helen skip <reason> [--json]` · `helen status [--json]` · `helen check [--json]` |
| Setup and health | `helen setup [--agents claude codex antigravity] [--dry-run] [--json]` · `helen doctor [--fix] [--json]` · `helen report [--open] [--json]` · `helen guide` |
| AI Integration & MCP | `helen mcp` (Native Model Context Protocol server over stdio for Antigravity, Claude, and Cursor) · `helen token-budget [target] [--json]` |
| Prompts | `helen prompts list [--kind flow] [--json]` · `helen prompts search <text> [--json]` · `helen prompts show <id> [--json]` · `helen prompts path <id> [--json]` · `helen prompts flow <id> [--json]` · `helen prompts index [--json]` · `helen prompts lint [--json]` |
| Skills | `helen skills list [--flows] [--json]` · `helen skills install [names...] [--target claude codex antigravity custom] [--dir <path>] [--json]` · `helen skills update [--json]` · `helen skills installed [--json]` |
| Catalog | `helen skills catalog [--category <c>] [--kind skill\|cli\|mcp\|plugin\|reference\|service] [--json]` · `helen skills external <id> [--json]` |
| Library quality | `helen lint [--json]` (prompts, indexes, playbooks, skills, catalog, evals) · `npm run evals` (multi-run skill quality with 95% CI) |
| Guardrails | `helen add guardrails`: dependency-free pre-commit (blocks `.env`, secrets, conflict markers, huge files) and pre-push (typecheck, lint, test, build) hooks + grouped weekly Dependabot |
| Scaffolding | `helen init` · `helen create <name>` · `helen add <modules...>` · `helen modules` · `helen explain <module>` · `helen update` · `helen eject <module>` · `helen rollback` |
| Change previews and recovery | `helen add <modules...> --preview [--force]` · `helen update --preview` · `helen init --preview` · `helen generate <type> <name> --preview` · `helen recover [id] [--dry-run]` |

### Preview and recover project changes

`--preview` shows file diffs, composed dependency changes and planned backups without
writing files or running dependency installation. Existing files are skipped unless
`--force` is supplied; `update` already uses force. Add `--json` for a structured
`data.changes` list. Environment and credential files have their contents redacted.

Module installation/update, generation, ejection and rollback record original file
bytes before each mutation and replace files atomically. If an operation fails or
its process is interrupted, `helen doctor` and `helen recover` show its recovery ID:

```bash
helen recover                  # list unfinished operations and commands
helen recover <id> --dry-run   # validate the recovery without restoring files
helen recover <id>             # restore the state before that operation
```

Recover before starting another project mutation. Recovery validates every file
first and stops if later edits conflict with recorded versions; it does not discard
those edits. Records stay locally in `.helen/operations`, with a Git ignore rule;
snapshot contents are never printed by the recovery listing. Successful operations
remove their snapshots. Empty scaffolding directories can remain after recovery.
External scaffolders, dependency-manager installs, `init-project`, setup/skill installation and
third-party service actions are outside this file journal's scope.

Prompt ids accept the full id, a unique short id (including the action prefix, such as `audit-code-quality`), a path, or a legacy alias. Matching is case-insensitive. If custom prompts share a short name or alias, use a full id; HELEN reports ambiguity instead of choosing a task by listing order. Cache-ready exports keep guides free of executable-task instructions.

## Prompts

`docs/prompts` holds the library:

- [RULES.md](docs/prompts/RULES.md) — shared rules every prompt inherits (safety, evidence, no secrets).
- [CONTRACT.md](docs/prompts/CONTRACT.md) — the format every prompt must follow; `helen lint` enforces it (frontmatter, `Goal`, `Use when`, `Steps`/`Requirements`, `Limits`, `Output`, English only).
- [MASTER.md](docs/prompts/MASTER.md) — how an agent executes a flow safely.
- [playbooks.json](docs/prompts/playbooks.json) — goals (design, copy, motion, quality, security, seo-legal, qa, release, deploy, handoff, strategy, data, knowledge, autonomy, connect-tools, safe-install).

Phases: [01 start](docs/prompts/01-start-project/README.md) · [02 building](docs/prompts/02-building/README.md) · [03 finish features](docs/prompts/03-finish-features/README.md) · [04 before production](docs/prompts/04-before-production/README.md) · [05 final audit](docs/prompts/05-final-audit/README.md) · [06 release](docs/prompts/06-release/README.md) · [07 client handoff](docs/prompts/07-client-handoff/README.md) · [08 maintenance](docs/prompts/08-maintenance/README.md) · [09 future knowledge](docs/prompts/09-future-knowledge/README.md)

Each phase README has quick decisions, an exit checklist and a generated index.

## Skills

See the [inventory guide](docs/SKILLS-CATALOG.md) for bundled skills, project installations, global Codex skills and the external catalog.

The [reusable agent preset](docs/AGENT-PRESETS.md) connects HELEN to Codex, Claude Code and Antigravity while preserving existing configuration, and provides tracking helpers such as `$helen-resume` in Codex and `/helen-resume` in Claude Code.

Bundled: `helen-apply` (entry point), `helen-router`, `helen-audit`, `helen-backend`, `helen-copy`, `helen-design`, `helen-security`, `helen-release`, `helen-strategy`, `helen-knowledge`, `helen-implementa`, `helen-reprompt`.

| Target | Folder |
|---|---|
| `claude` | `.claude/skills` |
| `codex` / `antigravity` | `.agents/skills` |
| `custom --dir <path>` | any agent that scans a skills folder |

Quality per skill (trigger rate, baseline vs with-skill pass rate) is measured by `npm run evals` and published in [docs/SKILLS_QUALITY.md](docs/SKILLS_QUALITY.md). Eval cases live in [`evals/`](evals).

## Zero Telemetry Guarantee

HELEN does not collect or transmit telemetry or analytics. Parsing, reports, progress tracking, and the MCP server run locally. The optional `npm run evals` command invokes your authenticated Claude CLI and sends evaluation prompts and answers to its model provider; it stores results locally in `evals/results`. It is never run automatically by HELEN.

## Third-party tools

`helen skills catalog` lists vetted tools (design skills, Playwright, GitHub CLI, Vercel/Cloudflare, MCP servers, ECC, AgentShield, design references...). Each entry has a status (`active`, `caution`, `discontinued`) and a `verified` date; `helen lint` warns when a verification is older than 180 days. HELEN never installs third-party code on its own: it prints the pinned command so you review it first.

## Architecture

`src/core` holds the library logic (frontmatter parsing, prompt resolution, lint, playbooks, progress tracking, skills, catalog, doctor, mcp). `src/commands` contains the modular CLI command logic, and `src/index.ts` acts as the command entry point loader. The scaffolding modules write templates with dry-run, backups and a `.helenrc` manifest for rollback.

## License

MIT

