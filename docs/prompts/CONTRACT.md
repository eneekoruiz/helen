# Prompt Contract

How HELEN prompts are written. `helen prompts lint` enforces the mechanical parts; this file explains the rest.

## One prompt, one intent

- Before adding a prompt, search: `helen prompts search <words>`. If a prompt already covers the intent, improve it instead.
- When two prompts overlap, merge them and keep the old ids as `aliases` so existing references keep working.
- Shared rules live in [RULES.md](RULES.md). Never repeat them inside prompts.

## Actions (file prefix)

| Prefix | Use for |
|---|---|
| `INIT-` | Define the base of a new project (business, design direction, scaffold) |
| `RESEARCH-` | Build external knowledge (benchmarks, market) |
| `AUDIT-` | Inspect without changing files |
| `PLAN-` | Decide and sequence work without changing files |
| `GENERATE-` | Create something new in an existing project |
| `ENHANCE-` | Improve something that exists without breaking it |
| `APPLY-` | Apply a pass or a flow of changes |

Suffixes: `-flow.md` for sequences of prompts, `-checkpoint.md` for blocking gates.

## File layout

`docs/prompts/<phase>/<area>/<ACTION>-<kebab-name>.md`, where phase is `01-start-project` to `09-future-knowledge`.

## Frontmatter

```yaml
---
action: AUDIT            # must equal the file prefix
phase: 04-before-production   # must equal the folder
summary: One line, at most 160 characters, shown in lists and indexes.
modifies_code: false
repeatable: true         # flows only
stage: hardening         # flows only
aliases:                 # optional: old ids that resolve to this prompt
  - audit-old-name
---
```

## Body

```markdown
# Title

## Goal          (required) what outcome and why
## Use when      (required) the situations that call for it
## Skip when     (optional)
## Requirements  (required, or ## Steps for flows) numbered, concrete, checkable
## Beyond the checklist (optional) where senior judgment should look
## Stop when     (flows, optional)
## Limits        (required) what must never happen
## Checks        (optional)
## Output        (required) exact shape of the answer
```

## Style

- English, imperative, concise. No personas longer than one line, no emojis, no marketing tone.
- Concrete numbers and commands over adjectives (e.g. "contrast 4.5:1", "`npm test`").
- Reference other prompts by id (`audit-final-seo`) or relative link; flows must link their steps.
- Third-party tools are referenced through the catalog (`helen skills external <id>`), never with install commands inline.

## After changing prompts

1. `helen prompts index` to regenerate phase indexes.
2. `helen prompts lint` and `npm test`.
3. Update `playbooks.json` and bundled skills that cite changed ids.
