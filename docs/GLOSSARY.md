# HELEN Glossary of Concepts

- **Prompt**: A targeted, atomic markdown instruction with standard frontmatter (`action`, `phase`, `summary`) and clear limits.
- **Flow**: A multi-step sequence of prompts chained together to achieve a complex milestone (e.g. `apply-security-hardening-flow`).
- **Checkpoint**: A mandatory verification gate that pauses execution until quality or security checks pass (e.g. `audit-quality-gates-checkpoint`).
- **Skill**: A modular package containing `SKILL.md` and optional reference materials, loaded by AI agents to handle specialized engineering domains.
- **Playbook**: An ordered set of steps (prompts, flows, checkpoints, and skills) mapped to high-level goals (`design`, `security`, `qa`, `launch`).
- **MCP Server**: Model Context Protocol stdio server providing direct RPC tool calls (`helen_status`, `helen_next`, `helen_apply`, etc.) to AI agents without text scraping.
