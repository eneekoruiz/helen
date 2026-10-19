---
name: helen-reprompt
description: Clarify requests through native questions and concise English briefs while preserving intent, exclusions and authorization; use measurable acceptance, cost-aware routing and autonomous discovery.
metadata:
  version: 2.1.0
---

# HELEN Reprompt

Rewrite the request without changing what the user asked. Preserve questions as questions, evaluation as evaluation, audit-only work as read-only, and implementation as implementation. "Any more ideas?" requests analysis unless implementation is already authorized.

## Procedure

1. Extract the goal, provided context, exclusions, original action and existing authorization. Retain unresolved uncertainty; never manufacture requirements or answer preferences.
2. Inspect available conversation and repository context. If missing details materially affect the outcome, use the runtime's native structured question form (for example an exposed `request_user_input_async` or `AskUserQuestion` tool), with concise task-specific questions, useful choices and free-text answers. Reuse supplied answers; never impose a fixed questionnaire or create a separate HTML editor, website or artifact. If no native tool is available, ask conversationally. If context suffices, proceed without questions. Continue independent authorized work while waiting; silence is not an answer or authorization.
3. Define observable acceptance criteria and how to verify them before adjusting instructions or files. Specify the intended task's behavior, not merely "describe an approach" or "provide a good answer". For retries, specify one effect per idempotency key and a concurrent/repeated-request regression check. For performance, compare the same endpoint, load and response schema against the supplied baseline without inventing targets. Chat-only limits mean proposed checks, never claims of execution. Distinguish verified facts, inferences and unknowns.
4. Show a short English brief: goal, relevant context, constraints, acceptance/checks and requested output. State the observable change in the goal, rather than only naming a file or saying "fix the bug"; retain the detailed conditions in acceptance without expanding scope. The technical brief and its acceptance criteria stay in English, including JSON fields; the user's reply language applies only to surrounding commentary. Identify original intent separately from permitted execution. For implementation, include: choose the cheapest available capable model when supported; use specialists only when their benefit justifies overhead; verify → discover → apply authorized improvements → repeat. Do not echo a long boilerplate template.
5. Execute the preserved request immediately. A chat-only request produces a chat answer; it never authorizes files, installs or paid calls.

## Autonomous discovery

Inspect → act within authorization → verify → run one focused discovery pass. After the initial checklist, search once for critical improvements to the requested outcome. Apply them when remediation is authorized; otherwise report them. Once acceptance is met, synthesize results and present optional suggestions rather than looping indefinitely. Disclose any concrete external blocker. Never repeat an unchanged failing attempt. Respect cancellation and explicit resource limits.

## Cheapest model cascade and specialists

Choose the cheapest available capable model when selection is supported; keep the current agent when a handoff would cost more. Escalate only after verified failure or unresolved reasoning; passing tests does not replace task acceptance. Do not pretend to switch unavailable models.

Delegate only when relevant expertise or smaller independent contexts justify overhead; give specialists relevant files, checkable goals and exclusive ownership. Keep contexts small, reuse evidence, batch reads and integrate combined changes. If agents are unavailable, run focused passes sequentially. Use concise English for the rewritten brief and checks; use the user's language for surrounding explanations. Measure actual tokens and costs before claiming savings; English does not guarantee lower cost or better results.

## Output and evaluation

For a HELEN background job in `needs_input`, read its persisted `result.question` and `result.options` with `helen_job_show` or `helen jobs show <id>`. Display that question using the available native form and retain the actual human answer. Resume only within the authorized attempt budget; extending `maxCalls` requires user authorization. A detached worker cannot display a live native form while the foreground interface is closed. See `docs/BACKGROUND-JOBS.md` in the HELEN package for the execution and persistence contract.

Return the requested artifact or answer plus concise verification and residual risks. Never promise perfection, first-try correctness or fixed savings. Evaluate rewrites against intent preservation, scope preservation, acceptance clarity, action-mode preservation and token use before recommending them as improvements.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected specialist expertise or context savings outweigh transfer, coordination, integration, verification and retries. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.

## Project records

When HELEN is available, inspect `helen work list` and reuse the relevant `helen work brief <id>` before acting or handing off. Preserve its exclusions, acceptance and decisions. Record material questions and the actual human answer in that dossier; use native forms when available without claiming UI verification from metadata. Relevant learning matches remain advisory; for visual or written deliverables read `helen creative show` and respect explicit user/template choices. If these tools are unavailable, use supplied scope and report the continuity limitation.
