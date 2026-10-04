# Quality implementation and native calibration — 2026-10-04

Acceptance was defined before implementation in [QUALITY-ACCEPTANCE](QUALITY-ACCEPTANCE-2026-10-04.md). Functional checks and prompt-effectiveness evidence are separate.

## Native prompt observations

The user requested testing with this agent or Antigravity after Claude's weekly quota prevented live evaluation. Two fresh Codex specialist contexts compared three requests with and without an explicit `helen-reprompt` read. Both used `gpt-6.1-sol` at low reasoning effort. The development sequence first used the cheapest available specialist model; an observed omission of required orchestration instructions justified escalation.

Exact final observations are stored in [reprompt-observations.json](../evals/native/reprompt-observations.json). Deterministic checks cover original action, chat-only execution, exclusions, the supplied performance baseline, and concrete retry acceptance.

| Observed property | Baseline | With skill |
|---|---|---|
| Advice stays evaluation; implementation stays implementation | 3/3 | 3/3 |
| Chat-only stays free of claimed file edits | 3/3 | 3/3 |
| Checkout UI/provider and performance schema preserved | Present | Present |
| Concurrent retry acceptance and supplied latency/load retained | Present in proposed checks | Explicit functional acceptance |
| Cheapest-first specialists and further-improvement loop | Not explicit | Explicit in implementation briefs |

These are calibration cases reused during refinement, not a held-out benchmark. There were no independent repeated trials, confidence intervals, measured billing, coding outcomes, or natural-activation measurements. The baseline was already strong. No general effectiveness gain, perfect prompts, zero future confusion or cost saving is established. Snapshot regression checks preserve this evidence; they do not substitute for another model run.

These observations predate the user's adaptive-delegation clarification. They do not validate the revised routing policy; specialized agents are now optional according to expected value and total overhead.

The Claude pilot produced **zero valid pairs** because of provider quota exhaustion. Its report remains unmeasured; failed calls are not scored as quality losses. No further paid/provider calls were made after identifying that blocker.

## Runtime-aware efficiency

Reprompt clarification uses the invoking agent's native structured question form. Questions are selected from missing task context; supplied details and authorization are reused. A separate HTML editor was removed after the user clarified the intended interface. No custom reprompt UI is delivered.

`prompts show/flow --cache-ready` exports a stable shared prefix before varying task instructions. `--no-protocol` is appropriate only after shared instructions are already loaded. Actual cache configuration and hits belong to the invoking provider: inspect reported cache-read/cache-creation usage before claiming savings. [Anthropic prompt caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) describes these runtime requirements.

Specialist work is optional when its expected value outweighs total handoff and verification overhead. When delegation is worthwhile, choose the cheapest capable supported model; Flash is one option when exposed. Independent owners can run concurrently. A direct browser MCP is preferred when available; Chromium interaction and responsive checks still apply. Focused checks are for iteration; full repository gates remain required before completion.

## Concurrent changes

The worktree and fetched `origin/main` were inspected after the user's concurrent commit `85e90e6`. All seven new catalog IDs were retained. Invalid third-party Apple and renamed Marketing Skills installation targets were corrected without installing external tools. No reset, force push, or destructive merge was used.

## Final verification

The initial completion below was followed by an additional review and the user's adaptive-delegation clarification. The [follow-up record](AUDIT-FOLLOWUP-2026-10-04.md) supersedes its test count: **375 tests pass**, alongside build, typecheck, ESLint and HELEN library validation.

On Windows with Node 24.19.0: clean dependency installation, typecheck, ESLint, build, HELEN library validation and the full Vitest suite passed (**365 tests in 44 files**). `npm audit --audit-level=high` reported zero vulnerabilities. Hosted CI and its OS matrix were not run locally.

Focused-check regression coverage verifies scope reporting, path/runner rejection and preservation of full checkpoint evidence. Cache-ready exports share an identical prefix and retain the explicit protocol opt-out. Native reprompt routing is covered structurally; the updated native question interaction still depends on the invoking runtime and is not certified by that test.

All 12 installed Codex skills were synchronized after comparing their contents with the known repository baseline; no divergent installed files were overwritten. Pre-sync copies are retained locally. Changes remain reviewable in the worktree; this task did not push to GitHub.
