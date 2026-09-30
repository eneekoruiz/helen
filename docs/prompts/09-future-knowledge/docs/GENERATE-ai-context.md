---
action: GENERATE
phase: 09-future-knowledge
summary: Write a compact AGENTS.md / CLAUDE.md so any AI assistant knows the stack, structure, commands, HELEN workflow and hard limits.
modifies_code: true
---

# AI Context File

## Goal

Give every AI assistant working on the project the context it needs in as few tokens as possible: stack, structure, commands, workflow and limits.

## Use when

- Setting up a project for AI-assisted work, or when assistants keep making the same wrong assumptions.

## Requirements

1. **Format:** `AGENTS.md` as the shared file (read by Codex, Antigravity and many others); `CLAUDE.md` can import or repeat it for Claude Code. `helen setup` already adds a managed HELEN block; write the project-specific part outside that block.
2. **Stack and style rules:** technologies (e.g. React, Vite, TypeScript), mandatory conventions (ESM imports, strict types, naming).
3. **Structure:** a short map of key folders and where the main logic lives.
4. **Commands:** install, dev, build, test, lint, and how to run one test.
5. **Workflow:** how to use HELEN (`helen apply`, `helen check`), branching and commit conventions.
6. **Limits:** what the assistant must never do on its own (major dependency upgrades, skipping test checkpoints, touching production data, committing secrets).
7. Recurring design patterns the project uses.

## Limits

- No secrets, credentials or confidential information: the file is in git.
- Keep it short: it is loaded every session. Prefer links to docs over copying them.

## Output

The raw Markdown of the file, ready to save at the project root.
