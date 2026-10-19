# Executable repository evaluations

The 2026-10-08 continuation below adds an independent-domain completed Claude pair to the two original related JavaScript pairs. Historical incomplete and blocked observations remain preserved.

This evidence track measures actual edits and executable outcomes, separately from chat-only answer grades and natural skill selection. The current harness supports Codex and Claude Code. It contains two related JavaScript tasks for `helen-implementa`; it does not certify all twelve skills or establish a statistically reliable improvement.

## Reproduce without additional spending

```sh
# Local plan only: no authentication or model calls.
npm run evals:repo

# Only after quota is available, Codex credits are zero/reload off and Claude extra usage is disabled.
npm run evals:repo -- --live --subscription-only --codex-credits-unavailable --claude-extra-usage-disabled --providers codex,claude --runs 1 --max-calls 8
```

Node 22+ is required for permission-limited grading. Authenticate Codex with ChatGPT and Claude Code with the Claude subscription. The runner checks the authentication mode locally, removes API/cloud billing credentials from child environments, forces subscription login modes and never falls back to an API key. For each selected provider, account confirmation is required before creating records or launching any child: `--claude-extra-usage-disabled` records disabled extra usage, and `--codex-credits-unavailable` records no available usage credits and automatic reload off. Use actual account evidence and human confirmation; the runner cannot independently inspect those billing settings. ChatGPT authentication alone does not prevent spending available credits after included usage. See the [OpenAI credit documentation](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans). Provider-reported list-price telemetry is not an invoice or evidence of additional spending.

Calls are sequential. `--max-calls` limits CLI invocations; an invocation can contain several model/tool turns. Authentication, quota or native execution failures stop that provider without an automatic retry. The runner changes no global agent settings and does not bypass a native execution policy. Dry runs remain available when providers are blocked.

`--max-minutes N` sets the per-attempt native process deadline. It accepts one integer from 1 to 30 and defaults to **3 minutes**, preserving the original 180,000 ms behavior. Invalid, missing or repeated values fail before output creation or provider processes. The same deadline applies to baseline and skill conditions; changing it creates a new frozen experiment, not a reinterpretation of earlier timeouts. A larger budget must be selected explicitly, and a timeout never triggers an automatic extension or retry.

```sh
# Inspect a six-minute-per-condition holdout plan without provider calls.
npm run evals:repo -- --suite implementation-holdout --providers claude --runs 1 --max-calls 2 --max-minutes 6

# Included-only execution example; requires the stated account conditions and a reserved invocation budget.
npm run evals:repo -- --live --subscription-only --claude-extra-usage-disabled --suite implementation-holdout --providers claude --runs 1 --max-calls 2 --max-minutes 6
```

Each run gets a new `.helen/repo-evals/<date>-<uuid>` directory. `results.json`, raw local traces, stderr and saved implementations preserve evidence. Do not publish raw traces without reviewing them. Previous directories are never overwritten. The record fingerprints the harness, frozen cases and evaluated skill body, and records available provider versions, model/usage data and duration. Model aliases can change across dates; compare resolved versions where available.

`manifest.json` freezes the selected cases, call/time budgets and account confirmations. The fingerprint also includes the selected invocation/time configuration. Each attempt writes `attempt-start.json` with its exact native arguments, prompt, version and timeout, then immutable execution, grade and observation files before cleanup. Immutable numbered checkpoints preserve progress; `final-results.json` preserves final or interrupted status, while `results.json` remains the compatible latest snapshot. Windows cleanup validates owned temporary paths and retries transient locks at most five times with one second of total backoff. A persistent cleanup warning is retained separately and does not invalidate an otherwise valid outcome.

On Windows, the isolated Codex invocation retains the configured native `elevated` or `unelevated` sandbox mode from the user's configuration without changing it globally. Removing user instructions from a comparison must not remove the runtime setup needed to execute tools.

## What constitutes a result

- Both conditions receive the same task, public tests, tool permissions and write boundaries in separate fixtures. The skill condition explicitly reads the bundled skill file. This measures explicit instruction use, not spontaneous routing.
- Hidden executable checks run outside the writable fixture. They cover concurrent calls, repeated requests, mismatched payloads, independent keys and retry after failure. Scope checks detect additional files and altered controls.
- `outcomePassed` records code behavior; `scopeOk` records allowed writes. A completed workflow passes only when both pass. The skill condition additionally needs a successful correlated read of the intended skill file.
- Grading must reach its completion marker; an early `process.exit(0)` cannot masquerade as a successful check. Node permissions limit filesystem access, writes and subprocesses. They are not a hardened sandbox against adversarial generated code and do not provide network isolation.
- Failed execution has `passed: null`, even when a partial artifact can be checked separately. Only complete, comparable observations form a pair. A completed pilot is still not proof of a positive effect.

