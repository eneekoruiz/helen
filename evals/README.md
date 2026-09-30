# HELEN Skill Evaluation Harness

HELEN evaluates skill quality by running standardized prompts against two environments:
1. **Baseline**: Clean project with no skill installed.
2. **With skill**: Project with the target skill installed in `.claude/skills/<skill>/`.

An LLM judge compares the answers against concrete criteria and grades both outputs. Runs are repeated across multiple iterations ($N$) to calculate sample variance, standard deviation, and 95% confidence intervals using Student's t-distribution.

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
2. **Confidence Intervals**: 95% two-tailed Student's t-interval ($df = N - 1$).
3. **Paired Delta**: $\Delta_i = \text{withSkill}_i - \text{baseline}_i$.
4. **Noise Detection**: If the 95% confidence interval of $\Delta$ includes $0$ ($CI_{lower} \le 0 \le CI_{upper}$), the difference is labeled **Noise** and no letter grade (A/B/C) is assigned.
5. **Grades**:
   - **A**: $\Delta \ge +20\%$ and With-Skill score $\ge 85\%$.
   - **B**: With-Skill score $\ge 75\%$.
   - **C**: Below $75\%$ or negative delta.
   - **Noise**: Confidence interval crosses zero.

---

## CLI Options

```bash
# Dry run: view planned calls and call budget estimate
npm run evals -- --dry-run

# Run with custom repetitions and budget cap
npm run evals -- --runs 3 --max-calls 50 --skill helen-release

# Run a specific case subset
npm run evals -- --cases rc,skip-tests

# Generate report from already cached runs without network calls
npm run evals -- --report-only
```
