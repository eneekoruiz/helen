# Skill quality

The generated tables below describe the original answer-evaluation track. They are not a summary of the newer executable repository and frozen specialty pilots. See the dated observations at the end of this document and [the current closure](CIERRE-2026-10-08.md) for their distinct outcomes and limitations.

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

Executable repository outcomes and interactive clarification are separate evidence tracks: [REPOSITORY_EVALS.md](REPOSITORY_EVALS.md). Chat-only grades do not certify either track.

## Provider blockers

- helen-reprompt: **quota**. Resolve the provider quota or authentication before rerunning; authentication status alone does not establish usable quota.

Inspect the plan without provider calls: `npm run evals -- helen-reprompt --dry-run`.
After access changes, rerun the same bounded experiment: `npm run evals -- helen-reprompt --model haiku --runs 3 --cases question-remains-question,explicit-exclusion-preserved --max-calls 28 --concurrency 2 --force`.

## Frozen specialty observations, 2026-10-07–08

These are supplied-source, tool-disabled answers with literal skill-text injection, not native skill selection or actual repository repairs. Each run freezes its own skill and grader hashes. The skills have subsequently changed; historical scores do not certify the latest instructions. Completed responses that fail the rubric remain failures, rather than infrastructure errors or observations removed from the denominator.

| Provider/run | Cases | Baseline accepted | Skill accepted | Comparable native pairs | Interpretation |
| --- | --- | --- | --- | --- | --- |
| Claude `15360487-2b4b-475b-a8c8-1f7768cffb79` | Audit, security, fully specified reprompt | 2/3 | 1/3 | 3, native `claude-sonnet-5` | This small pilot shows no advantage. Audit duplicated a defect and security cited the wrong source line. |
| Codex `f50e0d6e-4ec2-4ef5-b36d-8097453299b7` | Same three acceptance cases | 2/3 | 1/3 | 0; actual model identity unavailable in native envelopes | Six completed graded answers; no eligible comparative model pairs and no superiority claim. |
| Claude `acbe6969-ed5c-4d1b-b553-73c4cc315a06` | Reserved audit, ambiguous reprompt, recovery runbook | 0/3 | 1/3 | 3, native `claude-sonnet-5` | The ambiguous reprompt passes with skill and fails without it. Audit/documentation scores require the grading review described below. |

The Codex run used 76,637 native input/output tokens across all six attempts, with zero tool events and no observed writes. The planned model `gpt-6.1-sol` is configuration evidence, not a verified native model identity. Its intentionally disabled Code Mode startup notice is retained separately from errors. Security passed in both conditions. Audit reported premature success and swallowed failure separately even though one awaited failure-propagating correction removes both symptoms. The reprompt skill response retained the requested behaviors in acceptance, but its goal field only named the retry fix and omitted the charge/idempotency outcome; the frozen field-specific rubric rejected it. This grading limitation is visible and the result remains unchanged.

The audit and reprompt instructions were narrowly revised to check overlapping failure paths and put an observable behavior in the goal. That is an implemented correction to guidance, not evidence that future agents will comply. Frozen fixtures and prior reports were preserved. The earlier Claude run used 52,518 normalized native tokens; cache fields were included according to Claude's separate input counters. Human assistance and monetary spending are not inferred from these counters.

Local immutable report folders are `.helen/audit-results/specialty-v1-2026-10-07T13-05-54.548Z-15360487-2b4b-475b-a8c8-1f7768cffb79` and `.helen/audit-results/specialty-v1-2026-10-07T22-13-07.267Z-f50e0d6e-4ec2-4ef5-b36d-8097453299b7`. They are private checkout evidence and excluded from the npm package. The outcome importer validates bounded snapshots and native traces before recording results, keeps unknown models as null and excludes them from matching pairs. Same-owner files and hashes do not independently authenticate an execution.

Actual editing results remain a separate track in [REPOSITORY_EVALS.md](REPOSITORY_EVALS.md). Actual foreground native-question behavior remains a separate track in [CAPABILITIES.md](CAPABILITIES.md). No pilot establishes the effectiveness of all twelve skills or a statistical quality/cost improvement.

The second Claude pilot used 50,012 normalized native tokens. Its ambiguous case is one favorable frozen-rubric comparison, with higher measured token use in the skill condition; it establishes neither token savings nor general effectiveness. Two grading confounds were found by examining the actual responses: both recovery runbooks explicitly state that `--force` and `--all` do not exist, but the forbidden-substring check treats that caution as a recommendation. The audit skill response has the correct two findings, locations and severity, yet its phrase "verify containment" fails a verb regex requiring "reject", "check" or "validate". These are limitations of the evaluator, not independently established agent defects. The original failing grades remain immutable and visible. A separately versioned supplemental review identifies these constrained cases as **needs-review**, without converting them into accepted outcomes or changing the frozen rubric.

Second-pilot evidence: `.helen/audit-results/specialty-v1-2026-10-07T22-40-14.976Z-acbe6969-ed5c-4d1b-b553-73c4cc315a06`, fingerprint `f278d402d481ea9c63ae5aa6924c349d96290d1a65df90f67861052e31b4fc00`. Eighteen observations from the three completed pilots are imported into the private outcome store with original grades and unknowns preserved. The aggregate describes frozen rubric acceptance; pending review prevents interpreting every failed rubric grade as failed real-world quality.
