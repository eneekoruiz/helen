# Native reprompt questions

When the invoking runtime exposes a structured question tool, `helen-reprompt` uses the agent's **native question UI**. If no such tool is exposed in the current mode, it asks conversationally. It prepares concise English instructions and asks only for missing details that materially affect the result; it does not create a separate website, HTML artifact or CLI editor.

## Behavior

1. Read the user's request and existing conversation/repository context. Preserve intent, exclusions, decisions and authorization.
2. Identify unresolved details that affect acceptance or execution. Never re-ask supplied information or invent an answer.
3. When clarification is useful, invoke the available native question tool: for example Codex `request_user_input_async`, or another runtime's exposed structured question tool. Use concise questions and a few concrete choices where useful, retaining free-text input.
4. Continue independent authorized work while waiting. An optional preference may use an explicitly stated reasonable assumption; required information or authorization cannot be inferred from silence.
5. Incorporate the actual answers into the English brief, show the brief concisely and execute the preserved request within its authorized mode.

If no native tool is exposed, ask a concise conversational question. Do not manufacture an interactive artifact or pretend a tool is available. If enough context already exists, proceed without making the user complete a form. This workflow depends on the invoking agent; HELEN does not provide a second question interface.

## Acceptance

- Already supplied details are reused; questions concern only unresolved decisions.
- Evaluation requests stay evaluation; implementation stays within existing authorization.
- Native answers become explicit context or constraints in the rewritten brief.
- No HTML editor, extra website, external installation or provider request is introduced just to ask questions.
- The brief specifies observable outcomes and checks, cheapest-first specialist execution when useful, and autonomous discovery within scope.
