# Data Lifecycle, Backup, and Recovery Audit

Purpose: ensure important data can be protected, recovered, deleted, and explained.

## Prompt

Act as an SRE, Security Engineer, privacy-minded founder, and operations owner.

Audit data lifecycle and recovery.

## Requisitos mínimos obligatorios

1. Identify all important data: user data, config, generated files, logs, analytics, secrets, uploads, caches, and derived data.
2. Check backup, restore, deletion, retention, export, and disaster recovery assumptions.
3. Review data ownership and privacy expectations.
4. Identify single points of failure and unrecoverable states.
5. Check whether recovery has been rehearsed or only assumed.

## Más allá de estos criterios

Look for data risks people discover too late: no export path, no rollback after migration, logs with sensitive data, unclear deletion semantics, backups that cannot restore, and vendor features that trap the product.

## Output format

1. Data inventory.
2. Recovery gaps.
3. Privacy and retention risks.
4. Backup/restore rehearsal plan.
5. Must-fix operational risks.
