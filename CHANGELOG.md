# Changelog

## Unreleased

### Added
- **Team of agents** (`helen team`, skill `helen-team`, MCP `helen_team_*`): a work graph with parallel read-only waves; claims with leases, path scopes and secret tokens (MCP sessions must present them); handoffs between agents or roles; an event log; and `helen team run`, which drives a plan to the end with worker agents (`--agent claude` or any `--command`), verifies checkpoints with the project's own scripts, shares a plan with other runs, and gives claims back on Ctrl-C. See `docs/ORCHESTRATION.md`.
- **Quality loops** (`helen loop`): rubric scoring (general, design, code, copy, security, release) with evidence rules, verdicts (continue, stalled, exhausted, converged) and an independent final score.
- **Design directions and template check** (`helen design direction`, `helen design check`): seeded, distinct directions over seven curated axes with WCAG-checked palettes, and a deterministic detector of template tells.
- **Personal assistant** (skill `helen-assistant`): memory, reminders, lists and agenda in `~/.helen`; Spanish and English dates (recurrence, DST, hours in words); a scheduler with desktop, ntfy/webhook and Telegram delivery and a daily briefing; `helen ask` and `helen chat`; `helen assistant serve` with a chat page, a token API, a Telegram bot and an Alexa endpoint with Amazon's request verification and native Echo reminders; an optional model (a local command or the Claude API with HELEN's tools); privacy rules for credentials and private items; MCP tools for coding agents. See `docs/ASSISTANT.md` and `docs/ALEXA.md`.
- Skill `helen-debug`: reproduce, narrow down (git bisect), prove the root cause, fix it at the cause and lock it with a regression test.
- Eval suite: <!--fact:evalCases-->142<!--/fact--> cases across the bundled skills, with negative (must-not-trigger) cases for each.
- `npm run docs:check` / `docs:sync`: numbers, file references and links in the documentation are checked against the repository in CI.
- Release pipeline for real: release-please and npm trusted publishing with provenance (`release.yml`), a packaging check, a Docker image job and a portability matrix (Linux, macOS, Windows).

### Fixed
- Documentation claims that did not match the repository (missing workflows, counts, links) were corrected and are now enforced.
- The MCP server confines tools to its allowed roots and refuses `force` unless the user enables it.
- Git hooks come from one source, keep their executable bit, and `helen doctor --fix` repairs them.
- Coordination hardening after an independent review: locks are only broken when their holder is gone, two runs never take the same item, claims cannot be completed or released by naming their holder, rotation cannot empty an inbox, notes cannot forge sections of `STATE.md`, and the runner never writes through symbolic links.

- Feature workspace (`helen work`, MCP `helen_work_*`): feature dossiers, tasks with checkpoints, and verification gates whose receipts are signed with a per-user key kept outside the project; detached background jobs (`helen job`, MCP `helen_job_*`, which MCP clients may only use when the user sets `HELEN_MCP_ALLOW_JOBS=1`); outcomes, repository and specialty evals, `verify-package`, and a durable operations journal with crash recovery.
- The assistant understands moving a reminder ("cambia el recordatorio de mamá a las 10"), deleting by name ("borra lo de la leche"), the time before the verb ("todos los lunes a las 8 recuérdame…"), and questions about notes ("dónde dejé las llaves").

### Fixed (audit of the workspace and operations layers)
- Project scripts run by `helen check` no longer inherit the MCP stdout/stdin and are killed after ten minutes.
- Operation journals are authenticated, so a journal planted in a repository is never replayed, and targets inside `.git` are refused.
- A checkpoint task cannot be downgraded through the record tool.
- Tests use the real temporary path so macOS symlinks do not break path comparisons.

### Changed
- Preserve personal and modified skills during uninstall using per-file ownership hashes and conservative legacy cleanup.
- Resume evaluation cases without discarding completed observations; archive evidence before explicit replacement.
- Generate self-contained React testing configuration, including automatic JSX for Next-style TypeScript projects.
- Diagnose current Antigravity MCP configuration, include continuity helpers in skill updates, and migrate only exact legacy design rules.
- Add regressions for these workflows and atomic uninstall updates that preserve hardlinked personal files.
- Recognize exact legacy continuity helpers, prune verified empty skill directories, and retain unowned empty directories and nested personal notes.
- Prevent overlapping live evaluation runs from duplicating provider calls or overwriting evidence; align this repository's commit hook with staged-blob protection.
- Add the optional project `setup --preset efficient` with additive MCP configuration and six native tracking skills for Codex, Claude Code and Antigravity.
- Align setup and documentation with optional cost-aware delegation, verifiable acceptance and latency-conscious execution.
- Clarify catalog versus installed skills, native question-based reprompting and partial versus full verification gates.
- Bound test workers and exercise crash recovery through compiled JavaScript to avoid unnecessary loader processes in CI verification.


