# HELEN

Keep separate feature dossiers with requirements, exclusions, decisions, dependent tasks and conditional branches: `helen work create`, `helen work plan`, `helen work ready` and `helen work brief`. Native human answers are linked to their actual question; changed scope and stale verification reopen review. See [feature work](docs/FEATURE-WORK.md).

Prepare bounded module context with `helen context --task "change login" --files src/auth.ts`. Reuse sourced, conditional solutions with `helen knowledge search`, and share visual direction across web, slides and documents with `helen creative init/show`. [Task context](docs/TASK-CONTEXT.md) explains lexical analysis and privacy limits. Diagnose tool availability before a handoff with `helen capabilities` or `helen work route`; advertising an ability does not verify it.

Measure versioned outcomes with `helen outcomes record/report`. [Outcome measurement](docs/OUTCOME-MEASUREMENT.md) keeps unavailable tokens and human intervention unknown. [Specialty evaluations](docs/SPECIALTY-EVALS.md) compare frozen tasks with and without skill text; run `npm run evals:specialty -- --dry-run` without model calls. Passing repository tests does not establish a skill advantage. Verify the actual npm installation with `npm run verify:package`; see [distribution checks](docs/PACKAGE-VERIFICATION.md).

The [8 October implementation report](docs/CIERRE-2026-10-08.md) maps delivered roadmap features to actual checks, real provider outcomes and remaining evidence limits. Supplemental rubric reviews preserve original scores and identify constrained judging issues without changing acceptance.

Run bounded read-only research/review in a detached local worker with `helen jobs start --provider claude --subscription-only --claude-extra-usage-disabled "Review this project"`. Inspect results later with `helen jobs list` and `helen jobs show <id>`; the computer must stay awake. See [background tasks](docs/BACKGROUND-JOBS.md) for Codex, continuation, limits and native questions.

Repository-aware briefs, durable session continuity, explicit context profiles, optional startup branding, and evidence-first prompt evaluation are documented in [Workflow and quality](docs/WORKFLOW-QUALITY.md).

Integrate the original [ECC plugin](docs/ECC-INTEGRATION.md) with `helen ecc setup`, then `helen ecc install --target claude` or `--target codex`. HELEN coordinates the task while ECC supplies its upstream skills and provider-specific automation. The source is pinned to a commit and updated explicitly; `helen ecc launch --target claude` loads the allowlisted project `.env` controls. Configuration and installation do not launch a model or prove every hook is active.

Use your agent's native question form through `helen-reprompt` to clarify missing task details; see [Native reprompt questions](docs/REPROMPT.md). Export reusable shared instructions first with `helen prompts show <prompt> --cache-ready`.

For a polished PowerPoint talk, use [the presentation prompt](docs/prompts/03-finish-features/presentation/GENERATE-ted-style-presentation.md): `helen prompts show presentaciones --cache-ready`, or `npm run prompt:powerpoint` from this checkout. It covers narrative, editorial composition, layers and native animation with an explicit playback check.

HELEN is a workflow kit for building projects with AI agents (Claude Code, Codex, Antigravity or any agent that reads `SKILL.md` folders):

