# Frozen specialty evaluations

These fixtures test different outcomes and scope boundaries. They extend the two checkout/cache pilot fixtures; they do not establish the effectiveness of the entire skill library. Grader self-tests establish that the controls reject known failures. Provider performance requires separately authorized actual calls and retained execution evidence.

The readonly fixtures live in `scripts/lib/specialtyEvalCases.mjs`. They expose `specialtyEvalCases`, `gradeSpecialtyResult(spec, result)`, and `nativeQuestionsBenchmark`. The grader consumes a validated HELEN job result (`status`, `summary`, `question`, `options`) and parses the exact requested JSON inside `summary`. Audit answers, proposed documentation and briefs are supplied-source evidence. They remain distinct from repository reading, actual edits, executed checks and native interface behavior.

## Cases and observable acceptance

| Case                                   | Split      | Skill              | Frozen acceptance                                                                                                                                                    |
| -------------------------------------- | ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit-rollback-and-concurrency`       | Acceptance | `helen-audit`      | Detect premature success and unbounded saves; avoid false positives on retry propagation and Promise.all result order                                                |
| `security-tenant-and-shell-boundaries` | Acceptance | `helen-security`   | Detect cross-tenant invoice access and shell injection; avoid false SQL/authentication claims on parameterized queries and authenticated middleware                  |
| `reprompt-ambiguous-retention`         | Acceptance | `helen-reprompt`   | Preserve analysis-only/chat-only intent and deletion exclusion; retain unknown retention policy; ask the essential decision with useful choices                      |
| `reprompt-known-control`               | Acceptance | `helen-reprompt`   | Preserve all supplied implementation outcomes and file limits; add no unknowns or unnecessary question; claim no actual edits                                        |
| `knowledge-recovery-runbook`           | Acceptance | `helen-knowledge`  | Draft the supplied status → show → selected recovery → status command sequence; require human selection/approval; invent no switches or executed checks              |
| `audit-heldout-claims-and-paths`       | Heldout    | `helen-audit`      | Detect uncontained download paths and unsupported release claims; avoid speculative absent-code and parameterized SQL findings                                       |
| `immutable-safe-object-patch`          | Heldout    | `helen-implementa` | Actual repository edit preserves input on success/failure, deep-copies nested/inserted values, rejects unsafe/malformed/absent paths, and preserves fixture controls |

Acceptance cases exercise declared behavior. Heldout cases exercise independent domains rather than another checkout/cache concurrency variant. This split is a frozen design distinction, not a claim that publicly shipped fixtures are secret. Do not tune prompts, expected findings, severity mappings, graders or selected cases after seeing live answers. Freeze their fingerprints, skill text, provider version, source snapshots, selected providers, condition order and exact invocation budget before a comparison. A failed response remains a failed frozen observation rather than a reason to move the target.

Audit/security findings must identify the correct category, supplied file, allowed line, severity, concrete impact and actionable fix. The rubric explicitly rejects missing defects, invented/duplicate findings, irrelevant scope, incorrect locations and fabricated executed checks. Regex criteria check concepts in natural-language explanations; they are a bounded semantic rubric, not proof that a proposed security repair is correct. Review ambiguous grading separately without silently changing the frozen comparison.

Reprompt grading distinguishes missing material decisions from complete requests. A question must concern the retention decision, choices must be distinct and relevant, and a short English brief must preserve goal, constraints, acceptance, scope and unknowns. It rejects unnecessary permission questions for the known control, unrelated questions, invented duration/deletion authorization and claims of actual implementation. Documentation grading checks exact supplied commands and order, meaningful purposes, chat-only scope, required human approval and `verificationStatus: "not-run"`.

Readonly fixtures allow no agent writes, commands, dependency installs or external services. Their literal `files` text must be supplied to a tool-disabled provider rather than pretending it read the repository. A runner may supply the literal skill text in one condition; label this **skill-text injection**, not native skill activation or observed reading of a SKILL.md file. Baseline and skill conditions must share the same source, acceptance, native restrictions and budget. Keep successful status distinct from passing the specialty grader.

## Versioned runner

`scripts/run-specialty-evals.mjs` implements this protocol using the built `dist/core/jobRuntime.js` native subscription adapter. The default is a dry run: it imports frozen cases and prints the schedule, with **zero provider processes and zero model calls**. Build before a live run so the runtime fingerprint covers the implementation actually used.

```powershell
npm run build
node scripts/run-specialty-evals.mjs --dry-run
node scripts/run-specialty-evals.mjs --providers codex --cases audit-rollback-and-concurrency,security-tenant-and-shell-boundaries,reprompt-known-control --max-calls 6
```

Live execution requires `--live --subscription-only --max-calls N` and the selected account's explicit confirmation flag. `--codex-credits-unavailable` confirms both unavailable usage credits and automatic reload disabled; `--claude-extra-usage-disabled` confirms extra usage disabled. Authentication alone does not prove either billing condition. The following commands are execution examples, not authorization to run them:

```powershell
node scripts/run-specialty-evals.mjs --live --subscription-only --providers codex --codex-credits-unavailable --cases audit-rollback-and-concurrency,security-tenant-and-shell-boundaries,reprompt-known-control --runs 1 --max-calls 6 --max-minutes 3 --max-turns 2
node scripts/run-specialty-evals.mjs --live --subscription-only --providers claude --claude-extra-usage-disabled --cases audit-rollback-and-concurrency,security-tenant-and-shell-boundaries,reprompt-known-control --runs 1 --max-calls 6 --max-minutes 3 --max-turns 2
```

Options are strict: unknown, repeated or malformed options fail before execution. Runs, calls, minutes and turns have finite upper bounds. Conditions alternate first position across cases and trials. The same frozen task and source appear in both conditions; expected answers never enter a prompt. The only treatment difference is exact skill text, labeled honestly as injection. A supplied `--output` must name a new directory.

Each new run lives under `.helen/audit-results/specialty-v1-<timestamp>-<uuid>/`. `manifest.json` freezes the schedule, budgets, account confirmations, repository revision and dirty-file digest, exact selected case content, grader digest, runner bytes, runtime bytes, skill bytes and native versions. `frozen/` retains those bytes. Attempt directories retain exact prompts, native stdout/stderr, structured answers, runtime outcomes, pure grades and the effective native invocations written before launch. All evidence files use create-only writes; an existing run is never overwritten. A terminated process may leave an incomplete manifest/attempt instead of a fabricated final result.

Codex keeps its native authenticated home, configuration, read-only sandbox and Windows sandbox selection. Retaining native configuration preserves valid managed MCP transport definitions; all MCP servers and tool features remain disabled. Before every inference launch, the runner validates the exact configuration/feature overrides with native `codex mcp list --json` and requires every returned server to be disabled. Its create-only `mcp-verification.json` receipt records the effective arguments, safe server states and native listing digest without retaining transport credentials. Discovered user skills are disabled. Claude retains `--safe-mode`, `--restricted`, managed restrictions, no permission prompts, empty MCP configuration and included authentication; its tools are explicitly disabled with `--tools "" --allowedTools ""`. Native user/managed/system instruction contamination remains unverified. Unexpected tool calls, fixture writes, invalid result contracts, native version changes, failed or blocked executions are ineligible for pairing. A JSON-schema `StructuredOutput` block only carries the answer and is not counted as an external tool action.

The runtime performs native authentication/capability checks and stops on reported policy, quota, timeout or provider errors. The exact Codex startup notice reporting that `code_mode_host` is disabled is retained in `nativeNotices`: it confirms the intentionally unavailable host and is not a tool invocation. This exception matches only that complete native item message; other native item errors, top-level failures, quota/policy errors and actual tool events remain ineligible. It does not authorize enabling the host. The runner does not repeat a failed observation, launch a judge model, change account settings, relax the sandbox or route to an API. `calls` counts observed inference process launches; `attempts` also includes preflight-blocked requests. The maximum bounds both. Hidden requests internal to a provider CLI are not independently counted, and error/retry events cause the native runtime to stop rather than intentionally retry.

`results.json` contains per-case results and only eligible baseline/skill pairs. Grade failures are observed outcomes, while infrastructure/contract failures remain unmeasured. A valid answer is eligible for grading even when native telemetry does not expose its model. Paired claims additionally require the same actual model identity in both native envelopes; `excludedPairs` records unknown or different model identities. `plannedModel` comes only from frozen native configuration and is distinct from `metrics.resolvedModel` and its native evidence source. An answer's self-report never establishes model identity. A completed grading pilot with no comparable model pairs remains unmeasured. A tie explicitly reports **no measured improvement**, without asserting equivalence. Native token fields and native duration are recorded only when exposed; missing values remain `null`. Codex cached input/cache-write fields are subsets of its input total, while Claude cache-read/cache-write fields are separate additions. Wall duration includes preflight. Reported provider cost is telemetry, not a claim about additional subscription spending. Human interventions remain unknown (`null`), and native UI and edits remain unverified (`false`).

## Actual implementation holdout

`repoImplementationHoldoutCases` is a separate export in `scripts/lib/repoEvalCases.mjs`. It uses the existing repository-edit harness, with `patch.mjs` as its only writable file. It must be selected explicitly by a compatible runner; importing it does not make a model call. The grader stays outside the agent's writable fixture, checks executable outcomes, and verifies that package/test/skill controls and fixture scope were preserved. Agent output is not executed as code in readonly specialty grading.

Select it with `node scripts/run-repo-evals.mjs --suite implementation-holdout`; this command is dry-run by default. The original `--suite pilot` remains the default with exactly the two original checkout/cache controls. Case filters apply to the selected suite and reject cases from other suites. The implementation holdout uses the edit harness and its native restrictions; it is not an answer-only specialty result. A previously blocked Codex editing route must not be relaunched or weakened to obtain a score.

The edit harness accepts `--max-minutes 1..30`, with the original three-minute default. Select any larger per-attempt budget explicitly before freezing a new run; both conditions use that same deadline. Manifest, immutable checkpoints and attempt invocations retain the actual timeout. Previous three-minute failures remain incomplete observations and are never upgraded by a later budget change. See [repository evaluations](REPOSITORY_EVALS.md) for bounded plan and execution examples.

The original patch fixture mutates its input and accepts unsafe paths. Deterministic controls establish that the original fails, an independent immutable implementation passes, and modification of an immutable test file fails. A readonly solution draft cannot count as implemented behavior. Native policy or sandbox failures remain blocked/unavailable evidence; they must not trigger weaker provider isolation or a paid API fallback.

## Native questions need separate observation

The interactive benchmark pairs `reprompt-ambiguous-retention` with `reprompt-known-control`. Passing requires:

1. An actual native form rendered in the foreground surface for the ambiguous request.
2. A targeted retention question with useful choices and free-text access.
3. A real human answer associated with that same form and question IDs.
4. A resumed brief that incorporates the answer and retains the deletion exclusion.
5. The fully specified control proceeding without an unnecessary form.

Use the `NativeQuestionsObservation` protocol and verifier in [capability diagnostics](CAPABILITIES.md) to bind presentation, answer and incorporation evidence to the environment and CLI version. A help flag, transcript tool name, self-report, fabricated answer, headless `needs_input` JSON or agent-created HTML questionnaire is insufficient. `gradeSpecialtyResult` always returns `nativeUiVerified: false` and `editsVerified: false`, even for a passing semantic answer. Without actual foreground evidence, native UI remains unverified.

## Evidence, budgets and limits

Record blocked attempts, missing usage data, grader failures, true defects/false positives, provider version, actual result, condition and invocation count. Paired skill-versus-baseline outcomes support only the evaluated task/provider/environment. Token or cache savings require measured comparable usage; answer length alone does not establish consumption or cost.

No fixture, grader or diagnostic authorizes live calls. Use the account constraints already confirmed for the selected provider and an explicitly frozen invocation/time budget. Stop on quota, billing uncertainty or native policy rejection. Do not enable extra usage, buy credits, extend the budget, change global settings or relax native restrictions to make an evaluation run. A small sample is a pilot with uncertainty, not a broad quality or savings claim.

The focused controls are in `tests/capabilities.test.ts`, `tests/specialtyEvals.test.ts` and `tests/repoEvals.test.ts`; no actual provider calls are needed for them. Execution runners and aggregate evidence remain separate from the fixture definitions. See [repository evaluation evidence](REPOSITORY_EVALS.md) and [background task restrictions](BACKGROUND-JOBS.md).

## Supplemental rubric review

Frozen v1 answers exposed two constrained judging weaknesses: the knowledge grader searches the whole answer for forbidden flag substrings even when limitations explicitly deny those flags; the heldout audit fix pattern omits the synonym `verify containment`. These are post hoc review candidates. The original fixtures, answers, grades and reports remain unchanged.

`scripts/review-specialty-rubric.mjs` reads an existing v1 run and creates a separate `rubric-review-v<reviewer-version>-<uuid>.json` beside it. Reviewer version 2 also distinguishes an approval prerequisite before future execution from an assertion of past execution. It never imports or executes frozen JavaScript, runs proposed commands, invokes a grader/provider, edits original evidence or launches a new evaluation. Input must be an immediate run directory under this repository's `.helen/audit-results`; a custom output must be a new JSON file beside that directory. Reads are bounded to two MiB per file and sixteen MiB total, with at most six cases and two hundred observations; unsafe paths, symbolic links, mismatched manifest/observation hashes and unsupported grader versions fail before output.

```powershell
node scripts/review-specialty-rubric.mjs --run .helen/audit-results/specialty-v1-2026-10-07T22-40-14.976Z-acbe6969-ed5c-4d1b-b553-73c4cc315a06
```

The deterministic reviewer in `scripts/lib/specialtyRubricReview.mjs` only reports `needs-review` when other frozen constraints remain intact. Knowledge commands and order must match exactly, scope must remain chat-only, verification must remain not-run, human selection/approval must be explicit, and flag mentions must occur only in whole, explicitly negative limitations. Positive recommendations, mixed denial/recommendation clauses, flags in steps and other forbidden claims receive no exemption. The audit candidate requires both exact findings, locations and severities, the other evidence criteria, and the observed delimiter-aware `path.sep` prefix guard with a throw. A vague synonym, unsafe bare prefix, extra finding or claimed executed check is insufficient. These intentionally narrow detectors do not establish semantic correctness outside the observed patterns.

The derivative retains original outcome fields and hashes of the original answer, grade, case, observation, manifest, report and frozen grader module, plus the manifest's original grader function digest and the reviewer's own version/source hashes. Hashes establish byte identity within the supplied evidence, not independent authenticity of an author or execution. `acceptanceChanged` and `comparisonClaimsAuthorized` remain false; model calls and grader executions are zero. A caller cannot turn `needs-review` into accepted outcomes, replace v1 grades, or use it for revised baseline/skill improvement claims. Human review may inform a separately versioned future rubric and new evaluation; it cannot retroactively change this frozen pilot. Controls are in `tests/specialtyRubricReview.test.ts`.
