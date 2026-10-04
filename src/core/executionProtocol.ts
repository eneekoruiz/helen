/** Shared, compact instructions used by prompt exports and agent setup. */
export const EXECUTION_CONTRACT = `**HELEN execution contract**
- **Acceptance**: preserve intent; define observable task behavior and checks before edits, not just "describe an approach". AUDIT/RESEARCH stay read-only unless remediation is authorized.
- **Model cascade**: start with the cheapest available model; verify correctness and acceptance; escalate on evidenced failure. Record measured usage when available; never invent savings.
- **Parallelism**: delegate independent domains to focused specialists with file ownership, minimal context, acceptance, and compact evidence. Integrate and verify their work.
- **Verification**: run repository CI commands; UI changes require Playwright/Chromium at 375, 768, 1440 px. Report unavailable checks honestly.
- **Improvement discovery**: after checks, ask what further useful improvements remain; inspect evidence, apply authorized fixes, verify, and repeat without an arbitrary retry cap. Finish when acceptance passes and a fresh scan finds no actionable improvements; report external blockers and residual risks. Never claim perfection.
- **Token economy**: concise English instructions, relevant context only, no repeated rules or unchanged checks; answer in the user's language.`;