The checkout case motivated a scope-preservation correction on 2026-10-05. It is now a regression case, not a previously unseen holdout. The second task has related concurrency behavior; broader tasks and repeated independent cases remain necessary.

## 2026-10-05 live observation

Included subscription usage only was authorized for Codex and Claude Code; the user confirmed that Claude extra usage was disabled. The revised run attempted three invocations, then stopped:

| Provider / condition    | Execution                                                            | Executable artifact                                         | Whole workflow                                              |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Codex / baseline        | Native Windows execution policy blocked tools                        | Original defect remains                                     | Unmeasured                                                  |
| Claude / baseline       | Completed                                                            | Saved implementation passes hidden concurrency/retry checks | Failed: created `verify.mjs` outside the one-file allowlist |
| Claude / explicit skill | Skill file read successfully; subscription limit interrupted the run | Saved partial implementation passes the same hidden checks  | Unmeasured; execution incomplete                            |

**Zero valid pairs. No effectiveness improvement has been demonstrated.** Claude reported a session limit resetting at 01:00 Europe/Madrid. Codex reported native policy/sandbox failures. Do not repeat an unchanged blocked experiment or spend beyond the included quota.

Local raw evidence: `.helen/repo-evals/2026-10-05-4b61e874-c40a-442d-9936-1138c479cc4a/results.json`, its two Claude trace directories and `posthoc-artifact-checks.json`. The post-hoc file checks the saved implementations only; it does not repair scope violations or create valid pairs. Earlier exploratory Codex traces were initially misclassified as task failures; their policy errors make them unsuitable for efficacy conclusions. They remain preserved as diagnostic evidence.

The observed extra file led to a narrow `helen-implementa` correction: user write boundaries cover temporary verification scripts and discovery artifacts too. Future identical prompts explicitly permit inline checks without creating files. These revisions invalidate direct comparison with the old prompt; retain the original evidence rather than relabeling it as current success.

## 2026-10-06 continuation

After the included Claude session quota became available again, the unexecuted cache task and the checkout regression were completed. The current runner preserves the inherited native permission profile; Codex was tried once under that corrected configuration and still reported a policy block. No permission bypass or unchanged follow-up retry was attempted.

| Claude Code task                     | Baseline | Explicit skill | Skill read / write scope | Evidence role                                                        |
| ------------------------------------ | -------- | -------------- | ------------------------ | -------------------------------------------------------------------- |
| Retryable single-flight cache        | Passed   | Passed         | Successful / respected   | Previously unexecuted task; related to the original concurrency case |
| Concurrent checkout and failed retry | Passed   | Passed         | Successful / respected   | Regression after the scope-preservation correction                   |

Both conditions completed real edits and hidden executable checks, including concurrency and failed retries. Model: `claude-sonnet-5`; Claude Code version: `2.1.268`. There are now **two complete Claude pairs**, with descriptive success rates of **100% baseline and 100% with skill** in this small sample. **No improvement over baseline has been demonstrated.** One case motivated a revision and the two tasks share a mechanism; these results cannot establish generalization across skills or providers. Codex remains unmeasured.

Local records: `.helen/repo-evals/2026-10-06-6d33026d-5536-4de2-9b8e-dca438b8ccf0/results.json` (cache pair plus Codex blocker) and `.helen/repo-evals/2026-10-06-c0f28457-4057-4f4e-9971-996a45f38786/results.json` (completed checkout regression). Five CLI invocations were used in this continuation: one blocked Codex call and four completed Claude calls. Subscription authentication and the no-API-fallback constraint were preserved.

A final one-call Codex diagnostic preserved the user's configured Windows sandbox mode (`elevated`) explicitly as well as the inherited permission profile. It still returned a native execution-policy block. Evidence: `.helen/repo-evals/2026-10-06-995ac1c0-9b1a-4f96-85e1-47fc9d34a262/results.json`. This brings the continuation total to six invocations; no further unchanged Codex retry was made. Successful cross-provider comparisons still require resolving the external native execution blocker.

## 2026-10-07 background execution observation

A separate Codex background invocation completed successfully with shell, MCP and other execution tools disabled, using the actual package snapshot supplied in its prompt. Its six requested facts matched `package.json`. Claude also completed two bounded background metadata reads using native `Read` and structured output. These are execution-path checks, **not baseline-versus-skill comparisons**: they do not change the effectiveness results above or resolve Codex's editing-fixture policy block. The launching CLI exited before each worker finished; closing the desktop application itself was not tested. See [BACKGROUND-JOBS.md](BACKGROUND-JOBS.md) for implementation, dated evidence and limits.

