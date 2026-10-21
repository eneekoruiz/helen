# Persistent feature work

HELEN keeps the authorized goal, exclusions, requirements, task dependencies, material questions and human decisions together in a feature dossier. Several features can remain active in one project. Read the existing dossier and prepare a task brief before continuing work or handing it to another agent.

These commands organize and verify work; they do not launch a model, install an agent, change global settings or grant new authorization. In this checkout, build with `npm run build` and substitute `node dist/cli.js` for `helen`. Use the global `--json` flag for structured command results.

## Create scope and acceptance

```powershell
helen work create checkout --title "Retry-safe checkout" --goal "Charge once for the same key and amount; permit a retry after failure" --exclude "No paid calls" "Do not change billing settings" --files src/checkout.ts --profile standard
helen work list
helen work show checkout
```

IDs use lowercase letters, digits and hyphens, beginning with a letter. `work create` rejects an existing ID. Use an explicit `update` record to change a feature. Source references are project-relative paths with `/` separators; parent escapes, absolute paths, protected metadata/dependency paths and junctions are rejected.

`work record <action> [feature-id] --input <file>` reads **action data**, without a surrounding `data` envelope. For example, save this as `requirement.json` in your chosen input location:

```json
{
  "id": "charge-once",
  "title": "One charge per key and amount",
  "acceptance": [
    "Concurrent and repeated calls with the same key and amount perform one charge and return the same receipt",
    "Reusing a key with a different amount is rejected",
    "A failed charge permits a later retry"
  ],
  "files": ["src/checkout.ts"]
}
```

```powershell
helen work record requirement checkout --input requirement.json
helen work plan checkout --kind fix
helen work ready
```

Acceptance criteria describe observable outcomes. Recording them does not prove the behavior. Link every requirement to the tasks responsible for implementing or verifying it. When adding requirements to an existing plan, review and update those links explicitly.

## Adapt the plan

`work plan` creates a dependency-ordered starting plan only when the feature has no tasks. It does not replace an existing plan. Choose the kind and profile that match the work:

| Kind/profile                 | Initial task order                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Quick fix                    | implement → verify                                                               |
| Standard fix                 | investigate → implement → verify                                                 |
| Feature, quick or standard   | define → implement → review → verify                                             |
| Migration, quick or standard | design → prepare → implement → review → verify                                   |
| Exhaustive                   | The matching sequence adds risk-review before implement and handoff after verify |

The generated `verify` task is a checkpoint. All generated tasks retain the feature's recorded requirement/file references; required verification defaults to typecheck, lint, test and build. A quick profile shortens the task sequence without turning a passing-looking answer into verification evidence. Changing the profile does not regenerate an existing task graph; review the tasks explicitly.

To add or replace one task, use action `task` with this shape:

```json
{
  "id": "verify",
  "title": "Verify retry, concurrency and payload boundaries",
  "requirements": ["charge-once"],
  "dependsOn": ["checkout:implement"],
  "files": ["src/checkout.ts", "tests/checkout.test.ts"],
  "checkpoint": true,
  "requiredChecks": ["typecheck", "lint", "test", "build"]
}
```

Dependencies use `feature-id:task-id`, including cross-feature dependencies. Unknown features/tasks/requirements, repeated dependency entries and cycles are rejected. A dependent task becomes ready only when its prerequisites are done with current acceptance. Paused features and unanswered material questions prevent active work. `work ready` reports whether the next task needs implementation, verification or review.

## Record the question and the real answer

If a missing decision materially affects the outcome, the foreground agent should use the host's actual native question form when one is available. It must await the human answer and preserve existing exclusions. HELEN records this exchange; `work record question` does not display a form itself. Without an available native tool, ask conversationally. Silence does not authorize a preference, extra consumption or scope expansion.

Question action data:

```json
{
  "id": "retry-policy",
  "question": "Which approved retry policy should this checkout preserve?",
  "options": [
    "Keep the existing policy",
    "Use the policy supplied by the human"
  ],
  "requirements": ["charge-once"]
}
```

