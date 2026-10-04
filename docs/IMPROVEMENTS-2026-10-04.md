# Reliability and developer-experience improvements — 4 October 2026

This implements the six improvements proposed after the repository audit, with
additional fixes found during implementation. Existing uncommitted audit changes
are preserved.

## Delivered behavior

1. **Interrupted-operation recovery.** Module installation/update, generation,
   ejection and rollback persist a local write-ahead record before file mutations.
   Atomic replacement keeps files complete. `helen recover` lists unfinished
   operations; `helen recover <id> --dry-run` validates restoration and the same
   command without the flag restores original bytes. Recovery checks all file
   hashes first and refuses to discard later edits. Concurrent mutations are
   blocked, and terminal locks left by an interrupted cleanup are reconciled.
   Recovery includes generated backups, configuration recovery and temporary files.
2. **File previews.** `--preview` on add, init, update and generate shows diffs and
   composed dependency changes without writing or installing. `--force` controls
   replacements; update already forces them. JSON exposes `data.changes`.
   Environment, credential and `.helenrc` contents are redacted; large diffs are
   bounded. Preview uses a virtual file state so successive package patches match
   the changes applied later.
3. **Lifecycle verification.** Real CLI fixtures exercise repeated installation,
   preserved versions and ownership, force updates, user-file restoration,
   shared-file ejection, fresh install/rollback and preview/application parity.
   Recovery tests include an actual subprocess exiting mid-operation, selective
   failures, conflicting later edits, temporary-file cleanup and terminal-lock
   crash windows.
4. **Multiplatform CI.** Quality gates now run with Node 20/22/24 on Ubuntu and
   Node 22 on Windows/macOS. The prepare script uses Node subprocess execution
   instead of a shell-specific `|| true` fallback. An aggregate `Quality Gates`
   check preserves the previous required-check name and requires every matrix
   entry to pass, including failure/cancellation reporting.
5. **Runtime contracts.** Configuration and module results have Zod contracts;
   settings use `Record<string, unknown>` with JSON-value validation. Legacy
   defaults are retained, prototype keys and invalid root settings are rejected,
   and configuration updates validate before writing. Module result IDs and
   project paths are checked at execution boundaries.
6. **Actionable diagnostics.** Failed results include stage, diagnostic code and
   recovery command. Incomplete operations carry an ID and are visible in doctor.
   A failure preserves its partial file history rather than claiming installation.

Additional fixes preserve private file modes in backups, include corrupt-config
recovery in the journal, stop rollback scans on unreadable files, reconcile locks
after terminal-state crashes, and handle very large previews without argument-limit
failures. Regression tests assert these behaviors.

## Scope and limits

The journal covers tracked HELEN file operations above. `init-project`, setup and
skill installation, external scaffolders, package-manager installation and service
actions are outside its scope. Empty scaffold directories and the ignored local
operation directory can remain after recovery. Snapshots can contain original
private file contents; they are stored locally, ignored by Git, given restrictive
file permissions and removed after successful commit/recovery. Listings never
include snapshot contents.

The implementation verifies process interruption and retry, not physical host
power loss. Hosted Linux/macOS CI execution is not possible from this Windows
session. Existing Docker, paid-provider and external-service verification limits
remain in [the audit report](AUDIT-2026-10-04.md).

## Verification

- Windows / Node 22.23.3: `npm ci`, typecheck, ESLint, **312 tests across 39 files**,
  build, HELEN library lint and `npm audit --audit-level=high` all passed. Dependency
  audit found zero vulnerabilities.
- Windows / Node 20.20.2: all 16 critical operation, CLI preview/recovery and
  lifecycle tests passed.
- Chromium: existing generated UI passed at 375, 768 and 1440 pixels, including
  theme persistence/system changes, CMS editing, consent and report layout, with
  no page/console/resource errors or horizontal overflow.
- npm package preview: recovery/preview modules and all 12 eval specs included;
  no `.env`, evaluation results or private operation snapshots included.
- `git diff --check`: passed. Changes remain uncommitted.
