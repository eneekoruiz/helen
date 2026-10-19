# Follow-up audit and remediation

Scope: pending workflow, export, skills and catalog changes, plus adjacent report and MCP consumers. Preserve the useful capabilities introduced by Antigravity, improving their implementation where evidence supports it. The native question interface remains a user requirement.

Acceptance before remediation:

- Partial checks execute the requested scope, never count as a full gate, and keep stdout JSON parseable.
- Report commands share safe project-bound writes; linked files must not change data outside the project.
- Shared prompt instructions are consistent across CLI, MCP, setup and standalone skills; runtime-specific capabilities are never promised as available.
- Native reprompt questions reuse context and preserve authorization; no separate editor is introduced.
- Reproduced defects receive outcome regression checks; locally reproducible CI gates pass after integration.

Baseline: 365 tests passed in the previous turn. This fresh review does not assume those tests cover the remaining failure paths. Independent specialists inspect focused checks and prompt/consumer consistency; the primary agent inspects report persistence and integration.

## Findings and remediation

- Report writes could overwrite the contents of an existing hard link. Atomic replacement now preserves the linked source, and both report entry points share that write path. Source and actual CLI regressions verify the outcome.
- Reports confused the recorded goal with the project phase. They now display the recorded phase; a regression checks the two differ.
- Focused checks accepted wrapper scripts and relied on Vitest substring filters, allowing false greens or extra tests. They now require a direct Vitest script, validate canonical paths, reject ambiguous filters and verify the exact discovered file set through project-local Vitest before running. Discovery cannot silently pass an excluded file, and its JSON option is positioned to avoid overwriting a test file.
- Generated flow skills repeated shared instructions after task content. CLI, MCP, briefs and flow skills now support a stable shared prefix; protocol opt-out remains explicit and fresh workers must receive the shared instructions.
- Mandatory delegation conflicted with the user's clarified token-cost preference. All 12 skills now choose between the current agent and optional specialists using expected acceptance and total overhead. Four native interpretation cases exercised small-task, independent-specialist, unavailable-control and escalation decisions; these are not evidence of billed savings or coding effectiveness.
- The skills inventory was easy to confuse with installation state. The [inventory guide](SKILLS-CATALOG.md) documents bundled, project-local, global and plugin sources, catalog filters and additional external candidates without installing them.

## Integrated verification

Next export-boundary pass acceptance: cache-ready formatting must not change a guide into an executable task; full IDs must remain case-insensitive; ambiguous short names and aliases must require an explicit ID instead of selecting an unintended prompt. Unique existing IDs and aliases remain compatible. Regressions precede remediation; inspect all playbook references for budget/export consistency.

Windows, Node 24.19.0: build, typecheck, ESLint, HELEN library validation and the full suite pass: **375 tests, zero failures**. Production dependency audit reports zero known vulnerabilities. `git diff --check` passes.

The generated report was checked in Chromium at widths 375, 768 and 1440: correct phase, no horizontal overflow or browser errors, and reduced-motion support. Native routing observations remain a limited calibration, not a repeated benchmark. Hosted CI and its OS matrix were not run locally.

The 12 personal Codex HELEN skills match the repository copies; prior versions are backed up locally. Useful Antigravity catalog additions remain. Changes are local and reviewable; no commit or push was performed.

## Prompt export boundary review

Three failing regressions reproduced inconsistent guide exports, ambiguous-name selection and mixed-case custom ID failure. Cache-ready mode now strips frontmatter without adding executable instructions to guides or master documents. Resolution checks explicit IDs before relative paths, short names and aliases; multiple matches require a full ID rather than choosing by listing order. Matching explicit IDs is case-insensitive.

Final verification for this pass: **379 tests passed, zero failures**, including the actual CLI regression; build, ESLint, HELEN library validation and `git diff --check` pass. This supersedes the preceding 375-test count.

An actual CLI regression creates two local custom prompts with the same short name, verifies a structured ambiguity failure and retrieves the requested prompt through an explicit mixed-case ID. All playbook prompt references were compared against their budget exports; none were missing. README wording now correctly includes the action prefix in short IDs.

The additional discovery pass inspected resolution precedence, legacy aliases, protocol opt-out, cache-ready readers and playbook references. No additional material defect was found in that scope. This pass changes no UI, dependency, catalog entry or installed skill; prior UI and dependency evidence remains unchanged. No speed benchmark, hosted CI run or GitHub push is claimed.