```powershell
helen work record question checkout --input question.json
```

After the human responds, save `answer.json` with `questionId` and a new decision. The following is an illustrative format; replace the answer and provenance with the actual exchange:

```json
{
  "questionId": "retry-policy",
  "decision": {
    "id": "retry-policy-answer",
    "question": "Which approved retry policy should this checkout preserve?",
    "answer": "Keep the existing policy",
    "rationale": "The human chose the existing approved behavior",
    "alternatives": [
      "Keep the existing policy",
      "Use the policy supplied by the human"
    ],
    "requirements": ["charge-once"],
    "source": "native_question",
    "runtime": "codex",
    "tool": "request_user_input"
  }
}
```

```powershell
helen work record answer checkout --input answer.json
```

The answer must retain the recorded question and requirement links. Questions are answered once; decisions are append-only. To supersede a decision, append a new decision with a distinct ID and explain why. Imported question/decision rows that disagree are invalid. Use source `conversation` for a conversational answer, or `import` for a sourced historical decision. `native_question` additionally requires runtime and tool names, but those labels remain reported provenance: they do not prove a native form rendered. Actual UI proof belongs to the separate [capability observation protocol](CAPABILITIES.md).

## Conditional tasks from a recorded decision

A task can include an optional condition that names an existing question in the same feature and an exact human answer:

```json
{
  "id": "preserve-policy",
  "title": "Implement retries within the existing policy",
  "requirements": ["charge-once"],
  "dependsOn": [],
  "files": ["src/checkout.ts"],
  "condition": {
    "question": "retry-policy",
    "answer": "Keep the existing policy"
  }
}
```

Record the question before adding its conditional tasks. An unanswered question leaves its branches unresolved. Once the human answer is recorded, an exact match makes the task applicable; other alternatives become inactive. Matching uses the stored answer, not a guessed answer, a display label or a claimed UI event. Conditions must represent the human-authorized alternatives and retain the feature's global exclusions.

Inactive tasks cannot be activated, completed or verified. They are omitted from feature-completion requirements and can be bypassed as prerequisites at a join; a join still waits for every applicable prerequisite to be accepted. Requirements covered only by inactive alternatives are excluded from selected-branch coverage, while requirements shared with an applicable task remain mandatory. An uncovered applicable requirement blocks completion. Summaries and briefs disclose inactive requirements separately. An explicit alternative-task brief retains its actual branch question/answer and declares task applicability and readiness in the text; an inactive brief is reference data, not permission to implement that branch. If a free-text answer does not fit the intended branches, review the task definitions rather than inventing a human choice. To change a recorded branch choice later, record a new question and actual answer and explicitly retarget the tasks; a superseding generic decision does not rewrite an immutable prior question answer.

## Accept tasks and run checkpoints

For an ordinary task, record action `task-state` with the task ID, status and an honest note:

```json
{
  "task": "implement",
  "status": "done",
  "note": "Implemented the recorded retry contract; verification remains in the checkpoint task"
}
```

```powershell
helen work record task-state checkout --input task-state.json
helen work check checkout verify
```

`work check` executes the project's declared typecheck/lint/test/build scripts and records the actual result for that feature task. Run it only when verification is authorized: project scripts are executable project code. A required script that is missing, a failing check or a source change during verification prevents a passing gate. Failure returns a nonzero CLI exit status and an MCP error result.

To accept a checkpoint, use the returned gate ID in its `task-state` data:

```json
{
  "task": "verify",
  "status": "done",
  "gate": "gate-REPLACE-WITH-THE-ACTUAL-RETURNED-ID",
  "note": "The current observed gate passed for this checkpoint"
}
```

Gate IDs are returned by the command; do not invent them or import a success object. The gate must belong to this task, cover its required checks, pass, and match the current feature scope and repository fingerprint. A signed gate receipt detects edited/imported verification rows. Its key lives in the private project metadata directory. This is import-integrity protection, not a security boundary against a malicious actor who controls both the metadata and key under the same OS user.

