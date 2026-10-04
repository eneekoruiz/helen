---
name: helen-reprompt
description: Clarify requests through native questions and concise English briefs while preserving intent, exclusions and authorization; use measurable acceptance, cost-aware routing and autonomous discovery.
version: 2.1.0
---

# HELEN Reprompt

Rewrite the request without changing what the user asked. Preserve questions as questions, evaluation as evaluation, audit-only work as read-only, and implementation as implementation. "Any more ideas?" requests analysis unless implementation is already authorized.

## Procedure

1. Extract the goal, provided context, exclusions, original action and existing authorization. Retain unresolved uncertainty; never manufacture requirements or answer preferences.
2. Inspect available conversation and repository context. If missing details materially affect the outcome, use the runtime's native structured question form (for example an exposed `request_user_input_async` or `AskUserQuestion` tool), with concise task-specific questions, useful choices and free-text answers. Reuse supplied answers; never impose a fixed questionnaire or create a separate HTML editor, website or artifact. If no native tool is available, ask conversationally. If context suffices, proceed without questions. Continue independent authorized work while waiting; silence is not an answer or authorization.
3. Define observable acceptance criteria and how to verify them before adjusting instructions or files. Specify the intended task's behavior, not merely "describe an approach" or "provide a good answer". For retries, specify one effect per idempotency key and a concurrent/repeated-request regression check. For performance, compare the same endpoint, load and response schema against the supplied baseline without inventing targets. Chat-only limits mean proposed checks, never claims of execution. Distinguish verified facts, inferences and unknowns.
4. Show a short English brief: goal, relevant context, constraints, acceptance/checks and requested output. The technical brief and its acceptance criteria stay in English, including JSON fields; the user's reply language applies only to surrounding commentary. Identify original intent separately from permitted execution. For implementation, include: choose the cheapest available capable model when supported; use specialists only when their benefit justifies overhead; verify → discover → apply authorized improvements → repeat. Do not echo a long boilerplate template.
5. Execute the preserved request immediately. A chat-only request produces a chat answer; it never authorizes files, installs or paid calls.

## Autonomous discovery

Inspect → act within authorization → verify → re-audit → discover further evidence-backed improvements → repeat. After the initial checklist, explicitly search for additional improvements to the requested outcome without waiting for another user prompt. Apply them when remediation is authorized; otherwise report them. No arbitrary retry cap. Finish when acceptance is met and a new discovery pass finds no further actionable improvement within scope, or disclose the concrete external blocker. Never repeat an unchanged failing attempt. Respect cancellation and explicit resource limits.

## Cheapest model cascade and specialists

Choose the cheapest available capable model when selection is supported; keep the current agent when a handoff would cost more. Escalate only after verified failure or unresolved reasoning; passing tests does not replace task acceptance. Do not pretend to switch unavailable models.

Delegate only when relevant expertise or smaller independent contexts justify overhead; give specialists relevant files, checkable goals and exclusive ownership. Keep contexts small, reuse evidence, batch reads and integrate combined changes. If agents are unavailable, run focused passes sequentially. Use concise English for the rewritten brief and checks; use the user's language for surrounding explanations. Measure actual tokens and costs before claiming savings; English does not guarantee lower cost or better results.

## Output and evaluation

Return the requested artifact or answer plus concise verification and residual risks. Never promise perfection, first-try correctness or fixed savings. Evaluate rewrites against intent preservation, scope preservation, acceptance clarity, action-mode preservation and token use before recommending them as improvements.

## Runtime-aware efficiency

Use one agent for small cohesive tasks. Choose the cheapest available capable model when routing is supported; keep the current agent when finishing is cheaper than transferring context. Delegate only when expected expertise or context savings outweigh transfer, coordination, integration, verification and retries. Flash is optional when available and suitable. Keep shared instructions as a stable prefix and task facts after it; provider caching requires runtime support and measured cache hits. Prefer an available direct browser MCP. Use focused regressions during fixes and the full repository gate before completion. Never invent savings.

Minimize time to a verified result: retrieve only missing evidence, batch independent reads and checks, preserve dependencies, avoid repeated planning and polling, and answer concisely. Never trade acceptance or required checks for speed, guess missing facts, or lower reasoning effort automatically.