## [2.2.0](https://github.com/eneekoruiz/helen/compare/helen-cli-v2.1.0...helen-cli-v2.2.0) (2026-10-25)


### Features

* add --html flag to status command and test:json script ([adc4376](https://github.com/eneekoruiz/helen/commit/adc43768cae6f27a4ea737505ce34f4355924dba))
* add Dependabot and automated release workflow prompts ([d836f19](https://github.com/eneekoruiz/helen/commit/d836f19fb4172595a974517869517a32eeb811ad))
* add ENHANCE-simplify-document prompt — surgical readability pass with KISS and DRY ([3338f22](https://github.com/eneekoruiz/helen/commit/3338f22df8118a3822e4b9ab87ebc2ceff4f6ef9))
* add mandatory CI emulation gate, autonomous convergence loop, and English token economics across skills and prompts ([f9de22d](https://github.com/eneekoruiz/helen/commit/f9de22d669e00fb7d89cf677786777b5297caaa2))
* add safe reusable agent preset and native tracking skills ([8d74ac7](https://github.com/eneekoruiz/helen/commit/8d74ac78564a6f7f31662d2130bbaa59696f15a5))
* **antigravity:** add hierarchical rules and integration audit script ([43493bd](https://github.com/eneekoruiz/helen/commit/43493bd6c13477f9c094ce574dee6e9e002ddc6a))
* **art:** level-100 cinematic engine — 11-stage compositor with naturalness pass ([e3ba424](https://github.com/eneekoruiz/helen/commit/e3ba42474d18a7271715f154eeee66983d3d338c))
* **art:** replace rigid torus knot with organic flowing ribbon ([99877cf](https://github.com/eneekoruiz/helen/commit/99877cf70b2b7ba46d3469718028b6d342d2b290))
* **assistant:** add contextual conversations and reliable personal workflows ([f431433](https://github.com/eneekoruiz/helen/commit/f431433b841361835ab74881a5bf2e4144eae76e))
* **assistant:** add interruptible turns and reviewed conversation regressions ([e903ad5](https://github.com/eneekoruiz/helen/commit/e903ad5062ad9bf2093ac9a90e4127455b43cf1c))
* **assistant:** connect private life workflows and Gmail follow-ups ([badc2f5](https://github.com/eneekoruiz/helen/commit/badc2f566555c627c788de67c52f3531870741b8))
* **assistant:** daily rituals, codex bridge, app modes, recordatorios and telegram voice bot ([da0a135](https://github.com/eneekoruiz/helen/commit/da0a13544f2723bb0553d4c1c8060d8f703a11af))
* **assistant:** daily rituals, codex bridge, capabilities engine and telegram interactive actions ([469e1b0](https://github.com/eneekoruiz/helen/commit/469e1b02c427987da16ec9bafbf9f9aa881781a7))
* **assistant:** enable bounded subscription tools and browser QA ([239e079](https://github.com/eneekoruiz/helen/commit/239e079dc1f13417c215797b6e59995f48156486))
* **assistant:** private Gmail, voice capture and reliable life workflows ([7a46ef4](https://github.com/eneekoruiz/helen/commit/7a46ef4a41476229f0220f04440e55a4ad577998))
* **assistant:** seasonal app modes, shopping aisles, weekly rituals and recordatorios bridge ([3fe3a83](https://github.com/eneekoruiz/helen/commit/3fe3a836f2b60823861820a0048a59e7c1d72e68))
* **assistant:** web sync push notifications, productivity engine and telegram voice assistant example ([bf28186](https://github.com/eneekoruiz/helen/commit/bf2818644995d3127bb563d73b079f587d268361))
* **audit:** add helen-impeccable and helen-anti-slop skills and audit prompts ([47e2b82](https://github.com/eneekoruiz/helen/commit/47e2b8290750a4f0e99b2d7e826efded24dbe83f))
* **cli:** add global --json envelope output, exit codes, and helen init-project command ([161d35a](https://github.com/eneekoruiz/helen/commit/161d35ade1dad5f56083e5bab6e68ba3e8bfc8b1))
* **cli:** improve UX with consistent iconography (checkmark, warning, info, cross); enhance module output formatting ([8ec1abd](https://github.com/eneekoruiz/helen/commit/8ec1abdf270a5839d561dfe19562051e096c6297))
* complete Wave 1 tasks including release pipelines, skill triggers, and expanded evals ([c5b95ff](https://github.com/eneekoruiz/helen/commit/c5b95fff0aa5b7d3b9223b5eae5c07c0700c7d29))
* **evals:** implement statistically honest multi-run eval runner and schema linting ([59b9e59](https://github.com/eneekoruiz/helen/commit/59b9e5991e207e7b6022f5f06fbff8bfe23422a4))
* **hardening:** add module idempotency, dry-run, and integration tests — verify 12 stable modules are safe to re-run and dry-run works for all ([a5995ea](https://github.com/eneekoruiz/helen/commit/a5995ea04d1d9ccaa13ef1db04d431f1b191e588))
* implement 'implementa' goal for autonomous execution with level 100 mandate ([745781e](https://github.com/eneekoruiz/helen/commit/745781e8af4ff3db12e84cea39aefb94b48e1cd9))
* implement automatic non-destructive configuration backup system ([e2bfc83](https://github.com/eneekoruiz/helen/commit/e2bfc83d9e07ad4c5d47b34a48a780f7b25ab011))
* implement CLI rollback system, deep-merge configurations, and restore backup support ([e0755b1](https://github.com/eneekoruiz/helen/commit/e0755b1184e5f698239985c1607829ddaddd81f5))
* implement dual-tier security, truecolor diagnostics easter egg, nested scripts command, and premium README overhauled ([b3e9110](https://github.com/eneekoruiz/helen/commit/b3e91104c4df0f15bddc506f1b2d9030b8afb97f))
* implement native MCP server, doctor --fix, apply --auto, report dashboard, and token-budget ([2ad6cd0](https://github.com/eneekoruiz/helen/commit/2ad6cd01d73a8ef8374d805090d15d6ff420f5fa))
* implement package manager-aware step printing and interactive dependency auto-installer ([ab4f85d](https://github.com/eneekoruiz/helen/commit/ab4f85d645cc839bdc34598e5b2b436f0556a362))
* implement Visual CMS CLI module, integrate visual WYSIWYG components, and update docs ([cac2ddb](https://github.com/eneekoruiz/helen/commit/cac2ddb299ff3e47320d3f718560f6b55564ebc8))
* integrate external marketing and Apple HIG skills, add execution protocol and workflow hardening ([85e90e6](https://github.com/eneekoruiz/helen/commit/85e90e6f4fd9d0f2ec1cc6b2c6e29585c99bfb56))
* merge 40K visual craft prompts and orchestrators with origin ([8d98d97](https://github.com/eneekoruiz/helen/commit/8d98d9796e0ea83bb0f99818db46ca708af8f934))
* model cascade, parallelism and Playwright/Chromium gate for all prompts; bump typescript-eslint to v8 (fixes braces CVE) ([926292d](https://github.com/eneekoruiz/helen/commit/926292d9fa7538b288503bb168d335bbd60979d1))
* **modules:** add status field and filtering (stable/experimental/planned); update menu to show statuses; filter stable modules in main selector ([34ca1d4](https://github.com/eneekoruiz/helen/commit/34ca1d4e8c7245794ab810ee95f11e003d3ee447))
* multi-agent team, personal assistant, workspace gates and audit fixes ([#40](https://github.com/eneekoruiz/helen/issues/40)) ([b0a775d](https://github.com/eneekoruiz/helen/commit/b0a775da9d942e088a58f43ce82cc33e7805f77c))
* **orchestration:** add [PLAN]_Orquestador_Fases.md master file ([a35b4b4](https://github.com/eneekoruiz/helen/commit/a35b4b48db272a67e7260f1d2750a100a89f3483))
* **orchestrator:** add Helen AI Orchestrator with dual execution mode (Autonomous / HITL) ([a1649d8](https://github.com/eneekoruiz/helen/commit/a1649d85b864168f7aeadb84789b2d05c4a81323))
* phase 3 ecosystem, fail-safe architecture, and docs ([bd28085](https://github.com/eneekoruiz/helen/commit/bd2808598a232cb6d18af74d9f7bff8dc39d77a6))
* **prompts:** add animation and 3D visual audit for performance, safety, and integration ([afefd44](https://github.com/eneekoruiz/helen/commit/afefd44332963b7438a9d8117e750e4f2cda58c0))
* **prompts:** add apply-cinematic-and-3d-visual-conversion prompt for dynamic web polish ([fde5072](https://github.com/eneekoruiz/helen/commit/fde507242e4c5cf7106dc35bad97d467d1d919d1))
* **prompts:** add password manager ux, routing, and offline sync audit prompt ([bb88e43](https://github.com/eneekoruiz/helen/commit/bb88e438108fd7635d8a7e4e10caf7bacd99bc93))
* **prompts:** codify Level 100 execution mandate and broad technical authority ([4e79c7c](https://github.com/eneekoruiz/helen/commit/4e79c7cdabc4799de63fc3ddd47c84f742bbbe4e))
* **prompts:** Helen Prompt System vNext Reorganization ([187bafc](https://github.com/eneekoruiz/helen/commit/187bafc8a8ba6d555ab7eeba6cf41d483a48f316))
* **skills:** add Autonomous Convergence Loop to helen-audit & helen-implementa; fix remaining any casts in core ([764bfc9](https://github.com/eneekoruiz/helen/commit/764bfc9c06ebc05e834dcc1e3f0209b5fdce34ad))
* **skills:** add helen-improve master scanner for holistic repository enhancements ([7f56a89](https://github.com/eneekoruiz/helen/commit/7f56a89777dbfc99a3f171de4276a2f1feb4f318))
* **skills:** add helen-reprompt skill for prompt optimization ([254fc80](https://github.com/eneekoruiz/helen/commit/254fc801cfb7ea56b43f403676c7c2a82b6883fc))
* **skills:** incorporate autonomous convergence loop, token economy, specialized subagents, and interactive scoping questionnaires across all master skills and prompts ([79cd84a](https://github.com/eneekoruiz/helen/commit/79cd84aa81e3a8808db64de3be7c7eef23a663b8))
* sync local agent configurations, design-to-code rules and multi-agent setup ([d0caf12](https://github.com/eneekoruiz/helen/commit/d0caf121d09b5f600baa0b4fa6a2497fdba09656))
* upgrade cinematic terminal identity system to modern 3D engine ([0fea510](https://github.com/eneekoruiz/helen/commit/0fea51003ed6556a162246d11b8ab8ff2e2d02a1))
* upgrade terminal cinematic art to a 3D orbital gyroscope with z-sorted perspective projection ([8573dd9](https://github.com/eneekoruiz/helen/commit/8573dd9b2337b2ef074ac7f81323939d037b0533))
* **waves:** implement comprehensive 100-ideas roadmap and multi-agent ecosystem ([50daf14](https://github.com/eneekoruiz/helen/commit/50daf149b9f546b747eac3e4f564b8af5a666d6a))


### Bug Fixes

* add execution contract to helen-arena and atomic write retry on windows ([61826f6](https://github.com/eneekoruiz/helen/commit/61826f698f20f57945941cb4180603b14e2df630))
* **assistant:** construct mail queries without ambiguous text encoding ([3e48acd](https://github.com/eneekoruiz/helen/commit/3e48acdcae6fa3d04df68284f31fe32b46580e6d))
* **assistant:** deliver interruptions through Alexa and Telegram ([51c5496](https://github.com/eneekoruiz/helen/commit/51c54962d260688455abba815a90449ec6816c99))
* **ci:** add tsx fallback in workflowCli tests and pretest tsc script for clean CI runs ([6806913](https://github.com/eneekoruiz/helen/commit/680691396224690defb11d07f656c89cd7b467e0))
* **ci:** give smoke test 20m timeout to avoid cutoff during docker builds ([c03d811](https://github.com/eneekoruiz/helen/commit/c03d811861060a3cac0c52a28727bc2dc6a4de09))
* **ci:** remove || true from lint step to ensure CI fails on errors; improve .gitignore with coverage, cache, env files ([3f7824c](https://github.com/eneekoruiz/helen/commit/3f7824cf923c88511025d2b0248f9c8e92fa6709))
* **ci:** sanitize recordatorios regex, fix encoding spaces and add robust pre-push hook ([c113ec0](https://github.com/eneekoruiz/helen/commit/c113ec08d086b62334fa90367d80fcbf85d86c8e))
* **ci:** use Node 22 in smoke workflow ([61852cc](https://github.com/eneekoruiz/helen/commit/61852cc6af59c083b1afb3f754205afe4fa9c3ee))
* **cli:** revert to ASCII-safe logger format for CI compatibility — use [ HELEN ] prefix instead of Unicode icons ([a170e87](https://github.com/eneekoruiz/helen/commit/a170e8711322a89ac7ad6deaaaf576806425d23e))
* **core:** remove final any cast from mcp.ts ([78473d4](https://github.com/eneekoruiz/helen/commit/78473d48cf4a2b7d99288f8bc082b374f27e9777))
* harden config partial merging, scaffold flags, mcp skill reads, and rules cleanup ([673e815](https://github.com/eneekoruiz/helen/commit/673e81573dd5298fe17fc571c4ed33394aed7b78))
* **lint:** resolve prefer-const, no-constant-condition, and no-control-regex ([7e3e727](https://github.com/eneekoruiz/helen/commit/7e3e727f2d5961251380e30ba057b9d1016ea608))
* **modules:** align vitest scaffold dependencies to v3 to prevent npm arborist crash ([1da320e](https://github.com/eneekoruiz/helen/commit/1da320e1e3b235d8147639ede9e707b674ff2302))
* **operations:** add comment in busy-wait to satisfy no-empty lint ([a27aa1f](https://github.com/eneekoruiz/helen/commit/a27aa1fd96465738fe733e4de0f457aeb145f8b4))
* pin smoke test sandbox project to React 18 and add dependabot configuration ([8ef7e7d](https://github.com/eneekoruiz/helen/commit/8ef7e7db5b958a5d8f0ff687922e54768b0d596a))
* preserve personal skills and resumable evaluation evidence ([352b10b](https://github.com/eneekoruiz/helen/commit/352b10b44eb361078e1f83276a59bff63af5bbe0))
* resolve markdown linting errors (LICENSE heading, CODE_OF_CONDUCT URL format) ([f5e222e](https://github.com/eneekoruiz/helen/commit/f5e222eac433b148c88d86626161687547280b86))
* resolve MCP undefined arg validation, repair doctorFix pre-commit hook, eliminate DEP0190, and update documentation ([c005b4f](https://github.com/eneekoruiz/helen/commit/c005b4f2d4133c76f0fa5dcaf5cb492943b17b6a))
* **security:** upgrade Zod and preserve validation defaults ([64a8fc6](https://github.com/eneekoruiz/helen/commit/64a8fc68c730337c40e61cb0192549d109b99292))
* **skills:** shrink descriptions and update assertions ([cbae350](https://github.com/eneekoruiz/helen/commit/cbae350ba3d884dfcf67933d6785f38fafbfd715))
* **team:** cancel Windows worker trees concurrently ([be927e4](https://github.com/eneekoruiz/helen/commit/be927e4ebc197f46459a169b82385886f1ec4af7))
* **test:** fallback to tsx runner in jsonOutput test when dist is not built ([172c6df](https://github.com/eneekoruiz/helen/commit/172c6dfb3886ab43bf9d8d1b7931be8ca6e59572))
* **windows:** normalize line endings and path separators for prompt indexes, skills and guardrails ([1916852](https://github.com/eneekoruiz/helen/commit/1916852ff5c644f6f82bfff1bd6a2bb69f55a559))


### Performance Improvements

* **ci:** add path filters to prevent doc edits from running tests ([f2b3daf](https://github.com/eneekoruiz/helen/commit/f2b3daf09f4bb7ebc1a14d7ba575252484970998))
* **ci:** remove 10x macos and 2x windows runners to eliminate billing overage ([b0c0eb1](https://github.com/eneekoruiz/helen/commit/b0c0eb162342063bcadf6f8270006f70324b83b6))

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
