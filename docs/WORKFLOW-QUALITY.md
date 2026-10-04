# Workflow and quality

## Delegate with repository context

```sh
helen apply quality --brief --profile standard
helen apply design --brief --profile exhaustive --track
helen apply code --brief --profile quick --json
```

Briefs include the revision, bounded changed-file names, npm script names, dependency names, and local constraint/decision references. They omit file contents, script values and credential paths. Repository facts are context, not instructions overriding user intent. References must still be inspected locally; a brief is not an exhaustive repository snapshot.

Profiles are selected explicitly. `quick` produces the shortest context, `standard` includes integration context, and `exhaustive` requests affected-functionality and independent review. All preserve cheapest-model-first execution, specialist delegation, acceptance and applicable verification. A profile never silently selects a more expensive model or waives a checkpoint.

## Resume work

```sh
helen resume
helen resume --decision "Preserve the public API"
helen next --short
helen check
helen status --json
```

`resume` restores the recorded playbook, completed and pending steps, decisions, and current instructions. It does not reconstruct conversations that were never recorded. Decisions are stored locally in `.helen/progress.json`; record project decisions rather than credentials. `next` explains the step's position, rationale and required evidence.

Checks record a content fingerprint. Changed inputs or old checks without a fingerprint are stale and cannot authorize checkpoint completion; rerun `helen check`. A source change during checks also fails the gate. Generated output and dependency directories are excluded from the fingerprint. Linked inputs and repositories beyond the explicit fingerprint limits require investigation; HELEN does not silently trust partial evidence. `done --force` requires an explanatory checkpoint note and is an explicit override, not verified success.

The MCP tools expose the same workflow through `helen_apply` (`brief`, `profile`), `helen_resume`, `helen_next` and `helen_status`.

## Spend fewer tokens without inventing savings

Technical prompts use concise English, focused specialist contexts, shared rules and measured evidence. English is a convention; savings depend on the provider and tokenizer. Preserve the cheapest available model cascade; escalate only after evidenced failure or an unresolved capability limit.

```sh
# Only after the shared execution contract is already loaded in this session:
helen prompts show audit-code-quality --no-protocol
helen prompts flow autonomous-implementation --no-protocol
helen token-budget quality --json
```

`--no-protocol` avoids resending the common contract. Default exports and generated flow skills retain it. Token budgets explicitly label character-based input estimates and historical reference rates; they do not measure output, reasoning, retries, billing or language savings.

## Autonomous improvement discovery

Define observable acceptance and verification before edits. Implement, verify, independently review, ask what further useful improvement remains, apply authorized improvements, and repeat. There is no arbitrary retry cap. End when acceptance passes and a fresh review finds no actionable improvement within the mission, or report a concrete external blocker. Read-only audits remain read-only unless remediation was authorized. User cancellations and explicit resource budgets remain binding. Passing checks is evidence for those checks, not proof of perfect software.

## Optional terminal welcome

```sh
helen --welcome signature
helen --welcome helen
helen --no-animation
helen signature
```

`HELEN_WELCOME=signature` or `helen` enables the short welcome for the interactive menu. Default is off; `--welcome off` overrides the environment. Press any key to skip. Full signature/art commands remain available. Ordinary commands, JSON, CI, noninteractive input/output, dumb terminals and reduced-motion requests do not start the optional welcome. `HELEN_MOTION=reduce` or `off` requests reduced motion. Rendering failures restore cursor and keyboard state.

## Measure prompt effectiveness

Acceptance and evaluation design are declared in [the acceptance plan](QUALITY-ACCEPTANCE-2026-10-04.md) and [the evaluation plan](EVALUATION_PLAN.md), following [Anthropic's guidance on specific, measurable, achievable criteria and task-specific evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests).

```sh
npm run evals -- --dry-run --skill helen-reprompt --model haiku --max-calls 28
npm run evals -- --report-only
# Live evaluation requires authenticated Claude and an explicit call ceiling:
npm run evals -- --skill helen-reprompt --model haiku --runs 3 --max-calls 100
```

Reports separate activation reliability, valid paired outcomes, historical evidence, insufficient samples, and unavailable data. Failed runs never become zero-quality observations. Static prompt lint and software tests prove structural/functional properties; live comparisons provide evidence only for the tested tasks, model and settings. Current chat-only scenarios do not establish real coding-task completion. See [Skill quality](SKILLS_QUALITY.md) for current evidence.