After all applicable tasks are accepted, applicable requirements have task coverage, and material questions are answered, record action `update` with `{"status":"completed"}`. Feature completion is a tracked acceptance state, not evidence that every possible defect is absent. `pending`, `active`, `blocked`, `done` and `skipped` are task states; feature states are `active`, `paused` and `completed`.

Changing requirements, decisions, task definitions or authorized scope invalidates affected acceptance and its transitive dependents, including other features. Reopening an accepted task also invalidates dependent work. Invalidation is conservative: a scope change in a dependent feature can stale its other checkpoints. Source changes stale repository gates even if a previous check passed. The original records remain readable, and work returns for review rather than silently inheriting old acceptance.

## Prepare a bounded handoff

```powershell
helen work brief checkout --task implement --agent codex --include-source
helen context --task "Inspect retry boundaries" --feature checkout --include-source
```

A brief includes current scope, exclusions, relevant acceptance, recorded decisions, unanswered questions, review flags, applicable learning records, shared creative direction and bounded repository context. With no explicit task, it selects the first ready task; an unknown explicit task fails. `--agent codex|claude|antigravity` identifies the intended adapter. It does not verify host abilities, select the cheapest model, install tools or launch an agent. Use [capability diagnostics](CAPABILITIES.md) and actually observed abilities before choosing an execution route. Unsupported or unknown hosts remain unverified.

`helen work route [feature-id] --needs read write exec` prepares a read-only capability recommendation. Add `--codex-credits-unavailable` or `--claude-extra-usage-disabled` only for the human-confirmed account constraints they name. Diagnosis makes no model calls. Installation, subscription authentication and the spending restriction must be established, and every requested ability must have a trusted runtime observation in the reported environment/version. With only advertised abilities, the recommendation is `null`. Current CLI/MCP probes cannot supply that independent runtime/UI evidence; a trusted programmatic bridge must verify it. Provider order is not a model-price comparison, and the command makes no cheapest-model or automatic-handoff claim.

`--include-source` explicitly permits eligible source snippets. Private files and unsafe links remain excluded. Context uses lexical import/export/symbol/route hints, not compiler-resolved semantics or verified behavior. Dynamic imports, generated code, framework conventions and scan limits can leave gaps. Read notices and omitted-file counts; verify relevant behavior independently. The Codex background adapter needs supplied source because its restricted mode has shell/MCP reading disabled. An interactive host can have different abilities.

Briefs default to 48,000 characters; `--max-characters` supports 4,000–128,000. Required scope that exceeds the budget fails explicitly. Select a narrower feature/task or consciously increase the budget; exclusions and acceptance are not silently discarded to make it fit. Source context can be shortened with disclosed omissions. A workspace revision change during preparation rejects the stale brief. Character/token figures are estimates, not measured provider consumption or savings.

## Reuse sourced knowledge and creative direction

`helen knowledge record --input learning.json` appends a learning with `id`, `problem`, `cause`, `solution`, `tags`, `conditions`, `provenance` and optional `expiresAt`. Conditions contain package names and optional declared majors, project-relative path prefixes, and task tags. Provenance supplies a source, nonempty evidence list, and `observed` or `reported` kind. These labels remain caller provenance; check the original evidence.

```powershell
helen knowledge search "retry charge" --paths src/checkout.ts --tags standard
helen knowledge retire retry-single-flight
helen creative init
helen creative show
helen creative set --input creative-direction.json
```

Learning retrieval excludes expired records, missing/incompatible/unknown declared package versions and unmet path/tag conditions, then ranks relevance. Matches are advisory and require current verification. A record cannot be silently overwritten; retire it and create a new ID for revised evidence. Package conditions inspect declared project versions rather than proving the installed dependency graph.

