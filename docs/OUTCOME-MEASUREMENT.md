# Outcome evidence and consumption

`helen outcomes` stores task-result observations and reports acceptance, elapsed
time and measured token consumption. Recording and reporting perform no model
calls. They do not establish subscription billing, infer charges or calculate
monetary savings.

The CLI appends records to the ignored project file `.helen/outcomes.json` under
the project operation lock. Records receive a UUID and recording timestamp.
Reusing an existing UUID is rejected, including an attempt to replace its fields.
Existing observations remain in the denominator; a favorable retry does not
erase a failed attempt. The store is bounded to 10,000 records and 8 MiB. Invalid
input, corrupt stores and linked metadata paths are rejected rather than silently
repaired. Preserve the original file before any explicit repair or archival.

This is append-only behavior through the API, not a cryptographic audit log.
Workspace owners can edit files outside HELEN. The `evidence` field is a reference,
not an artifact importer or integrity check. Preserve original run output,
grader results, exact task and skill content, versions and relevant project
snapshots as immutable evidence separately, and inspect them before trusting a
claim. `source: "native-runtime"` is caller-supplied provenance. The label does
not independently verify execution, telemetry, accepted work or billing.
Programmatic callers should summarize the validated records returned by
`readOutcomes`; `summarizeOutcomes` accepts `Outcome[]` and is not a parser for
unchecked external JSON.

## Record and inspect

Create a UTF-8 JSON input file. This schema illustration is not a measured HELEN
result. Replace the repeated digests and example labels with the original
evidence's SHA-256 digests and identities; supply the observed duration and
grader result. Duration is required, so an unknown duration must not be replaced
with zero. Unknown token and human measurements remain JSON `null`; their
nullable fields are required rather than omitted.

```json
{
  "runId": "example-run",
  "caseId": "checkout-retry",
  "provider": "codex",
  "providerVersion": "version-from-original-evidence",
  "model": null,
  "condition": "project",
  "skill": null,
  "skillDigest": null,
  "taskDigest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "graderDigest": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "repositoryFingerprint": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "accepted": false,
  "evaluationStatus": "completed",
  "elapsedMs": 1200,
  "inputTokens": null,
  "outputTokens": null,
  "cachedTokens": null,
  "retries": 0,
  "humanCorrections": null,
  "humanMinutes": null,
  "evidence": "immutable-evidence/example-run/result.json",
  "source": "reported"
}
```

```sh
helen outcomes record --input outcome.json --json
helen outcomes report --json
```

`evaluationStatus` is `completed`, `blocked`, `failed`, `invalid` or `timed_out`;
omitting it defaults to `completed`. Only a completed evaluation may have
`accepted: true`. A completed evaluation with `accepted: false` means the grader
actually ran and rejected the result. A failed or unavailable evaluation is a
different observation and cannot form a quality comparison.

