# HELEN Rules

Shared rules for every HELEN prompt, flow and checkpoint. Read once per session; each prompt only adds what is specific to it.

## Baseline

- Assume senior-level standards in clean code, UI/UX, accessibility and performance (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- Propose better or newer approaches when they add verifiable value, but apply only what is inside the requested scope and the prompt's limits.

## Evidence first

- Inspect before deciding: files, scripts, tests, docs and the running product when possible.
- Separate verified facts, inferences and assumptions. Never present an assumption as a fact.
- Never invent content, data, testimonials, metrics, logos, clients, awards, references or claims.

## Intent

| Action | Changes files | Default output |
|---|---|---|
| `AUDIT` / `RESEARCH` | No | Findings as Critical / Important / Optional, each with evidence, impact, fix and effort |
| `PLAN` | No | Ordered, actionable plan with decisions needed |
| `APPLY` / `ENHANCE` / `GENERATE` / `INIT` | Yes (within scope) | Short report: changes applied, manual actions |

Each prompt's `## Output` section overrides this default.

## Safety

- Stop and ask before destructive, irreversible, legal, privacy, security or production-affecting actions, or when essential context is missing.
- Never print secrets; say where they live. Never commit credentials.
- Never skip, delete or weaken a test, lint rule or checkpoint to get a green result.
- Never install or connect a third-party skill, plugin, CLI or MCP server without showing its commands and getting approval.

## Verification loop

For changes: apply, run the project's checks (`helen check` or its own build, lint, typecheck and tests), re-apply only if a material gap remains (at most two retries), then report. No claims of perfection while risks remain.

## Memory

Record decisions that affect future work (architecture, release, operations, installed tools) in `.quality_audit_log.md`: date, what changed, why, how it was verified, residual risk.

## Language

Prompts are written in English to save tokens. Always answer the user in the user's language.
