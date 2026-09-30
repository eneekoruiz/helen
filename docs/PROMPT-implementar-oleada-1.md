# MISSION: Implement HELEN "Wave 1" to the highest standard, in an autonomous self-correcting loop

You are a senior engineer working alone in the repository `eneekoruiz/helen` (TypeScript CLI + prompt library + agent skills), checked out at `main` (commit `c245a74`, HELEN 2.0.0). Nobody will answer questions while you work. Decide, act, verify, and correct yourself.

## 0. How to read this prompt (the "Level 100" contract)

- The tasks in section 3 are the **minimum**, not the ceiling. Finishing them is necessary and not sufficient.
- After every task, ask: *"What would a demanding maintainer find wrong with this in review? What breaks on Windows, on an empty project, on a monorepo, offline, with a corrupt file, with a hostile input?"* Then fix it. Keep going until you cannot find another real defect.
- If you see a bug, a rough edge, a missing test, a misleading doc line or an inconsistency close to your change, fix it in the same branch (small, separate commits). Do not leave known issues behind. Record anything you deliberately leave out in `docs/FOLLOWUPS.md` with the reason.
- Prefer the best solution over the literal instruction when they differ. If you deviate, write one line in the PR explaining why.
- Never inflate results. Report failures, skipped work and uncertainty exactly as they are.

## 1. Hard constraints (never break these)

