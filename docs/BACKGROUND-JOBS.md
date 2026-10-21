# Background tasks on your own computer

HELEN can launch a separate Node worker for **read-only research and repository review**, using the native Codex or Claude Code CLI signed into your included subscription. The launching terminal can exit; another terminal or an agent connected through HELEN MCP can inspect the saved result later. The computer must remain awake and connected. Closing a browser does not power off the worker, but sleep, shutdown, a process supervisor or operating-system restrictions can interrupt it.

This version does not execute project commands or edit project code. A task requiring those actions returns a limitation rather than claiming it implemented them. It is a bounded job, not an indefinitely thinking daemon. It does not install OpenJarvis, start at boot, buy a VPS, schedule retries or connect messaging services.

## Start and inspect

Install a native CLI and sign in normally with ChatGPT or claude.ai. Build this checkout with `npm run build` before running its `dist/cli.js`; an installed HELEN package includes the worker. Windows requires native `codex.exe` or `claude.exe`, rather than a shell wrapper. Unsupported capabilities, native policy failures and unavailable subscription authentication block execution without an API fallback.

Windows resolves the provider from `PATH` and rejects an executable in the current project directory, so a project-local namesake is not treated as the installed CLI. From the project to review:

```powershell
helen jobs start --provider claude --subscription-only --claude-extra-usage-disabled --max-minutes 30 --max-turns 12 "Review this project's public API and propose the three most valuable improvements, grounded in the current source."
helen jobs start --provider codex --subscription-only --codex-credits-unavailable --max-minutes 30 "Research the tradeoffs of a Windows-only worker versus a VPS for bounded AI review tasks. Cite primary sources where available."
helen jobs list
helen jobs show <job-id>
helen jobs logs <job-id>
helen jobs stop <job-id>
```

Use `--prompt-file <file>` for a longer UTF-8 task instead of the positional prompt. Each command also supports the global `--json` flag. In this checkout, substitute `node dist/cli.js` for `helen`.

Starting returns a UUID and `queued` or `running` state immediately. Successful process launch is **not** successful task completion. Inspect the latest state and result. `completed` means the provider returned a schema-validated answer; the answer still requires the normal review and verification for its claims. It does not grant a project checkpoint or prove skill effectiveness.

## Questions and continuation

