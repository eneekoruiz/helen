---
name: helen-reprompt
description: Clarify vague requests into concise English instructions while preserving intent, exclusions and authorization; use measurable acceptance, specialist agents and autonomous improvement discovery.
version: 2.1.0
---

# HELEN Reprompt

Rewrite the request without changing what the user asked. Preserve questions as questions, evaluation as evaluation, audit-only work as read-only, and implementation as implementation. "Any more ideas?" requests analysis unless implementation is already authorized.

## Procedure

1. Extract the goal, provided context, exclusions, original action and existing authorization. Retain unresolved uncertainty; never manufacture requirements or answer preferences.
2. Inspect available context. Ask only for essential information that cannot be inferred; continue independent work while waiting.
3. Define observable acceptance criteria and how to verify them before adjusting instructions or files. Specify the intended task's behavior, not merely "describe an approach" or "provide a good answer". For retries, specify one effect per idempotency key and a concurrent/repeated-request regression check. For performance, compare the same endpoint, load and response schema against the supplied baseline without inventing targets. Chat-only limits mean proposed checks, never claims of execution. Distinguish verified facts, inferences and unknowns.
4. Show a short English brief: goal, relevant context, constraints, acceptance/checks and requested output. The technical brief and its acceptance criteria stay in English, including JSON fields; the user's reply language applies only to surrounding commentary. Identify original intent separately from permitted execution. For implementation, include: start cheapest available model; delegate relevant specialists; verify → discover → apply authorized improvements → repeat. Do not echo a long boilerplate template.
5. Execute the preserved request immediately. A chat-only request produces a chat answer; it never authorizes files, installs or paid calls.

## Autonomous discovery

Inspect → act within authorization → verify → re-audit → discover further evidence-backed improvements → repeat. After the initial checklist, explicitly search for additional improvements to the requested outcome without waiting for another user prompt. Apply them when remediation is authorized; otherwise report them. No arbitrary retry cap. Finish when acceptance is met and a new discovery pass finds no further actionable improvement within scope, or disclose the concrete external blocker. Never repeat an unchanged failing attempt. Respect cancellation and explicit resource limits.

## Cheapest model cascade and specialists

Use the cheapest available model first when selection is supported. Escalate only after verified failure or unresolved reasoning; passing tests does not replace task acceptance. Do not pretend to switch unavailable models.

Delegate independent domains to specialized agents with relevant files, checkable goals and exclusive ownership. Keep contexts small, reuse evidence, batch reads and integrate combined changes. If agents are unavailable, run focused passes sequentially. Use concise English for the rewritten brief and checks; use the user's language for surrounding explanations. Measure actual tokens and costs before claiming savings; English does not guarantee lower cost or better results.

## Output and evaluation

Return the requested artifact or answer plus concise verification and residual risks. Never promise perfection, first-try correctness or fixed savings. Evaluate rewrites against intent preservation, scope preservation, acceptance clarity, action-mode preservation and token use before recommending them as improvements.
