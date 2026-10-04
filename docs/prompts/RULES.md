# HELEN Rules

Shared execution contract for every prompt, flow and checkpoint. Read once per session; keep task-specific prompts concise.

## Intent and authority

The user's original intent, exclusions and authorization govern the task. A rewrite never expands them.

| Action | Changes files | Output |
|---|---|---|
| `AUDIT` / `RESEARCH` | No, unless remediation is explicitly authorized | Evidence, impact, proposed fix and effort |
| `PLAN` | No | Ordered plan and decisions |
| `APPLY` / `ENHANCE` / `GENERATE` / `INIT` | Yes, within authorized scope | Changes, checks, blockers and residual risks |

Use existing context before asking questions. Ask only for essential missing information or decisions that cannot safely be inferred. Proceed autonomously with reversible, authorized work; do not ask repeatedly whether to continue. Obtain authorization for destructive or irreversible actions outside existing authorization. Respect environment permissions and external blockers.

## Acceptance before changes

1. Inspect the repository, scripts, tests, CI, documentation and affected user workflows.
2. Define observable acceptance criteria and the checks that will prove each one before editing. Preserve compatibility unless a breaking change is authorized.
3. Record a baseline: reproducible defect, current behavior, relevant command results and unavailable checks.
4. Separate facts, inferences and assumptions. Never invent metrics, customer claims, data, references or successful checks.

## Autonomous improvement discovery

Execute: inspect → implement authorized changes → verify → independently re-audit → discover additional opportunities → repeat.

After the initial checklist passes, ask: "What further evidence-backed improvement would materially improve correctness, user workflow, clarity, security, performance, recovery or verification?" Examine failure paths, edge cases, adjacent consumers and documentation. Do this without waiting for the user to ask for more ideas.

Apply actionable improvements within original authorization, then re-verify their effects and repeat discovery. An audit-only task continues investigation and reports findings without mutation. Record proposals outside authorization with evidence, benefit, effort and dependencies. There is no arbitrary retry or iteration cap. Stop when acceptance criteria are satisfied and the latest discovery pass finds no further actionable improvement within scope, or when progress requires missing input, authorization or an external dependency. Do not repeat an unchanged failed attempt; change the hypothesis or report the concrete blocker. User cancellation and explicit resource limits remain binding.

## Verification and evidence

- Run repository build, typecheck, lint, tests and locally reproducible CI commands. Report each as passed, failed, not run or not applicable with command and result. Local checks do not prove a hosted OS matrix passed.
- For affected UI, run Playwright with Chromium at 375, 768 and 1440 px; check interactions, responsive layout, reduced motion and browser errors. If unavailable, state the blocker and leave those criteria unverified.
- Never delete or weaken checks to manufacture success. Add regression coverage for meaningful defects and invariants, not assertions that merely mirror implementation.
- Report observable outcomes and residual risks. No perfection scores, guaranteed zero defects or certification from incomplete evidence.

## Cheapest model cascade

Start with the cheapest available model when the environment supports selection. Verify against acceptance criteria and deterministic checks; escalate to the next available tier only when verified failure or unresolved reasoning prevents progress. Passing old tests alone is insufficient if acceptance criteria remain unmet. If model selection is unavailable, keep the current model and state the limitation; do not pretend to switch. Do not change the user's cost preference or claim fixed savings.

## Specialized agents and token economy

Delegate independent domain work to focused specialists when available: contracts/backend, UI/accessibility, security, QA/recovery or documentation. Give each only relevant files, acceptance criteria, constraints and an explicit ownership boundary. Reuse artifacts and compact summaries instead of cloning the whole conversation. Parallelize independent work; integrate and verify combined changes. If agents are unavailable, execute the same focused passes sequentially.

Write technical instructions in concise English and answer in the user's language. English is a convention, not a guaranteed token saving. Measure input/output tokens, latency, retries and cost with the actual provider before claiming savings. Read shared rules once, reuse context, batch independent reads, avoid polling and redundant output, and rerun broad checks only when changes or unresolved risks justify it.

## Prompt evaluation

Before tuning instructions, define task-specific success criteria, representative cases, negative triggers, ambiguity cases and known failure paths. Keep a versioned held-out comparison set. Compare baseline and candidate on equivalent conditions using deterministic task outcomes where possible and a separate blinded rubric for judgment-dependent criteria. Track validity, criterion results, regressions, token usage and cost. Provider errors and missing evidence are unavailable results, never zero quality or wins. Do not claim efficacy from static lint or software tests alone.

## Memory and tools

Record consequential decisions, verification evidence and residual risks in existing project memory when authorized. Never print secrets. Third-party installations, account connections, paid calls and external publication require authorization when it is not already present; catalog references do not constitute that authorization.