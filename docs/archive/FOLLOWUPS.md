# HELEN Follow-ups & Deferred Work

This document records architectural findings, improvement ideas, and tasks identified during **Wave 1** implementation that were deliberately deferred, along with the technical or operational rationale.

---

### 1. GitHub Template Repository (Idea 3)
- **Status**: Deferred to Owner / Wave 2
- **Rationale**: Setting up a repository as a GitHub Template (`eneekoruiz/helen-template` or marking this repository as a template) requires organization-level administration permissions on GitHub.
- **Next steps**: Maintainer creates or configures the template repository following the instructions in [`docs/RELEASING.md`](RELEASING.md).

---

### 2. Full HELEN MCP Server (`helen mcp`) (Idea 96)
- **Status**: Scheduled for Wave 3
- **Rationale**: Building a Model Context Protocol (MCP) server that exposes HELEN commands (`apply`, `next`, `done`, `status`) to external agent clients requires standard JSON-RPC over stdio/SSE.
- **Wave 1 Progress**: Task B delivered the prerequisite: a strict, machine-readable global `--json` envelope across all CLI commands with standard exit codes (`0`, `1`, `2`, `3`) and clean stderr logging. The future MCP server can wrap these core modules directly without text scraping.

---

### 3. Automated Interactive Fixing (`helen doctor --fix`) (Idea 13)
- **Status**: Scheduled for Wave 2
- **Rationale**: Automatically correcting doctor findings (e.g. recreating missing AGENTS.md blocks, reinstalling outdated skills) requires interactive diff previews and user confirmation prompts (`@clack/prompts`), which should be isolated from headless agent execution.

---

### 4. Full 90-Case Multi-Run Eval Suite Execution
- **Status**: Deferred to CI / Scheduled Batch Runs
- **Rationale**: Wave 1 expanded the evaluation suite from 45 cases (3 per skill) to 90 cases (6 per skill, including 2 explicit negative `"expectTrigger": false` cases per skill). Running all 90 cases with `--runs 3` requires ~1,080 LLM calls (~4 calls per run between baseline, with-skill, and judge). Running this synchronously in a single developer session would take 2+ hours and exhaust local CLI rate limits.
- **Wave 1 Verification**: The eval runner was completely overhauled with `--runs N`, Student's t 95% confidence intervals, delta intervals, noise labeling (`isNoise`), and resumability. Tested with real sampling on targeted skills (`helen-release`), while `--dry-run` verifies the complete 90-case plan.

---

### 5. Native CodeQL and Secret Scanning Workflows (Idea 82)
- **Status**: Optional Owner Configuration
- **Rationale**: Secret scanning and CodeQL default setup are native GitHub repository security settings enabled in repo settings for public repositories. A custom `.github/workflows/codeql.yml` can be added in Wave 2. Local secret scanning is already strictly enforced by the `.githooks/pre-commit` hook.

---

### 6. Shell Autocompletion Scripts (Idea 21)
- **Status**: Wave 2 Convenience Feature
- **Rationale**: Generating dynamic shell completion scripts (`helen completion bash|zsh|fish`) for prompt IDs and goal names is a quality-of-life CLI feature that does not block core agent workflow functionality.
