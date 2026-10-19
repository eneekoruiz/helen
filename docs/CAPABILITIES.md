# Capability diagnostics and operation evidence

HELEN distinguishes a located CLI, supplied project configuration, native subscription authentication, CLI advertisements, and successful operations. A help flag, installed skill, enabled setting, or successful model answer does not prove that file editing, shell execution, a browser, MCP, or a native question form works.

`inspectCapabilities({ cwd, providers, configured, billing })` in `src/core/capabilities.ts` returns a timestamped report for Codex and/or Claude. It performs no model turn and writes no project files. `modelCalls` and `projectWrites` are both zero. The dependency override exists for deterministic tests, not to replace the native provider policy.

```powershell
helen capabilities --json
helen capabilities --provider codex --codex-credits-unavailable --json
helen capabilities --provider claude --claude-extra-usage-disabled --json
```

MCP exposes the read-only `helen_capabilities` tool. Both surfaces inspect capabilities without launching a model. Supply account confirmation flags only when the corresponding settings have actually been confirmed. Programmatic callers can supply explicit configuration evidence and separately verified runtime receipts; the default command does not accept unverified observation JSON or infer successful operations from configuration files.

## What each field establishes

| Field/state         | Evidence                                                                 | Limit                                                                                     |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `installed`         | Native executable resolved from PATH                                     | Does not prove it can perform a task                                                      |
| `version`           | Successful `--version`, reduced to its version identifier                | Raw provider output is not returned                                                       |
| `configured`        | Explicit per-capability configuration supplied by the caller             | Unspecified settings stay unknown; configuration is not execution                         |
| `authenticated`     | `login status` reports ChatGPT, or `auth status` reports claude.ai       | API/cloud authentication is rejected; billing remains a separate condition                |
| `advertised`        | Help text explicitly names a relevant tool or MCP interface              | Generic `--tools`, `--sandbox`, or `workspace-write` flags do not prove tool availability |
| `actually-observed` | Successful operation receipt verified against actual runtime/UI evidence | Applies to the named capability in this environment and CLI version                       |
| `unavailable`       | Verified CLI/version unavailable or capability explicitly disabled       | Missing help text alone does not establish absence                                        |

Every provider exposes `read`, `write`, `exec`, `browser`, `mcp`, and `nativeQuestions`. Each capability retains its own configuration, advertisement and observations. The summary state shows the strongest available evidence; provider installation and authentication still appear separately. For example, a native-authenticated CLI can advertise MCP while MCP remains unobserved.

The caller must obtain configuration from trusted project evidence. Passing `{ mcp: true }` means the caller observed an enabled configuration; it cannot mean “the CLI probably supports MCP.” This inspector does not read global settings or authentication files and does not guess defaults. Its environment fingerprint includes the project path, platform, architecture, resolved native CLI, version, supplied configuration and authentication result. A changed version or configuration therefore cannot inherit receipts from the previous report. The report includes `checkedAt`; each receipt includes `observedAt` and `providerVersion`.

## Read-only default probes

Windows lookup invokes the absolute system `where.exe` with `$PATH:codex.exe` or `$PATH:claude.exe`. Candidates must be absolute `.exe` paths outside the current project directory. Shell wrappers and current-directory lookup are rejected. POSIX lookup uses absolute PATH directories and executable files, excluding the current project directory.

After locating a native CLI, the inspector checks its version. An unverified version stops further probing. The remaining allowlisted probes are:

```text
codex -c forced_login_method="chatgpt" -c model_provider="openai" login status
codex exec --help
claude auth status
claude --help
```

The Codex configuration arguments are ephemeral command overrides. They do not change stored settings. Probes use `shell: false`, hidden Windows processes, ignored stdin, a five-second timeout and a 64 KiB output bound. HELEN reuses `subscriptionEnvironment` from the job runtime to exclude API/cloud credentials, custom OAuth credentials, application IPC and unrelated environment data. Raw auth/help/error output is discarded; reports expose only normalized statuses and a version identifier. Unknown authentication output, nonzero exits, timeouts, excessive output and probe exceptions fail closed.

The diagnostics may inspect native authentication even when account billing conditions are unknown because no model invocation occurs. `includedOnlyAuthorized` becomes true only for the selected provider's actual confirmation: no available Codex usage credits with automatic reload off, or Claude extra usage disabled. Diagnostics do not inspect balances, buy credits, change billing, start jobs or authorize consumption. Jobs retain their own mandatory account checks. See [background task bounds](BACKGROUND-JOBS.md).

## Recording actual operations

`recordCapabilityObservation(report, receipt, verify)` returns a new report. It cannot observe an operation by itself. There is no default verifier and no automatic observation file. The caller must authenticate receipt IDs against evidence retained by the real runtime bridge or a human UI review. An agent's self-report, a JSON boolean, an untrusted log, or a verifier that merely returns true is insufficient evidence in a production integration.

Receipts bind `provider`, `capability`, `environmentId`, `providerVersion`, `observedAt`, `source`, `invocationId`, and `evidenceId`. Successful evidence kinds are:

| Capability        | Required receipt data                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| `read`            | Digest of the content actually returned by a successful file read         |
| `write`           | Distinct before/after digests and verification of the actual changed file |
| `exec`            | Successful process result with exit code zero                             |
| `browser`         | Actual browser surface ID and captured state digest                       |
| `mcp`             | Real server/tool result with `isError: false`                             |
| `nativeQuestions` | Presented native form, human answer and answer incorporation evidence     |

The validator rejects malformed receipts, future timestamps, unknown providers/capabilities, mismatched environments or versions, disabled configuration, unverified native auth, wrong evidence kinds and verifier failures. A verified read never grants write or exec. Successful execution of a trivial command proves that observed execution route, not the correctness of every future command. The fingerprints and structural checks are consistency controls; they do not cryptographically authenticate a caller. The verifier remains responsible for trusted provenance and matching evidence content to receipt digests and IDs.

## Native question forms

`NativeQuestionsObservation` requires `presentation: "native-ui"`, a real surface and form ID, and separate `presentedEvidenceId`, `answerEvidenceId` and `incorporationEvidenceId`. Nonempty unique `questionIds` must match `answeredQuestionIds` and `incorporatedQuestionIds`; at most three questions are recorded. The verifier must establish that the form was actually rendered, the answer came from the human, and the resumed result used that answer without expanding authorization.

A headless result with `status: "needs_input"` verifies only clarification semantics. It does not prove a form appeared. A printed tool name does not prove successful rendering. Actual form observation requires an interactive foreground surface; without that evidence, `nativeQuestions` remains unobserved. The ambiguous/control benchmark and answer-incorporation criteria are defined in [specialty evaluations](SPECIALTY-EVALS.md).