1. Never print, log, commit or store secrets. Redact secret-shaped strings in any stored output. The repo pre-commit hook blocks them; do not bypass it (`--no-verify` is forbidden).
2. Never install or run third-party code that the task does not require. HELEN's core rule: it prints pinned commands, it never installs third-party tools itself.
3. No telemetry, no network calls in the CLI except where a command explicitly needs one and says so.
4. Work on a new branch `claude/wave-1` (or your agent's branch naming). Open a **draft** PR. Do **not** merge. Do not push to `main`.
5. Do not delete or rewrite history. No force-push.
6. Do not weaken tests, lint, types or the `helen lint` rules to get green. Never skip or disable a test.
7. Keep everything cross-platform (Windows, macOS, Linux). The maintainer works on Windows (`C:/Users/User/Desktop/ENEKO/helen`).
8. All prompts, code comments and repo docs stay in English, except `docs/GUIA.md` (Spanish user guide).
9. Match the surrounding code's style, naming and comment density. Small, focused commits with clear messages.

## 2. Repository facts you must know (verify each, do not trust blindly)

- `src/index.ts` is the command layer (commander). `src/core/*` holds logic (prompts, promptLint, apply, progress, skills, catalog, setup, agentDoctor, doctor). `src/modules/*` are scaffolding modules registered in `src/modules/registry.ts` (14 modules incl. `guardrails`).
- Checks that must pass: `npm run typecheck`, `npm run lint`, `npm test` (vitest, 124 tests), `npm run build`, `node dist/cli.js lint`, `npm audit --audit-level=high`. Hooks in `.githooks/` run them on push (`git config core.hooksPath .githooks`; the `prepare` script sets it).
- `scripts/run-skill-evals.mjs` runs skill evals (`npm run evals`): baseline vs with-skill, trigger detection, LLM judge, report in `docs/SKILLS_QUALITY.md`, results in `evals/results/`. Eval cases: `evals/<skill>.json` (`{skill, cases:[{id,prompt,criteria[]}]}`), 3 per skill today.
- Known bug to fix first: the runner computes the repo root with `new URL(import.meta.url).pathname`, which is wrong on Windows (`/C:/...`). It also spawns `claude` directly, which may need `claude.cmd`/a shell on Windows.
- Current skill results: `helen-release` never auto-triggers (0/3); several skills are 1/3. `helen-release` and `helen-a11y-perf` show -7 delta on a high baseline (noise with 3 cases and one judge).

## 3. Tasks (do in this order; each ends with its own verification)

### Task A: Make the eval runner correct, portable and statistically honest
1. Fix Windows: use `fileURLToPath`/`path.resolve`, spawn with `shell: process.platform === 'win32'` or resolve `claude.cmd` safely; use `os.tmpdir()`; no `/tmp` literals; no `sh`-only commands.
2. Add `--runs N` (default 3): run each case N times for each variant (baseline, with-skill), keep every run, and store per-run scores.
3. Report mean, standard deviation and a 95% confidence interval (say clearly which method; with small N use a t-interval or a bootstrap, and state N). Show the **delta with its interval**. A delta whose interval contains 0 must be labelled "not distinguishable from noise" in `docs/SKILLS_QUALITY.md`; do not grade it A/B/C as if it were real.
4. Add `--cases <id,...>`, `--skill <name>`, `--dry-run` (print planned runs and an estimated call count, no calls), `--max-calls <n>` (hard budget; stop and report), and resumability (skip runs already stored unless `--force`).
5. Add "must NOT trigger" cases support (`"expectTrigger": false`) and report false-positive rate.
6. Keep a separate judge run per answer; store judge output; retry harness errors once; count harness errors apart (already partly done: keep that behaviour).
7. Extend the eval JSON schema, document it in `evals/README.md`, and validate eval files in `helen lint` (unknown keys, empty criteria, duplicate ids, prompts that ask to modify files).
8. Unit-test the pure parts (stats, schema validation, stream-json trigger parsing) with vitest by extracting them into `src/core/evals.ts` or `scripts/lib/`. The runner itself may stay a script.

### Task B: Global `--json` output
1. Add a global `--json` flag. Every command must produce either human text or a single JSON document on stdout (nothing else on stdout; logs go to stderr). Define a stable envelope: `{ "ok": boolean, "command": string, "data": object, "warnings": string[], "errors": string[] }` and document it.
2. Cover at least: `apply`, `next`, `done`, `skip`, `status`, `check`, `doctor`, `lint`, `setup`, `prompts list|search|show|path|flow|index|lint`, `skills list|installed|catalog|external|update|install`.
3. Exit codes: 0 ok, 1 error, 2 warnings only, 3 checkpoint failed. Document them and test them.
4. Snapshot tests for the JSON shape of `apply`, `next`, `status`, `doctor`.
5. No interactive prompts in `--json` mode: if input is required, fail with a clear error.

### Task C: `helen init-project`
1. `helen init-project [name] [--agents claude codex antigravity] [--goal <goal>] [--yes] [--dry-run] [--json]`.
2. It chains: create/adopt the project folder, `setup`, `add guardrails`, and starts `apply <goal> --track` (default goal: `strategy` for an empty project, otherwise the goal suggested by phase detection).
3. It must be idempotent, never overwrite existing files without backup, support `--dry-run`, and print exactly what it did and what to do next.
4. Test in a temp dir: empty project, existing project, second run (idempotency), dry-run (no writes).

### Task D: Release and publishing pipelines (files only, no secrets)
1. `.github/workflows/publish.yml`: on version tag `v*`, run all checks, then `npm publish --provenance --access public` using **npm trusted publishing (OIDC)** if supported, otherwise a documented `NPM_TOKEN` secret. Never hardcode or print tokens. Verify the package contents with `npm pack --dry-run` first (no `.env`, no `evals/results`, no tests).
2. `release-please` config (`release-please-config.json`, manifest, workflow) with Conventional Commits. Add a `commit-msg` hook check only if it does not annoy contributors; make it optional and documented.
3. `package.json`: correct `files`, `engines`, `repository`, `bugs`, `homepage`, `keywords`, `bin`. Make sure `npx helen-cli --help` would work from the packed tarball (test with `npm pack` + install the tarball in a temp dir).
4. Add `SECURITY.md` (disclosure policy, supported versions).
5. Write `docs/RELEASING.md` listing the **manual steps only the owner can do** (npm account, enabling trusted publishing, GitHub settings). Do not attempt them.

### Task E: Make skills trigger on their own
1. For each skill with trigger rate below 3/3 (start with `helen-release`), write 3 to 5 candidate descriptions (80 to 1024 chars, concrete user phrases, no keyword stuffing), run the eval with `--runs 3`, and keep the best. Stop when a candidate reaches the target or after 3 rounds; record the evidence in `docs/SKILLS_QUALITY.md` (before/after trigger rate).
2. Add at least 3 new cases per skill (target 10) including 2 "must NOT trigger" cases per skill. New criteria must **not** restate the skill's own text; they must check user-visible outcomes (correctness, safety, completeness).
3. Keep `helen lint` green (description limits, frontmatter, name = folder).

## 4. The autonomous improvement loop (mandatory)

Run this loop for every task and again for the whole change at the end:

```
repeat:
  1. PLAN     write the smallest plan that solves the task; list risks.
  2. BUILD    implement.
  3. VERIFY   run: typecheck, lint, tests, build, `node dist/cli.js lint`, npm audit.
              Also exercise the feature for real (temp project, real commands, real output).
  4. ATTACK   try to break it: Windows paths, spaces in paths, empty/corrupt files,
              missing `claude`/`git`, no network, huge input, secrets in input,
              running twice, running from a subdirectory, non-TTY.
  5. REVIEW   read your own diff as a hostile reviewer. Run /code-review-style checks
              (correctness, reuse, simplification, efficiency, security).
  6. FIX      fix every real finding. Add a regression test for each bug.
  7. SCORE    rate the result 0-100 against the rubric below. If < 95, go to 1.
until: score >= 95 for two consecutive iterations, or 8 iterations, or budget exhausted.
```

Rubric (each 0-20): correctness and tests; robustness (edge cases, Windows, errors); UX and docs (clear messages, `--help`, docs updated); security and privacy; simplicity and consistency with the codebase.

If you reach the iteration limit below 95, stop and write exactly what remains and why in the PR.

## 5. Documentation you must update

`README.md` (commands table), `docs/GUIA.md` (Spanish; new commands, `--json`, init-project, evals with runs/interval), `CHANGELOG.md` (new `2.1.0` entry), `evals/README.md`, `docs/RELEASING.md`, `docs/IDEAS-100.md` (mark implemented ideas **[hecho]**). Regenerate indexes with `node dist/cli.js prompts index` if prompts changed. Bump version to 2.1.0 only if all checks pass.

## 6. Definition of done (all must be true)

- [ ] All checks in section 2 pass locally and in CI on the draft PR.
- [ ] `npm run evals -- --dry-run` prints a plan; a real run with `--runs 3` on at least 3 skills produced intervals in `docs/SKILLS_QUALITY.md` (state the exact model and date).
- [ ] `helen apply design --json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` succeeds and stdout contains only JSON.
- [ ] `helen init-project` works in an empty temp dir and is idempotent.
- [ ] `npm pack` tarball installs and `helen --help` runs from it.
- [ ] No secret-shaped string anywhere in the diff; pre-commit hook was never bypassed.
- [ ] Windows-specific code paths reviewed line by line (state what you verified and what you could only reason about, since you may not have Windows).
- [ ] `docs/FOLLOWUPS.md` lists everything you found but did not do.

## 7. Final report (in the PR description, factual)

1. What changed, by task. 2. Evidence: commands run and their real results (paste key output, redacted). 3. Bugs you found beyond the brief and how you fixed them. 4. Decisions where you deviated from this prompt and why. 5. What you could not verify. 6. Manual steps for the owner. Do not claim anything you did not run.

Begin now. Do not ask for confirmation. Loop until the definition of done is met.
