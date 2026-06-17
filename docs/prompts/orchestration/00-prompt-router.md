# Prompt Router

Purpose: choose the right prompt sequence for the current repository state.

Use this when you do not want to copy prompts manually or guess the next audit.

## Prompt

Act as an AI Workflow Architect and Principal Engineer.

Inspect the repository and decide which prompt sequence should run next.

## Requisitos mínimos obligatorios

1. Classify the project state
- Idea, prototype, active build, stabilization, public launch, client delivery, maintenance, archive, or recovery.

2. Identify project type
- App, website, CLI, library, SaaS, open-source repo, portfolio project, internal tool, agent workflow, content system, or hybrid.

3. Detect high-risk surfaces
- User-facing UX, payments, auth, data, files, integrations, migrations, public reputation, ops, security, growth, docs, onboarding, or developer experience.

4. Choose prompt families
- Select only the families that fit the repo and explain why.
- Include discovery and final prompts only when appropriate.

5. Produce execution order
- Order prompts by dependency and risk.
- Put truth and correctness before polish.

## Más allá de estos criterios

Use the whole repository and your own judgment.

If the current library lacks the right prompt, propose a new prompt with title, purpose, folder, and minimum criteria. If a new phase is needed, propose it.

Do not over-audit trivial projects. Do not under-audit public, commercial, or risky projects.

## Output format

1. Project state.
2. Risk profile.
3. Recommended prompt sequence.
4. Prompts to skip and why.
5. Missing prompts or phases.
6. First concrete next action.
