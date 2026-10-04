# Adaptive execution cost policy

Acceptance defined before this revision:

- Small, cohesive tasks can be completed by one agent without forced specialist calls.
- Delegation is chosen only when relevant expertise, smaller context, independent work or validation is expected to improve acceptance or reduce total cost.
- Compare context transfer, duplicated input, coordination, integration, verification and likely retries, not just a model's token price. Mark estimates as estimates.
- Choose the cheapest available model capable of the task when model routing is supported. Escalate after evidenced failure or a demonstrated capability limit.
- If changing the primary model is unsupported, do not pretend to switch. A cheap worker is an option only if handing off is expected to beat finishing in the current context.
- Parallelism is optional and never duplicates ownership. Cost routing preserves task scope, authorization, acceptance and applicable verification.

## Decision cases

Latency acceptance defined before tuning: minimize time to a verified result while retaining scope and required checks; reuse relevant context and valid evidence; batch independent reads and checks while preserving dependencies; answer directly when supplied facts suffice; do not repeatedly re-plan, poll or rerun unchanged work. Do not lower reasoning effort automatically. Time-to-first-token, end-to-end time, tokens and retries are separate measurements; no speedup is established without a comparable baseline.

1. A small wording correction with all relevant context already loaded: prefer the current single agent when transfer and verification would outweigh any expected worker saving.
2. A narrow independent implementation with a large unrelated primary context and a selectable cheaper worker: consider one worker with a minimal brief; the primary integrates and verifies its result.
3. Three independent backend, accessibility and recovery investigations with distinct files: specialists may improve coverage and enable concurrency; compare overhead before spawning.
4. The cheaper model fails a concrete acceptance check: diagnose, retain its useful evidence and escalate when the failure or capability limit warrants it.
5. The runtime exposes neither model selection nor agents: complete sequential focused passes using the current model and state unavailable controls when relevant.

The decision does not need a verbose planning ceremony. Record a one-line rationale only when routing is consequential. Provider-reported usage is needed to establish actual savings; a routing decision alone does not prove them.

[Anthropic's latency guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency) supports reducing unnecessary prompt and output length while retaining quality. This revision applies those principles to agent orchestration; streaming, provider scheduling and model inference speed still require runtime controls. The new `fast-verified-execution` case in `evals/helen-implementa.json` is an evaluation specification, not a completed model benchmark.

## Calibration

One fresh `gpt-6-luna` context read the revised implementation skill and proposed routes for cases 1, 3, 5 and 4 above. It kept the existing agent for the small correction and unavailable-controls case, selected specialists for independent investigations with worthwhile expertise, and proposed escalation after an evidenced capability failure. [Exact observations](../evals/native/routing-observations.json) preserve the responses and limitations.

This is one instruction-interpretation calibration, not executed task completion, a repeated benchmark or proof of savings. No actual switch or specialist dispatch occurred inside the calibration context.

## Latency revision validation

The latency rule is exported through the shared contract and included in all 12 standalone skills, including the personal Codex copies. Build, ESLint, HELEN library validation and the full 375-test suite pass after the revision. These check integration and existing invariants, not response-speed improvement. No paid model benchmark or latency comparison was run.

The generic Codex skill validator rejects the pre-existing top-level `version` field used by HELEN. All 12 isolated validation copies pass with only that legacy field omitted; repository metadata remains unchanged and HELEN's own validator passes.
