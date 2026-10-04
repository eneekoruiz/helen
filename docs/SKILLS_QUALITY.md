# Skill quality

Generated from stored observations; report generation makes no provider calls.
Quality is **unmeasured** when execution or judging fails. Historical observations do not certify the current skill version.
Activation counts exclude failed observations and remain separate from answer effectiveness. Forced activation is not natural routing.

| Skill | Evidence | Valid pairs / attempted | Independent cases | Natural trigger | False activation | Forced runs | Baseline | With skill | Delta 95% CI | Errors |
|---|---|---|---|---|---|---|---|---|---|---|
| helen-apply | UNMEASURED | 0/6 | 0 | unknown | unknown | 12 | unknown | unknown | unknown | 24 |
| helen-audit | UNMEASURED | 0/0 | 0 | unknown | unknown | 0 | unknown | unknown | unknown | 0 |
| helen-backend | UNMEASURED | 0/0 | 0 | unknown | unknown | 0 | unknown | unknown | unknown | 0 |
| helen-copy | UNMEASURED | 0/0 | 0 | unknown | unknown | 0 | unknown | unknown | unknown | 0 |
| helen-design | UNMEASURED | 0/0 | 0 | unknown | unknown | 0 | unknown | unknown | unknown | 0 |
| helen-implementa | UNMEASURED | 0/6 | 0 | unknown | unknown | 9 | unknown | unknown | unknown | 24 |
| helen-knowledge | UNMEASURED | 0/6 | 0 | unknown | unknown | 12 | unknown | unknown | unknown | 24 |
| helen-release | HISTORICAL | 1/7 | 1 | 1/2 | unknown | 11 | 80% (descriptive) | 100% (descriptive) | unknown | 24 |
| helen-reprompt | UNMEASURED | 0/6 | 0 | unknown | unknown | 0 | unknown | unknown | unknown | 24 |
| helen-router | UNMEASURED | 0/6 | 0 | unknown | unknown | 12 | unknown | unknown | unknown | 24 |
| helen-security | UNMEASURED | 0/6 | 0 | unknown | unknown | 12 | unknown | unknown | unknown | 24 |
| helen-strategy | UNMEASURED | 0/6 | 0 | unknown | unknown | 12 | unknown | unknown | unknown | 24 |

## Interpretation and limits

- UNMEASURED: no valid paired observations. This is not a zero quality score and not statistical noise.
- HISTORICAL: observations lack the current content fingerprint; rerun before drawing conclusions about edited skills.
- INSUFFICIENT: fewer than two independent cases. Descriptive means are not a confidence claim.
- INCONCLUSIVE: the paired case-mean confidence interval includes zero; this does not prove equivalence.
- MEASURED: a delta was distinguishable from zero in these cases; it is not a guarantee of future results.
- Baseline and skill scores use only matching successful pairs. Case means are the independent unit; repeated trials do not inflate task coverage.
- Student-t intervals assume independent case means and approximately normal errors; a two-case pilot is exploratory and cannot establish general effectiveness.
- Chat-only grades measure answer criteria. They do not verify changes to a real repository or specialized-agent execution.
- A forced skill answer and naturally selected answer are different experimental conditions; forced trial counts are explicit.
- No costs or tokens are inferred from language or prompt length. Unknown provider telemetry remains unknown.

- Error counts are recorded failed stages, not billed model requests. Historical runners also counted unavailable judges after execution failed.

## Forced skill condition (separate from natural selection)

| Skill | Evidence | Valid pairs / attempted | Independent cases | Baseline | Forced skill | Delta 95% CI | Errors |
|---|---|---|---|---|---|---|---|
| helen-apply | UNMEASURED | 0/12 | 0 | unknown | unknown | unknown | 60 |
| helen-audit | UNMEASURED | 0/0 | 0 | unknown | unknown | unknown | 0 |
| helen-backend | UNMEASURED | 0/0 | 0 | unknown | unknown | unknown | 0 |
| helen-copy | UNMEASURED | 0/0 | 0 | unknown | unknown | unknown | 0 |
| helen-design | UNMEASURED | 0/0 | 0 | unknown | unknown | unknown | 0 |
| helen-implementa | UNMEASURED | 0/9 | 0 | unknown | unknown | unknown | 45 |
| helen-knowledge | UNMEASURED | 0/12 | 0 | unknown | unknown | unknown | 60 |
| helen-release | HISTORICAL | 1/11 | 1 | 100% (descriptive) | 100% (descriptive) | unknown | 49 |
| helen-reprompt | UNMEASURED | 0/0 | 0 | unknown | unknown | unknown | 0 |
| helen-router | UNMEASURED | 0/12 | 0 | unknown | unknown | unknown | 60 |
| helen-security | UNMEASURED | 0/12 | 0 | unknown | unknown | unknown | 60 |
| helen-strategy | UNMEASURED | 0/12 | 0 | unknown | unknown | unknown | 60 |

## Reported execution metrics

| Skill | Tokens | Reported cost USD | Sum of call durations ms | Model | Observation date |
|---|---|---|---|---|---|
| helen-apply | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-audit | unknown | unknown | unknown | unknown | unknown |
| helen-backend | unknown | unknown | unknown | unknown | unknown |
| helen-copy | unknown | unknown | unknown | unknown | unknown |
| helen-design | unknown | unknown | unknown | unknown | unknown |
| helen-implementa | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-knowledge | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-release | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-reprompt | unknown | unknown | unknown | haiku | 2026-10-04 |
| helen-router | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-security | unknown | unknown | unknown | sonnet | 2026-10-01 |
| helen-strategy | unknown | unknown | unknown | sonnet | 2026-10-01 |

## Answer token comparison

Compare identical task/model conditions; judge tokens are overhead, not answer-generation cost. Older experiments without per-condition telemetry remain unknown.

| Skill | Baseline answer tokens | Natural skill answer tokens | Forced answer tokens | Judge tokens |
|---|---|---|---|---|
| helen-apply | unknown | unknown | unknown | unknown |
| helen-audit | unknown | unknown | unknown | unknown |
| helen-backend | unknown | unknown | unknown | unknown |
| helen-copy | unknown | unknown | unknown | unknown |
| helen-design | unknown | unknown | unknown | unknown |
| helen-implementa | unknown | unknown | unknown | unknown |
| helen-knowledge | unknown | unknown | unknown | unknown |
| helen-release | unknown | unknown | unknown | unknown |
| helen-reprompt | unknown | unknown | unknown | unknown |
| helen-router | unknown | unknown | unknown | unknown |
| helen-security | unknown | unknown | unknown | unknown |
| helen-strategy | unknown | unknown | unknown | unknown |

Historical files for retired skills and archived previous versions remain in `evals/results`; they are excluded from the current-skill table.

Acceptance criteria and the live evaluation procedure: [EVALUATION_PLAN.md](EVALUATION_PLAN.md).

## Provider blockers

- helen-reprompt: **quota**. Resolve the provider quota or authentication before rerunning; authentication status alone does not establish usable quota.

Inspect the plan without provider calls: `npm run evals -- helen-reprompt --dry-run`.
After access changes, rerun the same bounded experiment: `npm run evals -- helen-reprompt --model haiku --runs 3 --cases question-remains-question,explicit-exclusion-preserved --max-calls 28 --concurrency 2 --force`.
