# Migrations, Import, Export, and Lock-in Audit

Purpose: ensure the project can evolve without trapping users or maintainers.

## Prompt

Act as a Staff Engineer, platform architect, and founder planning for long-term trust.

Audit migration, import, export, and vendor lock-in strategy.

## Requisitos mínimos obligatorios

1. Identify data, config, API, schema, file, and integration formats that may need migration.
2. Check import and export paths.
3. Review versioning, backward compatibility, rollback, and migration tests.
4. Identify vendor dependencies and exit costs.
5. Flag one-way doors.

## Más allá de estos criterios

Look for trust-building features: user-owned exports, migration dry runs, compatibility checks, changelog warnings, deprecation policy, and clear data portability story.

## Output format

1. Migration surfaces.
2. Import/export gaps.
3. Vendor lock-in risks.
4. Compatibility strategy.
5. Recommended next safeguards.
