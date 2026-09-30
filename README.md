# HELEN

HELEN is a workflow kit for building projects with AI agents (Claude Code, Codex, Antigravity or any agent that reads `SKILL.md` folders):

- **Prompts** (`docs/prompts`): 94 English, lint-checked task prompts and flows, organized by project phase.
- **Skills** (`skills/`): 15 bundled agent skills that load the right prompts automatically.
- **Playbooks** (`helen apply`): detect the project phase and plan which prompts, skills and tools to use for a goal.
- **Catalog** (`helen skills catalog`): vetted third-party skills, CLIs, MCP servers and references, with install commands HELEN prints but never runs.
- **Scaffolding**: optional modules for React + Vite + TypeScript projects (`helen init`, `helen add`).

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)

## Install

HELEN is not published on npm yet. Install it from the repository:

```bash
git clone https://github.com/eneekoruiz/helen.git
cd helen && npm ci && npm run build && npm link   # exposes the `helen` command
```

## Start here

```bash
cd your-project
helen setup                 # install skills for Claude, Codex and Antigravity + AGENTS.md/CLAUDE.md instructions
helen apply                 # detect the project phase and suggest goals
helen apply design --track  # plan a goal and track it step by step
helen next                  # current step, with its prompt
helen done                  # mark it done (checkpoints require `helen check` to pass)
helen doctor                # project + agent setup health (skills, MCP config, inline secrets)
```

Or just tell your agent: *"Use HELEN: analyze where the project is and what to apply"* — the `helen-apply` skill does the rest.
The full explanation (in Spanish) is in [docs/GUIA.md](docs/GUIA.md); `helen guide` prints it.

## Commands

| Area | Commands |
|---|---|
| Plan and track | `helen apply [goal] [--brief] [--track] [--install]` · `helen next` · `helen done` · `helen skip <reason>` · `helen status` · `helen check` |
| Setup and health | `helen setup [--agents claude codex antigravity] [--dry-run]` · `helen doctor` · `helen guide` |
| Prompts | `helen prompts list [--kind flow]` · `helen prompts search <text>` · `helen prompts show <id>` · `helen prompts path <id>` · `helen prompts flow <id>` · `helen prompts index` · `helen prompts lint` |
| Skills | `helen skills list [--flows]` · `helen skills install [names...] [--target claude codex antigravity custom] [--dir <path>]` · `helen skills update` · `helen skills installed` |
| Catalog | `helen skills catalog [--category <c>] [--kind skill\|cli\|mcp\|plugin\|reference\|service]` · `helen skills external <id>` |
| Library quality | `helen lint` (prompts, indexes, playbooks, skills, catalog) · `npm run evals` (skill quality, see below) |
| Scaffolding | `helen init` · `helen create <name>` · `helen add <modules...>` · `helen modules` · `helen explain <module>` · `helen update` · `helen eject <module>` · `helen rollback` |

Prompt ids accept the full id, the short id (without the action prefix), a path, or a legacy alias.

## Prompts

`docs/prompts` holds the library:

- [RULES.md](docs/prompts/RULES.md) — shared rules every prompt inherits (safety, evidence, no secrets).
- [CONTRACT.md](docs/prompts/CONTRACT.md) — the format every prompt must follow; `helen lint` enforces it (frontmatter, `Goal`, `Use when`, `Steps`/`Requirements`, `Limits`, `Output`, English only).
- [MASTER.md](docs/prompts/MASTER.md) — how an agent executes a flow safely.
- [playbooks.json](docs/prompts/playbooks.json) — goals (design, copy, motion, quality, security, seo-legal, qa, release, deploy, handoff, strategy, data, knowledge, autonomy, connect-tools, safe-install).

Phases: [01 start](docs/prompts/01-start-project/README.md) · [02 building](docs/prompts/02-building/README.md) · [03 finish features](docs/prompts/03-finish-features/README.md) · [04 before production](docs/prompts/04-before-production/README.md) · [05 final audit](docs/prompts/05-final-audit/README.md) · [06 release](docs/prompts/06-release/README.md) · [07 client handoff](docs/prompts/07-client-handoff/README.md) · [08 maintenance](docs/prompts/08-maintenance/README.md) · [09 future knowledge](docs/prompts/09-future-knowledge/README.md)

Each phase README has quick decisions, an exit checklist and a generated index.

## Skills

Bundled: `helen-apply` (entry point), `helen-router`, `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`, `helen-copy-cro`, `helen-motion-3d`, `helen-security`, `helen-seo-compliance`, `helen-qa-scale`, `helen-release`, `helen-client-handoff`, `helen-strategy`, `helen-data-api`, `helen-knowledge`.

| Target | Folder |
|---|---|
| `claude` | `.claude/skills` |
| `codex` / `antigravity` | `.agents/skills` |
| `custom --dir <path>` | any agent that scans a skills folder |

Quality per skill (trigger rate, baseline vs with-skill pass rate) is measured by `npm run evals` and published in [docs/SKILLS_QUALITY.md](docs/SKILLS_QUALITY.md). Eval cases live in [`evals/`](evals).

## Third-party tools

`helen skills catalog` lists vetted tools (design skills, Playwright, GitHub CLI, Vercel/Cloudflare, MCP servers, ECC, AgentShield, design references...). Each entry has a status (`active`, `caution`, `discontinued`) and a `verified` date; `helen lint` warns when a verification is older than 180 days. HELEN never installs third-party code on its own: it prints the pinned command so you review it first.

## Architecture

`src/core` holds the library logic (frontmatter parsing, prompt resolution, lint, playbooks, progress tracking, skills, catalog, doctor). `src/index.ts` is the command layer. The scaffolding modules write templates with dry-run, backups and a `.helenrc` manifest for rollback.

## License

MIT