- **Prompts** (`docs/prompts`): <!--fact:prompts-->99<!--/fact--> English, lint-checked task prompts and flows (<!--fact:library-->106<!--/fact--> library documents in total), organized by project phase.
- **Skills** (`skills/`): <!--fact:skills-->16<!--/fact--> bundled agent skills that load the right prompts automatically.
- **Playbooks** (`helen apply`): detect the project phase and plan which prompts, skills and tools to use for a goal.
- **Catalog** (`helen skills catalog`): <!--fact:catalog-->41<!--/fact--> vetted third-party skills, CLIs, MCP servers and references, with install commands HELEN prints but never runs.
- **Team** (`helen team`): several agents on one plan without conflicts: parallel waves, claims with leases, handoffs and an autonomous runner. See [Orchestration](docs/ORCHESTRATION.md).
- **Quality loops** (`helen loop`, `helen design`): rubric scoring with evidence until the work meets the bar, distinct design directions and a template detector.
- **Personal assistant** (`helen remember`, `helen remind`, `helen ask`, `helen assistant serve`): your memory, reminders, lists and agenda, on the terminal, a chat page, Telegram and Alexa. See [Assistant](docs/ASSISTANT.md).
- **Scaffolding**: optional modules for React + Vite + TypeScript projects (`helen init`, `helen add`).

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![Tested: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-orange.svg?style=flat-square)](https://vitest.dev)

## Install

Requires Node.js 20 or Node.js 22 and newer. CI runs on Linux with Node 20, 22 and 24, plus an installed-package check; macOS and Windows runners were removed to save hosted minutes, so those platforms are only covered by local runs. Local results and unobserved hosted runs are reported separately.

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
| Project initialization | `helen init-project [name] [--agents ...] [--goal <goal>] [--force] [--yes] [--dry-run] [--json]` |
| Plan and track | `helen apply [goal] [--brief] [--track] [--auto] [--install] [--json]` · `helen next [--json]` · `helen done [--json]` · `helen skip <reason> [--json]` · `helen status [--json]` · `helen check [--json]` |
| Setup and health | `helen setup [--agents claude codex antigravity] [--dry-run] [--json]` · `helen doctor [--fix] [--json]` · `helen report [--open] [--json]` · `helen guide` |
| AI Integration & MCP | `helen mcp` (Native Model Context Protocol server over stdio for Antigravity, Claude, and Cursor) · `helen token-budget [target] [--json]` |
| Original ECC plugin | `helen ecc setup [--ref <commit>]` · `helen ecc status` · `helen ecc install --target claude\|codex [--dry-run]` · `helen ecc launch --target claude\|codex [goal]`; [activation and updates](docs/ECC-INTEGRATION.md) |
| Background research/review | `helen jobs start` · `helen jobs list` · `helen jobs show <id>` · `helen jobs logs <id>` · `helen jobs stop <id>` · `helen jobs resume <id>`; [requirements and limits](docs/BACKGROUND-JOBS.md) |
| Prompts | `helen prompts list [--kind flow] [--json]` · `helen prompts search <text> [--json]` · `helen prompts show <id> [--json]` · `helen prompts path <id> [--json]` · `helen prompts flow <id> [--json]` · `helen prompts index [--json]` · `helen prompts lint [--json]` |
| Skills | `helen skills list [--flows] [--json]` · `helen skills install [names...] [--target claude codex antigravity custom] [--dir <path>] [--json]` · `helen skills update [--json]` · `helen skills installed [--json]` |
| Catalog | `helen skills catalog [--category <c>] [--kind skill\|cli\|mcp\|plugin\|reference\|service] [--json]` · `helen skills external <id> [--json]` |
| Library quality | `helen lint [--json]` (prompts, indexes, playbooks, skills, catalog, evals) · `npm run evals` (multi-run skill quality with 95% CI) |
| Guardrails | `helen add guardrails`: dependency-free pre-commit (blocks `.env`, secrets, conflict markers, huge files) and pre-push (typecheck, lint, test, build) hooks + grouped weekly Dependabot |
| Team of agents | `helen team graph` · `helen team claim [item] --agent <name> [--paths ...]` · `helen team brief <item>` · `helen team complete\|skip\|release <item>` · `helen team handoff --to <agent\|role:...>` · `helen team inbox` · `helen team events` · `helen team run [goal] --agent claude\|--command "<cmd>" [--dry-run]` |
| Quality loops and design | `helen loop rubrics [name]` · `helen loop start <rubric> --subject <text>` · `helen loop score <id> --file <scores.json>` · `helen loop status [id]` · `helen design direction --brief <text> [--count n]` · `helen design check [path]` |
| Personal assistant | `helen remember <text>` · `helen recall <words>` · `helen notes` · `helen forget <id>` · `helen remind <text>` · `helen reminders [cancel\|snooze\|done]` · `helen todo [text] [--list compra]` · `helen agenda [hoy\|mañana\|semana]` · `helen ask <text>` · `helen chat` |
| Assistant setup | `helen assistant status\|config\|check\|token\|export` · `helen assistant serve` · `helen assistant telegram setup\|allow` · `helen assistant alexa setup\|model` · `helen assistant service` |
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
Initialization, setup, skill installation/update/uninstall, progress, configuration,
doctor file repairs and generated module documentation also use this guard and journal.
Reinitializing preserves the tracked plan; replacing an unfinished goal requires an explicit
`--goal <goal> --force`. A gate never overwrites newer progress or authorizes a replacement plan.
Global setup keeps a journal in each affected root; recover each reported operation from its root.
These roots have separate commits, so this is not an atomic transaction across filesystems.
Recovery excludes other recoveries and new mutations; interrupted restoration temporaries are recorded and cleaned on retry.
External scaffolders, dependency-manager installs, Git configuration and third-party service actions
are outside this file journal's scope. Doctor activates Git hooks after its file repairs commit;
custom hook paths are preserved. Nested repairs defer activation until the enclosing operation completes.

The Docker application module currently supports Vite with npm and a `dist` build output.
Other framework/package-manager combinations fail before generating an incompatible image.
The HELEN CLI image starts `dist/cli.js`; the CI smoke workflow checks its CLI and prompt assets,
and tests the generated Vite image over HTTP.

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

Bundled: `helen-apply` (entry point), `helen-router`, `helen-audit`, `helen-backend`, `helen-copy`, `helen-design`, `helen-security`, `helen-release`, `helen-strategy`, `helen-knowledge`, `helen-implementa`, `helen-reprompt`, `helen-arena` (competing ideas and an elimination bracket; needs Python 3.8+), `helen-debug` (root cause with evidence and a regression test), `helen-team` (several agents on one plan) and `helen-assistant` (personal memory, reminders and lists).

| Target | Folder |
|---|---|
| `claude` | `.claude/skills` |
| `codex` / `antigravity` | `.agents/skills` |
| `custom --dir <path>` | any agent that scans a skills folder |

`npm run evals` tracks skill activation and baseline-versus-skill outcomes; the current evidence and unmeasured skills are published in [docs/SKILLS_QUALITY.md](docs/SKILLS_QUALITY.md). Live runs require a subscription-only call budget and confirmed disabled Claude extra usage. Eval cases live in [`evals/`](evals).

For executable repository outcomes with Codex and Claude Code, run `npm run evals:repo` to inspect the plan without invoking a model. Live runs require an explicit subscription-only call budget. The current two-task pilot does **not** establish effectiveness across the skill library. Results, blockers and the separate native-question observation procedure are documented in [docs/REPOSITORY_EVALS.md](docs/REPOSITORY_EVALS.md).

## Zero Telemetry Guarantee

HELEN does not collect or transmit telemetry or analytics. Parsing, reports, progress tracking, the personal assistant and the MCP server run locally. The optional `npm run evals` command invokes your authenticated Claude CLI and sends evaluation prompts and answers to its model provider; it stores results locally in `evals/results`. An explicitly enabled `npm run evals:repo -- --live ...` invokes the selected authenticated Codex/Claude CLIs and stores local traces in `.helen/repo-evals`. Neither evaluation command is run automatically by HELEN.

Explicit `helen jobs start`/`resume` invocations also send task context to the selected native model provider; read-only research tools can contact search/fetch endpoints. Job records and logs stay locally under `.helen/jobs`. Listing, inspecting and stopping a job do not start model calls.

The assistant sends data only through what you configure: a model provider receives the questions sent to it (secrets redacted, private items withheld unless you allow them), and Telegram, Alexa or a webhook carry the messages you exchange through them. All of them are off by default; see [Privacy](docs/ASSISTANT.md#privacy).

## Third-party tools

`helen skills catalog` lists vetted tools (design skills, Playwright, GitHub CLI, Vercel/Cloudflare, MCP servers, ECC, AgentShield, design references...). Each entry has a status (`active`, `caution`, `discontinued`) and a `verified` date; `helen lint` warns when a verification is older than 180 days. HELEN never installs third-party code on its own: it prints the pinned command so you review it first.

## Architecture

`src/core` holds the library logic (frontmatter parsing, prompt resolution, lint, playbooks, progress tracking, skills, catalog, doctor, mcp, team coordination, loops and design checks). `src/assistant` is the personal assistant (dates, memory, reminders, lists, the brain, delivery, server, Telegram and Alexa). `src/commands` contains the modular CLI command logic, and `src/index.ts` acts as the command entry point loader. The scaffolding modules write templates with dry-run, backups and a `.helenrc` manifest for rollback.

## License

MIT