For MCP recording, call `helen_outcome_record` with an absolute `cwd` and the
same JSON object as its `data` argument. A read-only MCP report request is:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "helen_outcomes_report",
    "arguments": { "cwd": "/absolute/project" }
  }
}
```

CLI JSON wraps the report in `data`; MCP returns the JSON report in text content.
Reporting an unrecorded project creates no metadata. Its relevant fields are:

```json
{
  "attempts": 0,
  "accepted": 0,
  "acceptanceRate": null,
  "measuredTokenAttempts": 0,
  "tokenCoverage": null,
  "tokensPerAcceptedTask": null,
  "elapsedMsPerAcceptedTask": null,
  "humanCorrections": null,
  "humanMinutes": null,
  "pairs": []
}
```

## Compare like observations

An eligible baseline/skill group has exactly one observation of each condition.
Both must be labeled `native-runtime`, have a completed evaluation and a known,
matching model. The group must also match run ID, case ID, provider and provider
version, task digest, grader digest and repository fingerprint. The skill
observation must name the exact skill and its content digest; the baseline must
not claim a skill. Different identities, missing source provenance, duplicate
conditions and interrupted evaluations prevent pairing. Project observations
remain in overall consumption and acceptance metrics but are not skill pairs.

Pair deltas are **skill minus baseline**:

- `qualityDelta` is the difference between boolean acceptance results: -1, 0 or
  1. It is not a rubric score or a universal quality percentage.
- `elapsedDeltaMs` compares the observed durations.
- `tokenDelta` compares `inputTokens + outputTokens` only when both fields are
  measured for both observations; otherwise it is `null`.

The report divides the sum of **all attempted observations'** token consumption
and elapsed time by the number of accepted observations. Failed attempts and
retries must be recorded, rather than selectively presenting accepted results.
`retries` also contributes to `totalRetries`; it does not multiply telemetry
again. The caller must consistently define whether an observation's duration
and usage cover one attempt or an explicitly aggregated execution.

`tokensPerAcceptedTask` requires complete token coverage and at least one
accepted observation. `elapsedMsPerAcceptedTask` requires an accepted
observation. With no accepted results those ratios are `null`. Zero measured
tokens or zero observed human corrections are valid measurements; missing data
is not zero. Human totals are `null` if any record lacks that measurement, or if
there are no observations. Cached tokens are neither automatically deducted nor
converted to a charge; normalize provider usage consistently before recording.

These are descriptive observations, not confidence intervals, causal proof or
general effectiveness guarantees. Native receipts, unchanged graders and
preserved original artifacts still need review. Token counts, response language,
elapsed time and source labels cannot establish what an account was charged.

## Import a frozen specialty answer pilot

Build the local runtime, then preview a complete specialty report directory:

```powershell
npm run build
node scripts/import-specialty-outcomes.mjs --report ".helen/audit-results/specialty-v1-<run>"
```

The default is `--dry-run`: it validates evidence and prints the proposed
records without creating project metadata. Add `--cwd <project>` to preview
duplicate detection against that project's existing outcomes. Recording requires
both explicit flags:

```powershell
node scripts/import-specialty-outcomes.mjs --record --report ".helen/audit-results/specialty-v1-<run>" --cwd "."
helen outcomes report --json
```

The importer loads the trusted, locally built `dist/core/outcomes.js` API. It
does not launch provider processes, call a model, execute frozen files, change
graders or regrade answers. It supports version 1 of
`frozen-specialty-answer-pilot`; interrupted runs without `results.json` need
inspection of their original traces and cannot be imported as complete reports.

Validation checks the manifest fingerprint, report reference, complete frozen
schedule, selected-case bytes, each skill snapshot, runner/subscription/runtime
bytes and the frozen grader's textual function digest. Version 1 selected-case
hashes omit the file's final newline. The importer reads all files in each
referenced attempt directory, rejects non-regular files and symlink/junction
ancestors, and bounds reads to 8 MiB per file, 64 MiB in total and 200 attempts.
It compares report rows with `observation.json`, native runtime outcomes,
answers, prompts, individual invocation receipts and raw stdout telemetry. All
rows are validated before the first outcome is appended.

Each provider/case/trial/condition receives a deterministic UUID derived from
the frozen manifest fingerprint. Exact existing records are skipped; conflicting
values under that UUID cause an error and are never overwritten. Each trial has
its own run ID, preserving separate baseline/skill pairs. Failed, blocked and
timed-out attempts remain records with their observed consumption; an
ineligible completed answer becomes `invalid`. An eligible grader failure
remains `completed` with `accepted: false`. `stopped` maps to `blocked`.
Semantic `needs_input` answers still provide no evidence of a displayed form or
a human response.

Claude normalized input includes actual raw input, cache reads and cache writes;
if any component is absent, input remains `null`. Codex input already includes
cached input, so that subset is not added again. Missing output/cache/model
telemetry and human measurements remain `null`. An absent version on a failed
runtime attempt is recorded as the explicit label `"unknown"`. A configured or
planned model never supplies the recorded actual model. Only a structured native
envelope can provide that identity. A completed, accepted Codex answer with an
unknown model remains a useful observation but is excluded from paired
comparisons. Matching config and invocation arguments establish the planned
override, not the provider's resolved model.
Observed wall duration includes preflight. Provider-reported monetary fields
are not imported and cannot establish charges or savings.

Current version 1 reports also carry `plannedModel`, `plannedModelSource`,
`modelIdentityVerified`, `resolvedModelSource`, `nativeNotices` and `nativeErrors`.
Those fields must agree with the frozen profile and raw native envelopes. The
importer uses the trusted checkout runner's pure telemetry parser for this
format; it never loads the report's frozen runner. Only the exact recognized
Codex disabled-host notice is harmless. Other native errors prohibit an eligible
execution claim. Earlier version 1 reports retain their original telemetry
format, and also receive no configured-model fallback. Removing provenance
fields from a report whose frozen runner declares them is rejected.

The evidence pointer includes the original absolute report/trace locations and
the inspected `results.json` SHA-256. Preserve those originals. A report moved
to a new location has a different pointer and may conflict with already
imported IDs; copying it is not a new experiment. The manifest commits input
snapshots, while version 1 does not independently sign or commit the results.
An owner who can rewrite a report, its traces and all hashes can forge a
consistent bundle. `source: "native-runtime"` is therefore caller provenance,
not authenticated native execution. Inspect original immutable evidence and
native receipts before trusting a comparison.

Persistence uses the normal append-only outcome API one record at a time.
Concurrent writers or a storage failure may leave a partially imported batch;
preserve the error and resume with the same report after normal recovery. The
deterministic IDs skip records already appended. These checks do not provide a
cryptographic log or protection against a hostile concurrent filesystem owner.
