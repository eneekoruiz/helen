# Orchestrating agents with HELEN

HELEN coordinates several agents (Claude Code, Codex, Antigravity, subagents, or any CLI) on one tracked plan, and keeps their output from converging on the same average result. Three parts:

- **Team**: a work graph with parallel waves, claims with leases and tokens, handoffs and an autonomous runner (`helen team`).
- **Loops**: rubric-based scoring with evidence until the work really meets the bar, confirmed by a second agent (`helen loop`).
- **Directions**: distinct, seeded design directions and a deterministic check for template-looking front ends (`helen design`).

All state is in the project's `.helen/` folder, so any agent can resume and nothing depends on one conversation's memory.

## Team

```bash
helen apply launch --track          # a tracked plan
helen team graph                    # waves: what can run in parallel, what is ready or claimed
helen team run --agent claude       # or: --command "<program and arguments>" ; preview with --dry-run
```

**Waves.** Consecutive read-only steps (prompts with `modifies_code: false`, skills) form one wave that runs in parallel. A step that writes, and every checkpoint, is a wave of its own and waits for the previous one.

**Claims.** Before working on an item an agent claims it (`helen team claim [item] --agent <name>`), which gives it a lease (30 minutes by default; extend with `helen team heartbeat`). Writers declare the paths they will edit (`--paths src/api/**`) and overlapping claims are refused; a writer that declares nothing owns the whole tree. A lease that runs out makes the item available again.

**Tokens.** A claim returns a secret token; only its hash is stored. MCP sessions must present it (the session remembers it) to complete, extend, skip or release the item, so naming another agent is not enough. On the CLI, which is the operator's interface, `--token` is optional.

**Finishing.** `helen team complete <item>` records the step; a checkpoint needs a passing `helen check` (the project's own typecheck, lint, test and build) unless forced with a stated reason. `helen team skip <item> --reason ...` claims the item first, and MCP clients cannot skip a checkpoint unless the user started the server with `HELEN_MCP_ALLOW_FORCE=1`. `helen team release <item> --reason ...` gives it back.

**Handoffs.** `helen team handoff --to <agent|role:reviewer> --message ... [--files ...] [--next ...]` leaves context for another agent or role; `helen team inbox [--ack <id>]` reads it. Only the recipient can acknowledge a handoff. Handoffs live in `.helen/handoffs.jsonl`, apart from the rotating event log.

**Events.** `.helen/events.jsonl` records claims, completions, failures, handoffs and runs (`helen team events --type claim.* --limit 20`). It rotates at 4 MiB and keeps three archives.

**The runner.** `helen team run` claims each ready item, hands the worker a complete brief on stdin (and in `$HELEN_BRIEF_FILE`), keeps the lease alive, captures the answer as `.helen/work/<item>/result.md` for the next wave, and completes the item. It verifies checkpoints itself. It stops at anything that needs you: an external tool to install, a failing checkpoint, a worker that keeps failing. Several runs can share one plan: each has its own agent names, takes what it can claim and waits (`--wait`, 30 minutes by default) for what others hold. Ctrl-C (or SIGTERM) stops the workers and gives their claims back. Worker logs and captured results are redacted of secrets.

Options: `--concurrency` (parallel read-only workers, 1 to 16), `--ttl`, `--timeout` per worker, `--retries`, `--max-runs`, `--wait`, `--dry-run`.

The `claude` preset runs Claude Code in print mode with the narrowest tools each item needs (read-only items get Read, Glob and Grep; writers also get Edit and Write with `acceptEdits`).

## Loops

A loop scores a piece of work against a rubric until it meets the bar:

```bash
helen loop rubrics                          # general, design, code, copy, security, release
helen loop start design --subject "landing page" --author claude-1
helen loop score <id> --file scores.json    # every criterion: score 0-5 and concrete evidence
helen loop status <id>
```

Each criterion has a weight, a question to ask and what counts as evidence. Scores need specific evidence (generic verdicts, echoes of the criterion and the same sentence on three criteria are rejected). The loop answers with a verdict: `continue` with the weakest criteria to work on next, `stalled` (two rounds with little gain: change the approach), `exhausted`, or `converged`. A passing round by the author is `needs-independent-score`: done means a different agent confirmed it. Rubrics are in `docs/rubrics/`.

## Directions and the template check

To keep generated front ends from looking alike, start from a direction instead of the model's default taste:

```bash
helen design direction --brief "cooperative bakery in Bilbao" --count 3
helen design check src/ --fail-on warn    # also fail on warnings (default: errors only)
```

`direction` combines seven curated axes (concept, type, color, layout, motion, imagery, voice) into distinct directions, seeded from the brief (repeatable), with palettes that meet WCAG contrast. `check` is a deterministic detector of template tells: default typefaces, purple gradients, three-card feature grids, uniform radius and shadow, glassmorphism, emoji icons, cliché copy, placeholder content, unsourced claims, motion without reduced-motion support, images without alt text, missing `lang` or viewport, and low contrast. The axes are in `docs/directions.json`.

## MCP

`helen mcp` exposes the same functions as tools: `helen_team_*` (graph, claim, brief, heartbeat, complete, skip, release, handoff, inbox, events), `helen_loop_*` and `helen_design_*`, confined to the project directories the server allows (`--root` or `HELEN_MCP_ROOTS`).

The code is in `src/core/orchestrate.ts`, `src/core/claims.ts`, `src/core/handoffs.ts`, `src/core/teamRun.ts`, `src/core/loop.ts`, `src/core/direction.ts` and `src/core/designCheck.ts`.

**Background jobs over MCP.** `helen_job_start` and `helen_job_resume` launch detached model CLIs, so an MCP client can only use them when the user started the server with `HELEN_MCP_ALLOW_JOBS=1`.