## Native visual clarification

The skills and shared execution protocol now instruct agents to use an available native question tool when a missing preference, constraint or acceptance decision affects the task. They reuse prior answers and proceed without a questionnaire when context suffices. If the current mode lacks the tool, conversational clarification is the fallback.

During this actual Codex desktop task, a native structured form collected two decisions: evaluate **Codex and Claude Code from the start**, and use **only included quota, with no extra spending**. Those answers controlled the implementation and live calls. This is a production interaction observation, not a controlled comparison or proof that every skill/app asks appropriately.

Headless CLI trials cannot establish native visual question behavior. For each application, observe an essential-missing-detail case and a fully specified control case. Record tool availability, actual form invocation, answer incorporation and unnecessary questioning. Claude Code interactive behavior and Antigravity native questions remain unverified. Antigravity was found installed locally; no equivalent automated evaluation was completed.

## Coverage still needed

| Skills            | Outcome evidence required beyond the current pilot                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| implementa        | Diverse unseen repository tasks; complete paired runs in both providers; no scope regression                    |
| backend, security | Contract/invariant tests and seeded exploit/recovery checks on real edited fixtures                             |
| audit             | Correct prioritized findings on seeded repositories; false-positive and missed-defect review                    |
| apply, router     | Correct workflow selection and execution from different repository states                                       |
| release           | Isolated release readiness, failing CI refusal and reproducible package/handoff checks                          |
| knowledge         | A fresh agent successfully performs onboarding/recovery using the produced documentation                        |
| design            | Interactive browser behavior, accessibility and human usability review of the resulting interface               |
| copy, strategy    | Blind task-specific review and actual user/business outcomes where conversion or prioritization claims are made |
| reprompt          | Native interactive clarification and preserved scope across ambiguous and sufficiently specified tasks          |

Acceptance tests can establish behavior in the tested sample. They cannot guarantee universally good agent output, improved conversion or an impeccable system. Preserve failures, use held-out work, and keep the public quality status unmeasured until the required evidence exists.

## 2026-10-08 implementation holdout continuation

The independent-domain `immutable-safe-object-patch` case was executed with Claude Code `2.1.268`, native model `claude-sonnet-5`, included subscription authentication and extra usage confirmed disabled. Only `patch.mjs` was writable. Hidden executable checks cover immutable success, atomic failure, deep copying, unsafe/malformed/missing paths and unchanged fixture controls. No grader, task or hidden check was relaxed after observing a result.

The initial three-minute attempt left a passing partial implementation but timed out, followed by an owned temporary-directory cleanup error. This exposed a runner recovery defect: cleanup could prevent the final report. The corrected runner saves observations before cleanup, validates owned cleanup targets, records warnings, keeps immutable checkpoints and finalizes interrupted/blocked attempts. A fresh three-minute comparison then completed baseline but timed out in the skill condition. Both saved patches passed executable checks, but the incomplete skill execution makes that comparison ineligible. Neither historical attempt was reclassified as complete.

A separately frozen six-minute comparison completed **both conditions**, with the same budget, task and hidden checks. The explicit skill was successfully read, write boundaries were respected, and no cleanup warning or provider blocker occurred. Baseline wall duration was **167,190 ms**; with skill it was **76,421 ms**. This is an observed difference in one pair, with provider cache/order/variance limitations; it does not establish repeatable time or cost savings.

There are now **three complete Claude editing pairs across three tasks**, with **3/3 accepted baseline and 3/3 accepted with skill**. The new patch task broadens the domains beyond the related checkout/cache mechanism, but has earlier exposure during the timed-out attempts. This is correct task behavior, not proof of superior quality or effectiveness of all skills. Codex editing remains blocked by its native policy and was not relaunched unchanged.

Private local evidence:

- `.helen/repo-evals/2026-10-07-0dc7291c-69ed-4192-91a1-0f4ad08a0708`: original timeout/cleanup failure with partial evidence.
- `.helen/repo-evals/2026-10-07-8b03f319-96a6-47fb-8985-2e251a47627c`: repaired runner, three-minute budget, baseline complete and skill timed out; final evidence retained, no cleanup warning.
- `.helen/repo-evals/2026-10-07-3c4e9e31-03be-4afb-af21-f1b585373b6d`: six-minute budget, both executions and hidden/scope checks pass, skill read observed, one valid pair. `results.json` and immutable `final-results.json` retain the final state.

Folder dates use UTC; the continuation occurred on 8 October in Europe/Madrid. Source/skill changes and budget changes have distinct fingerprints. Native telemetry, screenshots/forms, real editing and rubric reviews remain separate evidence tracks.
