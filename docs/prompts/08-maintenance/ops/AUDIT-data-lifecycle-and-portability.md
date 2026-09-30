---
action: AUDIT
phase: 08-maintenance
summary: Check that important data can be backed up, restored, deleted, exported and migrated, and that no vendor or migration is a one-way door.
modifies_code: false
aliases:
  - audit-data-lifecycle-backup-and-recovery
  - audit-migrations-import-export-lock-in
---

# Data Lifecycle and Portability Audit

## Goal

Make sure important data can be protected, recovered, deleted, explained and moved, and that the project can evolve without trapping users or maintainers.

## Use when

- Before production, before major migrations, and during yearly maintenance.

## Requirements

1. **Inventory:** user data, config, persisted and generated data, logs, analytics, secrets, uploads, caches, derived data; formats of data, config, API, schema, files and integrations that may need migration.
2. **Recovery:** backup, restore, deletion, retention, export and disaster recovery; has recovery been rehearsed or only assumed? Single points of failure and unrecoverable states.
3. **Migrations:** versioning, backward compatibility, rollback, migration tests, dry runs.
4. **Portability:** import and export paths; vendor dependencies and exit costs; one-way doors.
5. **Privacy:** ownership, retention, deletion semantics, sensitive data in logs.

## Beyond the checklist

Trust builders: user-owned exports, migration dry runs, compatibility checks, deprecation policy, a clear data portability story.

## Limits

- Audit only. Never run restores or migrations against production.

## Output

1. Data inventory.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Backup and restore rehearsal plan, lock-in risks with exit strategies, and next safeguards.
