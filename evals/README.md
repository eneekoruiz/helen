# HELEN Skill Evaluation Harness

HELEN evaluates skill quality by running standardized prompts against two environments:
1. **Baseline**: Clean project with no skill installed.
2. **With skill**: Project with the target skill installed in `.claude/skills/<skill>/`.

An LLM judge compares answers against predeclared criteria; optional deterministic assertions check exact observable output contracts independently. Failed execution is **unmeasured**, never a zero score. These chat-only cases measure response behavior and routing, not end-to-end repository implementation. Define acceptance first using [EVALUATION_PLAN.md](../docs/EVALUATION_PLAN.md).

Executable code edits in Codex and Claude Code use the separate `npm run evals:repo` runner. See [REPOSITORY_EVALS.md](../docs/REPOSITORY_EVALS.md) for its subscription-only budget, independent outcome checks, current blockers and interactive clarification procedure. Its pilot results are not combined with chat-only grades.

---

## Eval Case Specification Schema

Evaluation cases are stored in `evals/<skill-name>.json`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "skill": "helen-release",
  "cases": [
    {
      "id": "rc-readiness",
      "prompt": "Tests pass locally but 2 fail in CI. Can we tag v2.0.0 today? Answer in chat only; do not modify or create files.",
      "expectTrigger": true,
      "criteria": [
        "Gives a clear verdict that it is not release-ready (FAIL or equivalent)",
        "Treats failing CI tests as a blocker",
        "Gives the smallest concrete next actions"
      ]
    },
    {
      "id": "generic-chat-negative",
      "prompt": "What is the capital of France? Answer in chat only; do not modify or create files.",
      "expectTrigger": false,
      "criteria": [
        "Answers Paris directly without mentioning software releases"
      ]
    }
  ]
}
```

### Properties

Cases may optionally define `checks`: literal `includes`/`excludes` assertions with a `value` string, or `json-equals` assertions with `path` and expected JSON `value`. Specify the exact output contract in the prompt before requiring exact output. A failed assertion is a measured task failure; missing execution remains unmeasured.

| Field | Type | Description |
|---|---|---|
| `skill` | `string` | Must match the file name (`<skill>.json`) and a valid folder in `skills/<skill>/`. |
| `cases` | `Array<Case>` | List of evaluation scenarios (target: 10 per skill). |
| `case.id` | `string` | Unique identifier within the file (`[a-z0-9_-]+`). |
| `case.prompt` | `string` | User prompt sent to the agent. Must include safety instructions (`Answer in chat only; do not modify or create files.`). |
| `case.expectTrigger` | `boolean` (optional, default: `true`) | When `false`, this is a **negative case**. Evaluates false positive rate where the agent should NOT load the skill. |
| `case.criteria` | `string[]` | Non-empty list of criteria judged by the LLM evaluator. Must assess concrete output quality, not simply quote the skill's instructions. |

---

## Statistical Methodology

1. **Runs per Case (`--runs N`)**: Each case runs $N$ times (default: 3).
2. **Valid Pairs**: Only matching successful baseline/skill observations contribute to a paired delta. Judge grades map to unique criterion indices.
3. **Independent Cases**: Average valid paired runs within each case; case means are the independent unit for Student-t intervals. Multiple trials on one case do not establish task coverage.
4. **Evidence Status**: UNMEASURED (no valid pairs), HISTORICAL (old/missing content fingerprint), INSUFFICIENT (one independent case), INCONCLUSIVE (delta interval includes zero), or MEASURED. No letter grades or perfection claims.
5. **Activation**: Natural routing is separate from effectiveness. Optional forced activation is a distinct reported condition.
6. **Telemetry**: Record provider-reported tokens/costs/durations. Unknown telemetry stays unknown; costs and savings are not inferred from language. CLI-call budgets count invocations, which may include multiple internal model/tool turns.
7. **Acceptance Exit Status**: Requested current pairs, all with-skill criteria and expected natural activation must pass. Otherwise the live runner exits nonzero even though the report is written.

---

## CLI Options

Live runs require an explicit `--max-calls` budget, `--subscription-only`, confirmed `--claude-extra-usage-disabled` and Claude CLI authentication through `claude.ai`. API/cloud authentication is rejected, inherited billing credentials are removed, and task/judge calls force subscription login. The account confirmation is a real user answer, not an independently verified billing setting. Local preflight prevents repeated missing-provider failures. The first baseline call gates concurrency so an initial quota refusal stops after one invocation. Authenticated status alone does not establish available quota.

Compatible model and content fingerprints let interrupted cases resume with all prior observations retained. `--runs N` targets N valid pairs: only missing pairs are attempted, and failed attempts remain visible. `--force` reruns selected cached cases and archives displaced evidence even when the fingerprints match. `--force-trigger` opts into a separately reported forced-skill condition; default runs avoid that extra invocation. Quota/authentication blockers stop retries and new calls.

One live runner owns the result directory at a time. Overlapping live invocations fail before authentication or provider calls, preventing duplicate spend and result replacement. Dry-run and report-only remain available. After an unexpected process termination, confirm that the PID reported by the lock is no longer running before removing `evals/results/.run-skill-evals.lock` and resuming.

The 2026-10-04 pilot encountered a provider weekly-limit refusal: zero valid pairs. Effectiveness and confusion rates remain unmeasured; do not retry until provider access changes.

```bash
# Dry run: view planned calls and call budget estimate
npm run evals -- --dry-run

# Run with custom repetitions and budget cap
npm run evals -- --subscription-only --claude-extra-usage-disabled --runs 3 --max-calls 50 --skill helen-release

# Run a specific case subset
npm run evals -- helen-reprompt --subscription-only --claude-extra-usage-disabled --model haiku --runs 3 --cases question-remains-question,explicit-exclusion-preserved --max-calls 28 --concurrency 2

# Generate report from already cached runs without network calls
npm run evals -- --report-only
```