If the worker needs a material decision, it stores `needs_input` with `result.question` and `result.options`, then exits. When you return, the foreground agent should display that question in its **native interactive question form**, using the actual available tool (for example Codex `request_user_input_async` or Claude's exposed `AskUserQuestion`). HELEN MCP describes this contract in `helen_job_show`; `helen-reprompt` also documents it. Without a native question tool, the agent asks conversationally. HELEN does not fabricate a separate form or guess an answer while the interface is closed.

```powershell
helen jobs show <job-id>
helen jobs resume <job-id> --answer "Target developers using the stable release" --max-calls 2
```

A continuation makes a **new** bounded provider invocation with the original task, recorded answers and short previous summaries. It does not restore hidden model reasoning or promise provider-session continuity. Previous attempt files are preserved. A completed job cannot be resumed; start a new task for a new goal.

The default attempt budget is **one**. `--max-calls` counts invocations of the provider task, including explicit continuations, not internal tool calls or tokens. No attempt is automatically retried. Extending the budget requires explicit user authorization; recording the user's answer alone does not authorize extra consumption. Set a larger budget at start only when already authorized.

## Bounds and provider restrictions

| Bound | Meaning |
| --- | --- |
| `--max-minutes` | 1–240 minutes per attempt, default 30; includes authentication/capability checks. Cancellation/termination can add a short grace period. |
| `--max-calls` | 1–20 attempts per job, default 1; explicit resumption only. |
| `--max-turns` | 1–100, default 12; Claude's native turn cap. Codex is primarily bounded by elapsed time and output because one exec turn can contain many tool calls. |
| Output | Combined provider stdout/stderr is capped at 8 MiB per attempt; log inspection returns the last 64 KB of each file. |

HELEN removes inherited API/cloud credentials and application IPC from provider invocations, checks subscription authentication, and never switches to a paid API if execution fails. Claude requires the user's confirmation that **extra usage is disabled in the account**. Codex requires `--codex-credits-unavailable`: confirm **no available usage credits and automatic reload off** before using this flag. The host must use actual account evidence/human answers; an included-only preference is not confirmation of those settings. Missing confirmation blocks creation and the provider adapter before any process/model launch.

HELEN cannot verify or change account billing settings through the native CLI. OpenAI documents that Codex can consume available credits after included usage, and automatic reload can buy more credits; those credits are separate from API credits. Therefore ChatGPT authentication alone cannot establish included-only spending. [OpenAI credit documentation](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans).

Duration, turns and attempts are consumption controls, not a hard token quota or an independently audited billing guarantee. Do not enable background Codex jobs while credit/reload conditions are unknown or change. Older Codex records without the confirmation remain blocked; start a new explicitly confirmed job rather than rewriting their immutable definitions.

Codex runs with its native `read-only` sandbox and retained native permission restrictions. Shell execution, hooks, connected apps, configured MCP servers and verified native features that expose other execution paths are disabled for that invocation. This also removes Codex's usual local repository-reading route: provide the relevant source/document text in the prompt or `--prompt-file`, or use Claude for direct repository inspection. A missing source is a limitation or pending question, not verified review. Claude uses verified safe/restricted capabilities, disables hooks/customization/MCP, and exposes only `Read`, `Glob`, `Grep`, `WebSearch` and `WebFetch`. Unsupported native isolation blocks the job. Claude's tool restrictions are not a new operating-system sandbox supplied by HELEN. Neither provider receives write, shell, messaging or subagent tools from HELEN's background configuration.

The native providers can send the task and retrieved material to their services; research can also contact search/fetch endpoints. These are explicit provider calls, separate from HELEN's local parsing and tracking. Keep provider and project policies appropriate for the material you authorize it to read.

Before a Codex task, HELEN asks the native CLI to list MCP servers with the same isolation overrides, disables remaining managed entries that have supported names, and lists them again. Every remaining entry must report disabled. Invalid configuration, unsupported names or an enabled server block model invocation. These overrides do not modify the global configuration.

## Persistence and interruption

Records live under `.helen/jobs/<uuid>/`: immutable `job.json` and separate `attempt-0001/`, `attempt-0002/`, etc. Inputs, state, timestamps, provider version/session identifier when available, logs and results remain local. This directory has its own ignore rule. Logs can contain private task/source data; Unix file modes are restrictive, but HELEN does not configure Windows ACLs or encrypt these files. Metadata paths reject symbolic links/junctions, and corrupt records are listed as errors without hiding healthy jobs.

`stop` writes a cancellation request. The **live worker** terminates its own current provider child; HELEN never kills an old PID read from disk. If the worker disappears, inspection reports `interrupted`; inspect the logs before explicitly resuming. A reused/live PID is treated conservatively to avoid starting a duplicate provider task. Killing the worker externally can leave a provider child temporarily alive; prefer `jobs stop` and wait for its terminal state. Resumption is not an automatic rollback, and previous evidence can be stale if the repository changed.

MCP tools: `helen_job_start`, `helen_jobs_list`, `helen_job_show`, `helen_job_logs`, `helen_job_stop`, `helen_job_resume`. They do not mark HELEN plan steps complete. Starting/continuing work uses the authorization already supplied by the user; no host should silently launch a model merely to list jobs.

## Verification boundary

The regression suite launches a real detached Node worker and verifies completion **after its launching process exits**, alongside cancellation, interruption, continuation budgets, competing workers and metadata boundary checks. Provider adapter tests use controlled processes for quota/auth/policy/schema failures without consuming subscriptions. Actual native-provider runs are separate evidence; tests alone do not prove model answer quality or behavior after closing a particular desktop supervisor.

Native interfaces used: [Codex non-interactive execution](https://learn.chatgpt.com/docs/non-interactive-mode) and [Claude Code headless execution](https://code.claude.com/docs/en/headless). Required flags are checked against the installed CLI before a task invocation.

## Actual execution observed on 2026-10-07

| Provider | Completed observation | Evidence |
| --- | --- | --- |
| Claude Code 2.1.268 | Two bounded tasks used native `Read` and structured output on this repository. The first returned six correct package facts; the second verified package name/version after the final worker launch/environment correction. | `.helen/audit-results/2026-10-07-background-live.json` and `2026-10-07-background-live-final.json` |
| Codex CLI 0.160.1 | One model invocation returned all six requested facts from the supplied actual `package.json` snapshot correctly in under 120 words, with no tools used. | `.helen/audit-results/2026-10-07-background-codex-live.json` |

The launching CLI returned before each model job finished. A separate regression uses a real detached Node worker and verifies completion after its parent process exits. **Closing the Codex desktop application itself was not tested.** The host must remain awake; a supervisor may terminate descendants when it closes.

The first Codex attempt failed before model invocation because the adapter generated an invalid quoted MCP override. That attempt and its logs were retained. The corrected adapter passed the native MCP isolation probe and was explicitly resumed with an extended two-attempt budget; the second attempt completed. Codex emitted a diagnostic that code mode was unavailable with its host disabled, then completed the requested answer. The separate `sandbox windows` probe still failed with a local ACL error; success on this tool-disabled `exec` path does not prove editing tools work under that policy.

Codex included quota and zero available credits were observed through the account tool; the user confirmed automatic reload was off through a native question. The user also confirmed Claude extra usage was disabled. Both paths used subscription authentication without an API fallback. These are the observed controls, not an independent billing audit.

Exact metadata answers demonstrate these execution paths. They do not establish long-horizon research quality, skill advantage over baseline or effectiveness of the entire skill library. The separate [repository evaluations](REPOSITORY_EVALS.md) retain their original measured and unmeasured outcomes.

The final complete repository gate passed **557 tests with zero failures and two Windows platform skips** in 52 files. The focused worker/provider/evaluation controls passed **80/80**. Build, lint, formatting and prompt-library checks passed. The package dry run verified worker/runtime/commands/docs and the shared evaluation subscription helper among 500 shipped files, with private job/authentication records excluded. Consolidated local record: `.helen/audit-results/2026-10-07-background-closure.json`. These deterministic checks are distinct from the actual provider observations above.