The creative kit is shared across features and applies to web, copy, presentations and documents when relevant. It includes direction, references, colors, typography, imagery, composition, motion, tone and exclusions. Body text/background contrast must meet 4.5:1, and motion must include reduced-motion behavior and a readable static fallback. Imported kits undergo the same contrast validation. These fields are design constraints; saving them is not rendered accessibility verification. Since every feature brief consumes the shared kit, a creative-direction update conservatively reopens acceptance across all features for review. Explicit human and template instructions still govern the deliverable. `creative init` refuses to overwrite an existing kit.

## Persistence, concurrency and evidence

The workspace is `.helen/workspace.json`, with a two MiB limit. `.helen/.gitignore` excludes private records; HELEN does not publish or encrypt them. Scope changes append bounded before/after history for goals, exclusions, file references, requirements and task definitions, with scope IDs and timestamps. Decisions retain their immutable recorded answers. History is finite: the schema allows at most 500 entries per feature and does not promise an indefinite audit archive. Preserve/archive needed records before reaching limits; do not delete evidence just to make a change succeed.

All mutations use the project operations journal and a shared lock. Invalid/corrupt/oversized metadata is preserved and rejected. Follow the operation's recovery guidance after an interrupted mutation rather than replacing the file blindly. JSON inputs are bounded; edits are local to the chosen project.

For a read-modify-write client, reuse the workspace `revision` through `--expect-revision <uuid>` on `work record` or `creative set`, or `expectedRevision` in the MCP action. A stale revision rejects the update. This optimistic check is optional; the operation lock serializes mutations and reads the latest state even without it. A gate also rejects scope changes made while its checks run. Independent changes remain preserved.

Outcome records are separate: `helen outcomes record --input outcome.json` and `helen outcomes report` retain accepted/failed/blocked observations, durations, fingerprints, condition and measured telemetry. Unknown tokens or human effort remain `null`. Caller-supplied native-runtime labels are not independent proof, and character estimates cannot establish token or monetary savings. Neither an outcome record nor a skill invocation grants a workspace checkpoint.

MCP outcome reports preserve aggregate totals and return a bounded page of pair details: `limit` defaults to 20 and permits 0–100; `offset` defaults to 0 and permits 0–10,000. Follow `pairDetails.nextOffset` until it is `null`; `pairDetails.total` remains the full eligible-pair count. The CLI report retains the full export. MCP workspace/outcome responses have a 128,000-character ceiling and fail explicitly when that context budget is exceeded; they do not silently remove scope to fit.

## MCP equivalents

Every tool accepts optional `cwd` for the project. Mutation authorization remains the human's existing scope.

| CLI                                       | MCP                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `work list`, `work show`, `work ready`    | `helen_work_list`, `helen_work_show`, `helen_work_ready`                                                 |
| `work create`, `work plan`, `work record` | `helen_work_record` with `action`, optional feature `id`, and strict `data`; optional `expectedRevision` |
| `work check <feature> <task>`             | `helen_work_check` with `id` and `task`                                                                  |
| `work brief`                              | `helen_work_brief` with `id` and `options`                                                               |
| `work route`                              | `helen_work_route` with `needs` and human-confirmed account constraints                                  |
| `context`                                 | `helen_context` with task/path/source/file bounds                                                        |
| `capabilities`                            | `helen_capabilities`                                                                                     |
| `knowledge search`                        | `helen_knowledge_search`                                                                                 |
| Knowledge record/retire                   | `helen_work_record` actions `learning` / `retire-learning`                                               |
| `creative show`, `creative set`           | `helen_creative_show`; `helen_work_record` action `creative`                                             |
| `outcomes record`, `outcomes report`      | `helen_outcome_record`, `helen_outcomes_report`                                                          |

MCP `helen_work_record` wraps action data as `{"action":"requirement","id":"checkout","data":{...}}`. For `create`, the new feature ID belongs inside `data`. For `learning`, `retire-learning` and `creative`, no feature ID is needed. The MCP server exposes local tools to its host; it does not automatically install itself into global agent configuration or create a native UI in a closed/headless session.
