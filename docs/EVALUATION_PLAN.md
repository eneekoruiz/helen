# Prompt evaluation acceptance plan

Defined before changing the evaluation runner on 2026-10-04. These are acceptance criteria for evidence, not a promise of perfect agent output.

1. Failed provider calls, missing answers and malformed judge responses must produce **unmeasured** observations, never zero-percent quality or statistical noise.
2. Only completed baseline/skill pairs from the same case and run may contribute to a delta. Report the valid-pair count, attempted count, errors and exact model/content version.
3. Skill activation reliability must be reported separately from answer effectiveness. Forced activation is a separate condition and cannot be credited as spontaneous activation. Failed activation observations have no valid denominator.
4. No confidence claim may be made with fewer than two independent case means. Repeated runs on one case do not substitute for broader task coverage. A confidence interval containing zero means inconclusive evidence, not proof of equivalence.
5. Tokens, provider cost and duration are measured only when telemetry exists. Missing telemetry is unknown, never inferred from English language or character counts. Language and model choices are hypotheses to compare on identical tasks.
6. Deterministic fixtures verify evaluator handling of failed runs, mismatched pairs, single cases, forced activation, duplicates and missing telemetry without calling a paid provider.
7. Live runs use predeclared case criteria and a baseline, with independent semantic judging. Coding effectiveness additionally requires executable fixture checks (tests, typecheck or output assertions); chat-only scores cannot prove repository correctness. Preserve holdout tasks and report regressions, not just averages.
8. Existing historical results remain inspectable but do not certify changed skill versions. An empty or invalid experiment is not a passing quality gate. Fix infrastructure failures before drawing conclusions or optimizing wording.

## Procedure

Run `npm run evals -- --dry-run` to inspect the selected cases and call budget. Run deterministic evaluator tests before any provider experiment. Real experiments require an authenticated Claude CLI supporting `claude auth status` and an explicit call budget (`--max-calls`); costs are provider-reported when available. Local preflight fails once with an actionable message rather than running every case without authentication. Use `--force` after prompt/spec revisions; content fingerprints prevent stale runs being reused. Optional `--force-trigger` samples the forced condition separately; default runs avoid that extra provider call.

The runner returns a nonzero status if requested current paired runs are missing, with-skill acceptance criteria fail, or natural activation disagrees with the case expectation. Statistical inconclusiveness remains explicit: passing individual criteria does not establish an improvement over baseline. `--report-only` rebuilds the report without making quality claims or provider calls.

Cases may additionally define deterministic `checks`: literal `includes`/`excludes` assertions or `json-equals` assertions on a declared dot path. Specify the exact output contract in the case before using exact checks. These checks contribute to the acceptance score and retain their raw booleans; a failed assertion is a task failure, while missing execution is unmeasured.

Quota/authentication refusals trip a circuit breaker: no retries or new provider calls are started after detection. The first actual baseline request doubles as a readiness probe before releasing concurrency, so an initial quota refusal stops after one invocation without an extra paid probe. Later refusals may allow already-started concurrent requests to finish. Local authentication alone does not establish available quota. The call budget counts CLI provider invocations; an agent invocation can contain multiple model/tool turns.

## 2026-10-04 bounded live pilot

Frozen cases: `helen-reprompt/question-remains-question` and `explicit-exclusion-preserved`; model `haiku`; three runs each; concurrency two; maximum 28 provider invocations. Both baseline and skill conditions returned a weekly-limit refusal. **Zero of six pairs were valid**; semantic judges were not called on invalid answers, and effectiveness, confusion rate and token savings remain unmeasured. Historical results were preserved under `evals/results/archive` before replacement. This failed pilot exposed unchanged retries on quota errors; the circuit breaker above was implemented and covered by deterministic tests. Do not retry live evaluations until provider access changes.

Choose representative tasks and specific pass/fail criteria before adjusting instructions; retain a held-out sample. Compare the same model and task under baseline, naturally selected skill, and forced skill conditions. Record successful outcomes, confusion/scope errors, regressions, time, tokens and cost. Zero observed confusion means zero in that tested sample; it does not prove future error-free behavior.

Source: [Anthropic: define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests). The current bundled chat-only cases measure answer criteria and routing; they do not yet establish end-to-end coding task effectiveness.
