# HELEN Skill Evaluation Harness

HELEN evaluates skill quality by running standardized prompts against two environments:
1. **Baseline**: Clean project with no skill installed.
2. **With skill**: Project with the target skill installed in `.claude/skills/<skill>/`.

An LLM judge compares answers against predeclared criteria; optional deterministic assertions check exact observable output contracts independently. Failed execution is **unmeasured**, never a zero score. These chat-only cases measure response behavior and routing, not end-to-end repository implementation. Define acceptance first using [EVALUATION_PLAN.md](../docs/EVALUATION_PLAN.md).

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

Live runs require an explicit `--max-calls` budget and an authenticated Claude CLI supporting `claude auth status`. Local preflight prevents repeated missing-provider failures. The first baseline call gates concurrency so an initial quota refusal stops after one invocation. Authenticated status alone does not establish available quota.

`--force` reruns cached cases; model and content fingerprints prevent stale reuse. `--force-trigger` opts into a separately reported forced-skill condition; default runs avoid that extra invocation. Previous result versions are archived before replacement. Quota/authentication blockers stop retries and new calls.

The 2026-10-04 pilot encountered a provider weekly-limit refusal: zero valid pairs. Effectiveness and confusion rates remain unmeasured; do not retry until provider access changes.

```bash
# Dry run: view planned calls and call budget estimate
npm run evals -- --dry-run

# Run with custom repetitions and budget cap
npm run evals -- --runs 3 --max-calls 50 --skill helen-release

# Run a specific case subset
npm run evals -- helen-reprompt --model haiku --runs 3 --cases question-remains-question,explicit-exclusion-preserved --max-calls 28 --concurrency 2

# Generate report from already cached runs without network calls
npm run evals -- --report-only
```
